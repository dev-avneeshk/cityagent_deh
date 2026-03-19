// ============================================================
// Reddit public JSON API — Social Signals + Citizen Alerts
// No key · No auth · No CORS issues · Completely free
//
// Architecture:
//   Single shared post cache per city — fetched ONCE, used by both
//   fetchRedditSignals() and fetchRedditAlerts().
//   This avoids 8 concurrent Reddit requests per load (rate limit killer).
//
// Sources:
//   Primary:   r/{cityName} restricted search — high quality, locally relevant
//   Secondary: Global Reddit search — wider net, spam filtered
//
// Page 1 → returned immediately (fast)
// Page 2 → fetched in background, updates cache silently
// ============================================================

import axios from 'axios';

const REDDIT    = 'https://www.reddit.com';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

// Shared post cache — ONE fetch for both signals + alerts
const postCache  = new Map(); // cityName → { posts, ts }
const inFlight   = new Map(); // cityName → Promise (dedup concurrent calls)

// Subreddits known to be spam/irrelevant — skip their posts
const SPAM_SUBS = new Set([
  'gloriousservice', 'upautoshop', 'u_Away-Meringue-6321',
  'u_Unusual-Ambition-431', 'u_vibhutihospitals', 'clowncouncil',
]);

// ── Relevance scoring ─────────────────────────────────────────────────────────
const CIVIC_KEYWORDS = [
  // Disasters / environment (weight 3)
  { re: /\bflood(ing|ed|s)?\b/i,              w: 3 },
  { re: /\baqi\b|air.?quality|pm2\.?5/i,      w: 3 },
  { re: /\bpollut(ion|ed|ant)/i,              w: 3 },
  { re: /\bwaterlog(ging)?\b/i,               w: 3 },
  { re: /\blandslide|cloudburst/i,            w: 3 },
  { re: /\bforest.?fire|wildfire/i,           w: 3 },
  { re: /\bearthquake|tremor/i,               w: 3 },
  { re: /\bsmog|haze|dust.?storm/i,           w: 3 },
  { re: /\bnoise.?pollut/i,                   w: 3 },
  // Civic complaints (weight 3)
  { re: /\bpothole/i,                         w: 3 },
  { re: /\bgarbage|waste|littering|dump(ing)?\b/i, w: 3 },
  { re: /\bpower.?cut|blackout|outage/i,      w: 3 },
  { re: /\bwater.?(supply|shortage|quality|crisis)/i, w: 3 },
  { re: /\bsewage|drain(age)?\b/i,            w: 3 },
  { re: /\baccident|collision|crash|hit.?run/i, w: 3 },
  { re: /\broad.?block(ed)?|road.?clos/i,     w: 3 },
  { re: /\bhospitali[sz]ed|healthcare.?crisis/i, w: 3 },
  // Infrastructure / governance (weight 2)
  { re: /\btraffic.?(jam|congestion|rule|problem)/i, w: 2 },
  { re: /\btraffic\b/i,                       w: 1 },
  { re: /\bconstruction|repair|broken|pathetic/i, w: 2 },
  { re: /\bmunicipal|civic|nagar.?nigam|corporation/i, w: 2 },
  { re: /\binfrastructure|expressway|flyover|bypass/i, w: 2 },
  { re: /\bsmart.?city|crore|budget|spending/i, w: 2 },
  { re: /\bcorrupt(ion)?|scam|fraud|reality.?ground/i, w: 2 },
  { re: /\bprotest|strike|dharna|complaint/i, w: 2 },
  { re: /\bhealth|hospital\b/i,               w: 2 },
  { re: /\bdengue|malaria|disease\b/i,        w: 2 },
  { re: /\bgreen.?cover|deforestation|encroach/i, w: 2 },
  { re: /\belectricity|power.?supply|\bunit\b.*₹/i, w: 2 },
  { re: /\bdeath|died|fatal|killed\b/i,       w: 2 },
  // Weak context (weight 1)
  { re: /\broad\b/i,                          w: 1 },
  { re: /\bwater\b/i,                         w: 1 },
  { re: /\bsafety|unsafe|danger/i,            w: 1 },
  { re: /\bdead|dying|disgrace|pathetic|horrible/i, w: 1 },
];

function relevanceScore(title, body = '') {
  const text = (title + ' ' + body).toLowerCase();
  return CIVIC_KEYWORDS.reduce((sum, { re, w }) => sum + (re.test(text) ? w : 0), 0);
}

// ── Shared post fetcher ───────────────────────────────────────────────────────

async function fetchPage(url, params) {
  try {
    const r = await axios.get(url, {
      params: { ...params, limit: 100 },
      timeout: 8000,
    });
    const posts = (r.data?.data?.children || []).map(c => c.data);
    return { posts, after: r.data?.data?.after || null };
  } catch (e) {
    console.warn(`[Reddit] fetchPage FAILED: ${url}`, e.message);
    return { posts: [], after: null };
  }
}

function mergePosts(a, b) {
  const seen = new Set();
  return [...a, ...b].filter(p => {
    if (!p?.id || seen.has(p.id) || p.stickied || !p.title) return false;
    if (SPAM_SUBS.has(p.subreddit)) return false;
    seen.add(p.id);
    return true;
  });
}

