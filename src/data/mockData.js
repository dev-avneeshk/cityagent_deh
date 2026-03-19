// ============================================================
// CityAgent Data Layer
// REAL values are from Open-Meteo APIs called 2026-03-19 01:29 IST
// MOCK values need an API key — see comment above each block
// ============================================================

// REAL: Open-Meteo CAMS Air Quality — fetched live 2026-03-19T01:29 IST
// api: air-quality-api.open-meteo.com/v1/air-quality?current=pm10,pm2_5,...
export const aqiData = {
  value: 64,                   // US AQI (REAL — Open-Meteo CAMS)
  eu_aqi: 48,                  // European AQI (REAL)
  category: "Moderate",        // 51–100 on US scale
  dominantPollutant: "PM2.5",  // 32.5 µg/m³ = 2.17× WHO limit — highest ratio
  color: "#eab308",
  markerPosition: "21%",       // (64 / 300) × 100
  components: {
    pm25: 32.5,   // µg/m³ REAL  (WHO limit: 15)
    pm10: 82.4,   // µg/m³ REAL  (WHO limit: 45) ← above limit
    no2:  22.6,   // µg/m³ REAL  (WHO limit: 25)
    o3:   66.0,   // µg/m³ REAL  (WHO limit: 100)
    so2:  12.3,   // µg/m³ REAL  (WHO limit: 40)
    co:   434.0,  // µg/m³ REAL
    dust: 107.0,  // µg/m³ REAL  ⚠ elevated — pre-monsoon dust event
    uv:   0.0,    // REAL (night time)
  },
  // last 8 hours of PM2.5 from Open-Meteo hourly AQI (REAL)
  trend: [43.4, 38.0, 41.9, 38.5, 21.8, 18.6, 15.5, 32.5],
  station: "Open-Meteo CAMS · Dehradun 30.32°N 78.03°E",
  lastUpdated: "2026-03-19T00:30:00+05:30",
};

// REAL: Open-Meteo Forecast API — fetched live 2026-03-19T01:15 IST
// api: api.open-meteo.com/v1/forecast?current=temperature_2m,relative_humidity_2m,...
export const weatherData = {
  temperature: 16.9,     // °C  REAL
  humidity: 64,          // %   REAL
  pressure: 704,         // mmHg REAL — 939.5 hPa × 0.750062
  windSpeed: 1.3,        // m/s  REAL — 4.8 km/h ÷ 3.6
  windDirection: "SW",   // REAL — 228° compass-converted
  visibility: 24.1,      // km   REAL — 24140m ÷ 1000
  inversion: "SW, 700–800m",
  condition: "Overcast", // WMO code 3
  icon: "☁️",
};

// REAL: Open-Meteo Flood API (GloFAS river model) — fetched 2026-03-19T01:29 IST
// api: flood-api.open-meteo.com/v1/flood?daily=river_discharge&past_days=30
export const rainfallData = {
  last24h: 0.0,            // mm   REAL — dry today (Mar 19)
  floodRisk: "Low",        // REAL — 0.34 m³/s << 30d max 5.93 m³/s
  riverDischarge: 0.34,    // m³/s REAL — Rispana/Bindal via GloFAS
  riverDischargeMax30d: 5.93, // m³/s REAL — peaked 2026-03-22 (forecast)
  // last 7 days daily discharge + today (REAL from flood API)
  trend: [0.22, 0.22, 0.22, 0.22, 0.22, 2.47, 1.00, 0.34],
};

// MOCK: TomTom Traffic Flow API — API KEY NEEDED
// GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json
//     ?point=30.3165,78.0322&key=YOUR_KEY
export const trafficData = {
  vehiclesPerHour: 4256,   // MOCK
  congestionLevel: "Heavy",
  hotspot: "Rajpur Road",
  freeFlowSpeed: 50,
  currentSpeed: 18,
  trend: [3800, 3900, 4100, 3950, 4200, 4256, 4300, 4256],
  incidents: [
    { location: "Clock Tower Junction", type: "Congestion", severity: "High" },
    { location: "ISBT Bypass",          type: "Roadwork",   severity: "Medium" },
  ],
};

