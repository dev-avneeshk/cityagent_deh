// ============================================================
// Alerts API — two live sources + mock fallback
//
// Source 1 — Google News RSS (city-specific, via rss2json)
//   Query targets official warnings, red/orange alerts, flood advisories
//   Severity inferred from keywords in title
//
// Source 2 — Data-derived alerts (100% real, no network call needed)
//   Built from the live AQI, flood, and weather values we already fetch.
//   If AQI = 183, you get a real HIGH alert — not a mock string.
//
// Source 3 — Mock fallback (only fires if RSS fetch fails entirely)
//
// Cache: stale-while-revalidate, 10-min threshold for alerts
//   (shorter than news because alerts are more time-sensitive)
// ============================================================

import axios from 'axios';

const RSS2JSON    = 'https://api.rss2json.com/v1/api.json';
const STALE_AFTER = 10 * 60 * 1000; // 10 min

const cache    = new Map(); // key → { alerts, ts }
const inFlight = new Map(); // key → Promise

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {string} cityName   - "Mumbai", "Bengaluru", etc.
 * @param {string} parentCity - state / district for broader coverage
 * @param {object} liveData   - { aqi, flood, weather } — already fetched live values
 * @param {object} opts
 * @param {function} opts.onUpdate - called with fresh alerts after background refresh
 */
export async function fetchLiveAlerts(cityName, parentCity = '', liveData = {}, { onUpdate } = {}) {
  const key = `alerts:${cityName}|${parentCity}`;
  const hit = cache.get(key);

  if (hit) {
    if (Date.now() - hit.ts > STALE_AFTER && onUpdate) {
      _refreshInBackground(key, cityName, parentCity, liveData, onUpdate);
    }
    // Always rebuild data-derived alerts on top of cached RSS alerts
    // so they reflect the latest live sensor values
    return mergeWithDerived(hit.rssAlerts, cityName, liveData);
  }

  return _fetchAndCache(key, cityName, parentCity, liveData);
}

// ── Internals ─────────────────────────────────────────────────────────────────

function _refreshInBackground(key, cityName, parentCity, liveData, onUpdate) {
  if (inFlight.has(key)) return;
  _fetchAndCache(key, cityName, parentCity, liveData)
    .then(alerts => onUpdate(alerts))
    .catch(() => {});
}

async function _fetchAndCache(key, cityName, parentCity, liveData) {
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = _fetchRSSAlerts(cityName, parentCity)
    .catch(() => [])
    .then(rssAlerts => {
      inFlight.delete(key);
      if (rssAlerts.length > 0) cache.set(key, { rssAlerts, ts: Date.now() });
      return mergeWithDerived(rssAlerts, cityName, liveData);
    }).catch(() => {
      inFlight.delete(key);
      return deriveFromLiveData(cityName, liveData);
    });

  inFlight.set(key, promise);
  return promise;
}

// ── Google News RSS alert fetch ───────────────────────────────────────────────

async function _fetchRSSAlerts(cityName, parentCity) {
  const parts = [cityName, parentCity]
    .map(s => s?.trim()).filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const cityPart = parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0];

  // Targeted query: focus on official alerts, warnings, advisories
  const query  = `${cityPart} "red alert" OR "orange alert" OR "flood warning" OR "weather warning" OR "health advisory" OR "air quality" OR disaster OR emergency OR landslide OR cyclone`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  const r = await axios.get(RSS2JSON, { params: { rss_url: rssUrl }, timeout: 10_000 });
  if (r.data.status !== 'ok') return [];

  return r.data.items.slice(0, 5).map((item, i) => ({
    id:       `rss-${i}-${Date.now()}`,
    severity: detectSeverity(item.title + ' ' + (item.description || '')),
    message:  cleanTitle(item.title),
    source:   extractSource(item.author, item.title),
    time:     formatRelativeTime(item.pubDate),
    link:     item.link,
  }));
}

// ── Data-derived alerts (built from live Open-Meteo values) ──────────────────