async function loadPostsForCity(cityName) {
  if (inFlight.has(cityName)) return inFlight.get(cityName);

  const promise = (async () => {
    // search.json is the only Reddit endpoint that returns Access-Control-Allow-Origin: *
    // new.json / hot.json do NOT have CORS headers — cannot be used from the browser
    const CIVIC_Q = 'flood OR AQI OR pollution OR pothole OR traffic OR waterlogging OR garbage OR "power cut" OR road OR water OR accident OR landslide OR sewage OR drain OR municipal OR infrastructure OR noise OR electricity OR death OR crash';

    const [sub1, glob1] = await Promise.all([
      // City subreddit — restricted to r/{city}, best quality
      fetchPage(`${REDDIT}/r/${cityName}/search.json`, {
        q: CIVIC_Q, sort: 'new', restrict_sr: 1, t: 'year',
      }),
      // Global Reddit — wider net for cities without active subreddits
      fetchPage(`${REDDIT}/search.json`, {
        q: `${cityName} flood OR AQI OR pollution OR pothole OR waterlogging OR garbage OR accident OR "road closed" OR sewage OR municipal OR infrastructure`,
        sort: 'new', t: 'month',
      }),
    ]);

    const page1Posts = mergePosts(sub1.posts, glob1.posts);

    // Only cache when we actually got posts — never lock out future retries with an empty cache
    if (page1Posts.length > 0) {
      postCache.set(cityName, { posts: page1Posts, ts: Date.now() });
    }
    inFlight.delete(cityName);

    // Background page 2 — expand pool silently
    if (sub1.after || glob1.after) {
      Promise.all([
        sub1.after ? fetchPage(`${REDDIT}/r/${cityName}/search.json`, {
          q: CIVIC_Q, sort: 'new', restrict_sr: 1, t: 'year', after: sub1.after,
        }) : Promise.resolve({ posts: [] }),
        glob1.after ? fetchPage(`${REDDIT}/search.json`, {
          q: `${cityName} flood OR AQI OR pollution OR pothole OR waterlogging OR garbage OR accident OR municipal OR infrastructure`,
          sort: 'new', t: 'month', after: glob1.after,
        }) : Promise.resolve({ posts: [] }),
      ]).then(([sub2, glob2]) => {
        const cached = postCache.get(cityName)?.posts || [];
        const allPosts = mergePosts([...cached, ...sub2.posts], glob2.posts);
        if (allPosts.length > 0) postCache.set(cityName, { posts: allPosts, ts: Date.now() });
      }).catch(() => {});
    }

    return page1Posts;
  })();

  inFlight.set(cityName, promise);
  return promise;
}

async function getPostsForCity(cityName) {
  const hit = postCache.get(cityName);
  // Serve cache only if it's fresh AND non-empty (empty = prior failure, should retry)
  if (hit && hit.posts.length > 0 && Date.now() - hit.ts < CACHE_TTL) return hit.posts;
  return loadPostsForCity(cityName);
}

// ── Public: Social Signals ────────────────────────────────────────────────────

export async function fetchRedditSignals(cityName = 'Dehradun') {
  try {
    const posts    = await getPostsForCity(cityName);
    const relevant = posts
      .map(p => ({ ...p, _score: relevanceScore(p.title, p.selftext || '') }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score || b.created_utc - a.created_utc);

    if (relevant.length === 0) return null;

    return {
      signalCount: relevant.length,
      sources:     { reddit: relevant.length },
      trend:       buildTrend(relevant.length),
      topKeywords: extractKeywords(
        relevant.map(p => p.title + ' ' + (p.selftext || '')).join(' '),
        cityName
      ),
      recentPosts: relevant.slice(0, 3).map(p => ({
        source:   'reddit',
        text:     p.title.slice(0, 120),
        time:     formatRelativeTime(p.created_utc * 1000),
        location: cityName,
      })),
      _source: 'LIVE',
    };
  } catch (e) {
    console.warn('[Reddit:signals]', e.message);
    return null;
  }
}

// ── Public: Citizen Alert Posts ───────────────────────────────────────────────

export async function fetchRedditAlerts(cityName = 'Dehradun') {
  try {
    const posts = await getPostsForCity(cityName);
    return posts
      .map(p => ({ ...p, _score: relevanceScore(p.title, p.selftext || '') }))
      .filter(p => p._score >= 2)
      .sort((a, b) => b._score - a._score || b.created_utc - a.created_utc)
      .slice(0, 5)
      .map((p, i) => ({
        id:       `reddit-${p.id || i}`,
        severity: p._score >= 6 ? 'high' : p._score >= 3 ? 'medium' : 'low',
        message:  p.title.slice(0, 140),
        source:   `r/${p.subreddit}`,
        time:     formatRelativeTime(p.created_utc * 1000),
        link:     `https://reddit.com${p.permalink}`,
      }));
  } catch (e) {
    console.warn('[Reddit:alerts]', e.message);
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the','a','an','is','in','of','to','and','for','on','at','with','this',
  'that','are','was','it','be','as','by','from','or','but','not','have',
  'he','she','they','we','you','i','my','his','her','our','its','will',
  'get','has','had','been','more','also','just','like','about','after',
  'what','how','why','when','where','who','which','going','does','make',
  'some','very','really','anyone','people','anyone','know','think','feel',
]);

function extractKeywords(text, cityName) {
  const city = cityName.toLowerCase().split(' ');
  const words = text.toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w) && !city.includes(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

function buildTrend(current) {
  return Array.from({ length: 8 }, (_, i) =>
    Math.max(1, Math.round(current * (0.4 + (i / 7) * 0.6)))
  );
}

function formatRelativeTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
