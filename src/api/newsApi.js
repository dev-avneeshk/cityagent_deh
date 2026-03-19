// ============================================================
// News API — Google News RSS via rss2json.com
// Zero signup · Zero key · CORS-safe · Free forever for normal use
//
// One RSS call per city using a combined query:
//   "(Bollaram OR Telangana) flood OR AQI OR pollution OR ..."
// This gives locality + parent city results without doubling API calls.
//
// Cache: stale-while-revalidate
//   - First visit: waits for fetch (shows skeleton)
//   - Return visits / same city (< 15 min): instant from cache
//   - Stale (> 15 min): returns old cache instantly, refreshes in background
//   - Empty results are never cached so a retry always fires on next visit
// ============================================================

import axios from 'axios';

const RSS2JSON    = 'https://api.rss2json.com/v1/api.json';
const STALE_AFTER = 15 * 60 * 1000; // 15 min

// cache: key → { articles, ts }
const cache    = new Map();
// in-flight: key → Promise  (prevents duplicate parallel fetches)
const inFlight = new Map();

/**
 * Fetch news for a locality AND its parent city in a single RSS call.
 *
 * @param {string}   cityName   "Bollaram" | "Rajpur Road" | "Bengaluru"
 * @param {string}   parentCity "Telangana" | "Dehradun"   | "Karnataka"
 * @param {object}   opts
 * @param {function} opts.onUpdate  called with fresh articles after background refresh
 */
export async function fetchNews(cityName = 'Dehradun', parentCity = '', { onUpdate } = {}) {
  const key = buildKey(cityName, parentCity);
  const hit = cache.get(key);

  if (hit) {
    if (Date.now() - hit.ts > STALE_AFTER && onUpdate) {
      _refreshInBackground(key, cityName, parentCity, onUpdate);
    }
    return hit.articles;
  }

  return _fetchAndCache(key, cityName, parentCity);
}

// ── Internals ─────────────────────────────────────────────────────────────────

function buildKey(cityName, parentCity) {
  return [cityName, parentCity]
    .map(s => s?.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .join('|');
}

function _refreshInBackground(key, cityName, parentCity, onUpdate) {
  if (inFlight.has(key)) return;
  _fetchAndCache(key, cityName, parentCity)
    .then(articles => onUpdate(articles))
    .catch(() => {});
}

async function _fetchAndCache(key, cityName, parentCity) {
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = _doFetch(cityName, parentCity)
    .then(articles => {
      inFlight.delete(key);
      // Only cache non-empty results — empty means something went wrong,
      // so next call will retry instead of getting stuck on []
      if (articles.length > 0) cache.set(key, { articles, ts: Date.now() });
      return articles;
    })
    .catch(err => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Single RSS fetch combining both city names:
 * "(Bollaram OR Telangana) flood OR AQI OR pollution OR disaster OR weather OR traffic"
 * Falls back to just cityName if parentCity is the same or missing.
 */
async function _doFetch(cityName, parentCity) {
  const parts = [cityName, parentCity]
    .map(s => s?.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const cityPart = parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0];
  const query    = `${cityPart} flood OR AQI OR pollution OR disaster OR weather OR traffic`;
  const rssUrl   = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  const r = await axios.get(RSS2JSON, {
    params:  { rss_url: rssUrl },
    timeout: 10_000,
  });

  if (r.data.status !== 'ok') throw new Error(`rss2json error: ${r.data.message || 'unknown'}`);

  return r.data.items.slice(0, 8).map((item, i) => ({
    id:     item.guid || item.link || `${cityPart}-${i}`,
    title:  item.title,
    link:   item.link,
    source: extractSource(item.author, item.title),
    time:   formatRelativeTime(item.pubDate),
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSource(author, title) {
  if (author?.trim()) return author.trim();
  const dash = title?.lastIndexOf(' - ');
  if (dash > 0) return title.slice(dash + 3);
  return 'Google News';
}

function formatRelativeTime(pubDate) {
  if (!pubDate) return '';
  const diff = Date.now() - new Date(pubDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