function deriveFromLiveData(cityName, { aqi, flood, weather } = {}) {
  const alerts = [];
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // AQI alerts
  if (aqi?.value != null) {
    if (aqi.value > 200) {
      alerts.push({ id: 'drv-aqi-1', severity: 'critical',
        message: `Hazardous air quality (AQI ${aqi.value}) — avoid all outdoor activity in ${cityName}`,
        source: 'Open-Meteo AQI', time: `Live · ${now}` });
    } else if (aqi.value > 150) {
      alerts.push({ id: 'drv-aqi-2', severity: 'high',
        message: `Very unhealthy AQI ${aqi.value} in ${cityName} — sensitive groups must stay indoors`,
        source: 'Open-Meteo AQI', time: `Live · ${now}` });
    } else if (aqi.value > 100) {
      alerts.push({ id: 'drv-aqi-3', severity: 'medium',
        message: `Unhealthy AQI ${aqi.value} detected in ${cityName} — limit outdoor exposure`,
        source: 'Open-Meteo AQI', time: `Live · ${now}` });
    }
  }

  // PM2.5 spike independent of US AQI bracket
  if (aqi?.components?.pm25 > 60) {
    alerts.push({ id: 'drv-pm25', severity: aqi.components.pm25 > 90 ? 'critical' : 'high',
      message: `PM2.5 spike: ${aqi.components.pm25} µg/m³ in ${cityName} (WHO limit: 15 µg/m³)`,
      source: 'Open-Meteo CAMS', time: `Live · ${now}` });
  }

  // Flood / river discharge alerts
  if (flood?.floodRisk === 'Critical') {
    alerts.push({ id: 'drv-flood-1', severity: 'critical',
      message: `Critical flood risk — river discharge ${flood.riverDischarge} m³/s exceeds 30d max in ${cityName}`,
      source: 'Open-Meteo GloFAS', time: `Live · ${now}` });
  } else if (flood?.floodRisk === 'High') {
    alerts.push({ id: 'drv-flood-2', severity: 'high',
      message: `High flood risk — elevated river discharge (${flood.riverDischarge} m³/s) near ${cityName}`,
      source: 'Open-Meteo GloFAS', time: `Live · ${now}` });
  }

  // Rainfall alert
  if (weather?.precipitation > 15) {
    alerts.push({ id: 'drv-rain', severity: weather.precipitation > 30 ? 'critical' : 'high',
      message: `Heavy rainfall: ${weather.precipitation} mm recorded in ${cityName} — waterlogging risk`,
      source: 'Open-Meteo Weather', time: `Live · ${now}` });
  }

  // High wind alert
  if (weather?.windSpeed > 15) {
    alerts.push({ id: 'drv-wind', severity: 'medium',
      message: `Strong winds: ${weather.windSpeed} m/s (${weather.windDirection}) in ${cityName}`,
      source: 'Open-Meteo Weather', time: `Live · ${now}` });
  }

  // UV / dust alert
  if (aqi?.components?.uv > 8) {
    alerts.push({ id: 'drv-uv', severity: 'medium',
      message: `Extreme UV index ${aqi.components.uv} in ${cityName} — use sun protection`,
      source: 'Open-Meteo CAMS', time: `Live · ${now}` });
  }

  return alerts;
}

function mergeWithDerived(rssAlerts, cityName, liveData) {
  const derived = deriveFromLiveData(cityName, liveData);
  const all = [...derived, ...rssAlerts];
  // Sort: critical → high → medium → low
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return all.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)).slice(0, 10);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectSeverity(text) {
  const t = text.toLowerCase();
  if (/red alert|extreme|emergency|evacuate|critical|very heavy|catastrophic|severe flood/.test(t)) return 'critical';
  if (/warning|heavy rain|flood|cyclone|storm|orange alert|landslide|earthquake|heatwave|dense fog/.test(t)) return 'high';
  if (/advisory|watch|caution|yellow alert|moderate|air quality/.test(t)) return 'medium';
  return 'low';
}

function cleanTitle(title) {
  // Strip " - Source Name" suffix Google News appends
  const dash = title?.lastIndexOf(' - ');
  return dash > 0 ? title.slice(0, dash).trim() : title;
}

function extractSource(author, title) {
  if (author?.trim()) return author.trim();
  const dash = title?.lastIndexOf(' - ');
  if (dash > 0) return title.slice(dash + 3);
  return 'Google News';
}

function formatRelativeTime(pubDate) {
  if (!pubDate) return '';
  const diff = Date.now() - new Date(pubDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