// MOCK: Reddit (PRAW) + twikit scraper — API KEYS NEEDED
// Reddit: GET https://www.reddit.com/r/Dehradun/search.json?q=flood+pothole&sort=new
// Twitter: twikit search "Dehradun complaint flood pothole since:2026-03-18"
export const socialData = {
  signalCount: 89,    // MOCK
  sources: { twitter: 52, reddit: 37 },
  trend: [50, 55, 60, 65, 72, 75, 82, 89],
  topKeywords: ["pothole", "garbage", "flooding", "power cut", "water supply"],
  recentPosts: [
    { source: "reddit", text: "Serious waterlogging on Haridwar bypass again",    time: "8 min ago",  location: "Haridwar Bypass" },
    { source: "twitter", text: "Garbage not collected in Patel Nagar for 3 days", time: "15 min ago", location: "Patel Nagar" },
    { source: "twitter", text: "Massive pothole on Rajpur road near FRI turn",    time: "22 min ago", location: "Rajpur Road" },
  ],
};

// ── HOW WE COUNT "ACTIVE SENSORS" ─────────────────────────────────────────
// We have NO physical sensors yet. We count live Open-Meteo data streams.
//
//  Endpoint 1 — Weather current      8 parameters
//  Endpoint 2 — Weather 7d hourly    5 streams × 192 hours
//  Endpoint 3 — Weather 30d daily    4 streams × 30 days
//  Endpoint 4 — AQI current         10 parameters (PM2.5, PM10, NO2, O3 ...)
//  Endpoint 5 — AQI 7d hourly        6 streams × 168 hours
//  Endpoint 6 — AQI 30d hourly       4 streams × 720 hours
//  Endpoint 7 — Flood API            4 streams × 60 days
//  Endpoint 8 — Geocoding            1 source
//  ──────────────────────────────────────────────────
//  Total: 42 live data streams across 8 endpoints
//
//  Physical sensor counts come when WAQI + TomTom keys are added.
// ──────────────────────────────────────────────────────────────────────────
export const systemStats = {
  activeSensors: 42,          // REAL — 42 Open-Meteo data streams live
  activeSensorsLabel: "Live Data Streams",
  apiEndpoints: 8,            // REAL — 8 Open-Meteo endpoints called
  apiEndpointsUp: 8,          // REAL — all 8 returned HTTP 200
  anomaliesToday: 12,         // MOCK — replace with backend anomaly engine
  systemUptime: 100.0,        // REAL — 8/8 APIs up this session
  activeAlerts: 3,
  pipelineStatus: {
    dataCollect:   "running",
    filter:        "running",
    detectAnomaly: "processing",
    decide:        "waiting",
    alertAct:      "waiting",
  },
  // Anomaly thresholds computed from 30-day Open-Meteo historical data (REAL)
  anomalyThresholds: {
    pm25_spike:    72.0,  // 30d mean(38) + 2×stddev(17)
    pm25_critical: 89.0,  // 30d mean(38) + 3×stddev(17)
    rain_spike:    2.71,  // 30d mean(0.33) + 2×stddev(1.19)
    wind_spike:    4.56,  // 30d mean(3.17) + 2×stddev(0.70)
  },
};

// MOCK: Backend anomaly engine output
// Real: GET http://localhost:8000/api/anomalies?range=24h
export const anomalyTimeline = {
  labels: ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"],
  aqi:     [1,0,2,1,3,2,5,7,8,6,4,5,7,9,8,6,5,7,8,6,4,3,2,1],
  traffic: [0,0,1,0,2,3,4,6,7,5,4,5,6,8,7,6,5,7,8,7,5,4,3,2],
  social:  [0,0,0,1,0,1,2,3,4,3,2,3,4,5,4,3,4,5,4,3,2,2,1,0],
};

// MOCK: Backend alert engine + NLP output
// Real: GET http://localhost:8000/api/alerts?limit=10
export const initialAlerts = [
  { id: 1, severity: "critical", message: "PM2.5 levels exceeding safe limit at Rajpur Road",     source: "Open-Meteo AQI", time: "Just now",   location: { lat: 30.3398, lng: 78.0644 } },
  { id: 2, severity: "high",     message: "Traffic congestion detected — Clock Tower junction",    source: "Traffic API",    time: "2 min ago",  location: { lat: 30.3245, lng: 78.0435 } },
  { id: 3, severity: "medium",   message: "Drainage overflow risk at Rispana river bridge",        source: "Flood API",      time: "5 min ago",  location: { lat: 30.3012, lng: 78.0156 } },
  { id: 4, severity: "medium",   message: "Garbage collection delay reported in 3 zones",          source: "Reddit signal",  time: "11 min ago", location: { lat: 30.3165, lng: 78.0322 } },
  { id: 5, severity: "low",      message: "Minor road surface damage near ISBT",                   source: "Citizen report", time: "18 min ago", location: { lat: 30.2987, lng: 78.0512 } },
  { id: 6, severity: "low",      message: "Elevated noise at construction site — Saharanpur Road", source: "Twitter signal", time: "24 min ago", location: { lat: 30.3367, lng: 78.0678 } },
];

// Simulated incoming WebSocket alerts (MOCK)
// Real: WebSocket ws://localhost:8000/ws/alerts
export const incomingAlertQueue = [
  { id: 7,  severity: "high",     message: "SO2 spike detected near SIDCUL industrial zone",     source: "Sensor #22",    time: "Just now" },
  { id: 8,  severity: "medium",   message: "Water logging reported near Bindal river area",       source: "Reddit signal", time: "Just now" },
  { id: 9,  severity: "low",      message: "Pothole reported on Mussoorie road by residents",     source: "Twitter",       time: "Just now" },
  { id: 10, severity: "critical", message: "AQI crossed 200 near Prem Nagar industrial cluster",  source: "WAQI API",      time: "Just now" },
  { id: 11, severity: "high",     message: "Flash flood warning — Suswa river discharge +40%",   source: "Flood API",     time: "Just now" },
];

// Dehradun monitoring zones for Leaflet map
// Coordinates: REAL (from Open-Meteo geocoding + local knowledge)
// AQI values: MOCK per-zone (use WAQI API to get station-level readings)
export const dehradunZones = [
  { id: "z1", name: "Rajpur Road",     lat: 30.3398, lng: 78.0644, aqi: 139, status: "moderate"  },
  { id: "z2", name: "Clock Tower",     lat: 30.3245, lng: 78.0435, aqi: 98,  status: "good"      },
  { id: "z3", name: "ISBT",            lat: 30.2987, lng: 78.0512, aqi: 112, status: "moderate"  },
  { id: "z4", name: "Prem Nagar",      lat: 30.3012, lng: 78.0156, aqi: 187, status: "unhealthy" },
  { id: "z5", name: "Saharanpur Road", lat: 30.3367, lng: 78.0678, aqi: 145, status: "moderate"  },
  { id: "z6", name: "Haridwar Bypass", lat: 30.2876, lng: 78.0234, aqi: 76,  status: "good"      },
];

// ── CITY-ADAPTIVE MOCK DATA GENERATOR ────────────────────────────────────────
// Generates deterministic but city-specific data for anomalies, alerts, social.
// "Deterministic" means: same city → same data every render (no flicker).
// ─────────────────────────────────────────────────────────────────────────────

// Simple string hash → integer seed (no external libs)
function strHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

// Seeded LCG pseudo-random number generator (0–1 inclusive)
function makePrng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Road/area name templates by category
const ROAD_TEMPLATES  = ['Main Road', 'Bypass', 'Ring Road', 'Highway', 'Market Road', 'Link Road'];
const AREA_TEMPLATES  = ['Industrial Zone', 'Residential Area', 'Market District', 'Station Area', 'Bus Depot'];
const ISSUE_TEMPLATES = ['pothole', 'garbage dump', 'waterlogging', 'power cut', 'noise pollution', 'traffic jam', 'air quality', 'sewage overflow'];
const SEVERITIES      = ['critical', 'high', 'medium', 'medium', 'low', 'low'];

export function generateCityData(cityName = 'Dehradun', aqiValue = 60) {
  const seed = strHash(cityName + Math.floor(aqiValue / 10).toString());
  const rand = makePrng(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const ri   = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  // ── 1. Anomaly Timeline (24 hours) ────────────────────────────────────────
  const aqiFactor    = Math.max(0.3, aqiValue / 80);    // higher AQI → more anomalies
  const labels       = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
  const peakHours    = [ri(6,9), ri(12,15), ri(17,20)]; // morning, noon, evening peaks

  const gaussPeak = (h, peak, scale) => {
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    return Math.round(Math.max(0, scale * Math.exp(-0.5 * (dist / 2) ** 2)));
  };

  const anomalies = labels.map((_, h) => ({
    aqi:     Math.round(ri(0,2) + gaussPeak(h, peakHours[0], 8  * aqiFactor) + gaussPeak(h, peakHours[2], 5 * aqiFactor)),
    traffic: Math.round(ri(0,2) + gaussPeak(h, peakHours[0], 6)              + gaussPeak(h, peakHours[1], 7)),
    social:  Math.round(ri(0,1) + gaussPeak(h, peakHours[1], 4)              + gaussPeak(h, peakHours[2], 3)),
  }));

  const anomalyTimeline = {
    labels,
    aqi:     anomalies.map(a => a.aqi),
    traffic: anomalies.map(a => a.traffic),
    social:  anomalies.map(a => a.social),
  };

  const anomaliesToday = anomalies.reduce((s, a) => s + a.aqi + a.traffic + a.social, 0);

  // ── 2. Alerts ─────────────────────────────────────────────────────────────
  const alertTemplates = [
    { msg: `PM2.5 levels exceeding safe limit near ${cityName} ${pick(AREA_TEMPLATES)}`,  source: 'AQI Monitor',    sev: aqiValue > 100 ? 'critical' : 'high'   },
    { msg: `Traffic congestion at ${cityName} ${pick(ROAD_TEMPLATES)} crossing`,          source: 'Traffic API',    sev: 'high'   },
    { msg: `Drainage overflow risk at ${cityName} river bridge area`,                     source: 'Flood API',      sev: 'medium' },
    { msg: `${pick(ISSUE_TEMPLATES)} reported in ${cityName} ${pick(AREA_TEMPLATES)}`,    source: 'Reddit signal',  sev: pick(SEVERITIES) },
    { msg: `Minor road damage near ${cityName} ${pick(ROAD_TEMPLATES)}`,                  source: 'Citizen report', sev: 'low'   },
    { msg: `Elevated noise at construction site — ${cityName} ${pick(ROAD_TEMPLATES)}`,   source: 'Twitter signal', sev: 'low'   },
  ];

  const alerts = alertTemplates.map((t, i) => ({
    id: seed % 1000 + i,
    severity: t.sev,
    message:  t.msg,
    source:   t.source,
    time:     `${ri(1, 30)} min ago`,
  }));

  // ── 3. Social Signals ─────────────────────────────────────────────────────
  const baseSignals  = ri(40, 140);
  const twitterShare = ri(50, 65);
  const socialTrend  = Array.from({ length: 8 }, (_, i) =>
    Math.round(baseSignals * (0.5 + (i / 7) * 0.5) + ri(-5, 5))
  );
  socialTrend[7] = baseSignals;

  const social = {
    signalCount: baseSignals,
    sources: { twitter: Math.round(baseSignals * twitterShare / 100), reddit: Math.round(baseSignals * (100 - twitterShare) / 100) },
    trend: socialTrend,
    topKeywords: [pick(ISSUE_TEMPLATES), pick(ISSUE_TEMPLATES), pick(ISSUE_TEMPLATES), 'flooding', 'pollution'],
    recentPosts: [
      { source: 'reddit',  text: `${pick(ISSUE_TEMPLATES)} reported on ${cityName} ${pick(ROAD_TEMPLATES)}`, time: `${ri(3,10)} min ago`,  location: `${cityName} North` },
      { source: 'twitter', text: `Why is ${pick(ISSUE_TEMPLATES)} still unresolved in ${cityName}?`,           time: `${ri(11,20)} min ago`, location: `${cityName} Center` },
      { source: 'twitter', text: `Major ${pick(ISSUE_TEMPLATES)} disrupting commute in ${cityName}`,           time: `${ri(21,35)} min ago`, location: `${cityName} South` },
    ],
  };

  return { anomalyTimeline, anomaliesToday, alerts, social };
}

