// ============================================================
// CityAgent Mock Data
// Replace each section with the corresponding API call
// All MOCK: comments show the real API endpoint to use later
// ============================================================

// MOCK: WAQI API → GET https://api.waqi.info/feed/dehradun/?token=YOUR_TOKEN
export const aqiData = {
  value: 139,
  category: "Moderate",
  dominantPollutant: "PM2.5",
  color: "#f97316",
  markerPosition: "28%", // position on gradient bar (0–300 AQI scale)
  components: {
    // MOCK: OpenWeatherMap Air Pollution API
    // GET https://api.openweathermap.org/data/2.5/air_pollution?lat=30.32&lon=78.03&appid=YOUR_KEY
    pm25:  18.4,   // µg/m³
    pm10:  34.2,   // µg/m³
    no2:   22.1,   // µg/m³
    o3:    61.3,   // µg/m³
    so2:   8.7,    // µg/m³
    co:    0.4,    // mg/m³
  },
  trend: [160, 155, 148, 152, 145, 139, 142, 139], // last 8 readings
  station: "Dehradun Central Monitoring Station",
  lastUpdated: "2026-03-19T14:00:00+05:30",
};

// MOCK: Open-Meteo Weather API (NO KEY NEEDED)
// GET https://api.open-meteo.com/v1/forecast?latitude=30.3165&longitude=78.0322
//     &current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,
//              surface_pressure,visibility&timezone=Asia/Kolkata
export const weatherData = {
  temperature: 22,          // °C
  humidity: 83,             // %
  pressure: 751,            // mmHg (convert from hPa: divide by 1.333)
  windSpeed: 0.9,           // m/s
  windDirection: "E",       // compass from degrees
  visibility: 32,           // km
  inversion: "East, 700–800m",
  condition: "Partly Cloudy",
  icon: "⛅",
};

// MOCK: Open-Meteo Flood API (NO KEY NEEDED)
// GET https://flood-api.open-meteo.com/v1/flood
//     ?latitude=30.3165&longitude=78.0322&daily=river_discharge
export const rainfallData = {
  last24h: 2.4,             // mm
  floodRisk: "Low",
  riverDischarge: 12.3,     // m³/s (Rispana river proxy)
  trend: [0.8, 1.2, 1.8, 2.0, 2.2, 2.4, 2.3, 2.4],
};

// MOCK: TomTom Traffic Flow API
// GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json
//     ?point=30.3165,78.0322&key=YOUR_KEY
export const trafficData = {
  vehiclesPerHour: 4256,
  congestionLevel: "Heavy",
  hotspot: "Rajpur Road",
  freeFlowSpeed: 50,        // km/h
  currentSpeed: 18,         // km/h
  trend: [3800, 3900, 4100, 3950, 4200, 4256, 4300, 4256],
  incidents: [
    { location: "Clock Tower Junction", type: "Congestion", severity: "High" },
    { location: "ISBT Bypass", type: "Roadwork", severity: "Medium" },
  ],
};

// MOCK: Reddit API (PRAW) + twikit scraper
// Reddit: GET https://www.reddit.com/r/Dehradun/search.json?q=flood+OR+pothole+OR+garbage&sort=new
// Twitter: twikit search "Dehradun complaint flood pothole since:2026-03-18"
export const socialData = {
  signalCount: 89,
  sources: { twitter: 52, reddit: 37 },
  trend: [50, 55, 60, 65, 72, 75, 82, 89],
  topKeywords: ["pothole", "garbage", "flooding", "power cut", "water supply"],
  recentPosts: [
    { source: "reddit", text: "Serious waterlogging on Haridwar bypass again", time: "8 min ago", location: "Haridwar Bypass" },
    { source: "twitter", text: "Garbage not collected in Patel Nagar for 3 days", time: "15 min ago", location: "Patel Nagar" },
    { source: "twitter", text: "Massive pothole on Rajpur road near FRI turn", time: "22 min ago", location: "Rajpur Road" },
  ],
};

// MOCK: Computed from all sources by backend anomaly engine
// Real: GET http://localhost:8000/api/stats
export const systemStats = {
  activeSensors: 247,
  anomaliesToday: 12,
  systemUptime: 99.7,       // %
  activeAlerts: 3,
  pipelineStatus: {
    dataCollect:   "running",
    filter:        "running",
    detectAnomaly: "processing",
    decide:        "waiting",
    alertAct:      "waiting",
  },
};

// MOCK: Backend anomaly engine output
// Real: GET http://localhost:8000/api/anomalies?range=24h
export const anomalyTimeline = {
  labels: [
    "00:00","01:00","02:00","03:00","04:00","05:00",
    "06:00","07:00","08:00","09:00","10:00","11:00",
    "12:00","13:00","14:00","15:00","16:00","17:00",
    "18:00","19:00","20:00","21:00","22:00","23:00",
  ],
  aqi:     [1,0,2,1,3,2,5,7,8,6,4,5,7,9,8,6,5,7,8,6,4,3,2,1],
  traffic: [0,0,1,0,2,3,4,6,7,5,4,5,6,8,7,6,5,7,8,7,5,4,3,2],
  social:  [0,0,0,1,0,1,2,3,4,3,2,3,4,5,4,3,4,5,4,3,2,2,1,0],
};

// MOCK: Backend alert engine + NLP output
// Real: GET http://localhost:8000/api/alerts?limit=10
export const initialAlerts = [
  {
    id: 1,
    severity: "critical",
    message: "PM2.5 levels exceeding safe limit at Rajpur Road",
    source: "AQI sensor #14",
    time: "Just now",
    location: { lat: 30.3398, lng: 78.0644 },
  },
  {
    id: 2,
    severity: "high",
    message: "Traffic congestion detected — Clock Tower junction",
    source: "Traffic API",
    time: "2 min ago",
    location: { lat: 30.3245, lng: 78.0435 },
  },
  {
    id: 3,
    severity: "medium",
    message: "Drainage overflow risk at Rispana river bridge",
    source: "Flood API",
    time: "5 min ago",
    location: { lat: 30.3012, lng: 78.0156 },
  },
  {
    id: 4,
    severity: "medium",
    message: "Garbage collection delay reported in 3 zones",
    source: "Reddit signal",
    time: "11 min ago",
    location: { lat: 30.3165, lng: 78.0322 },
  },
  {
    id: 5,
    severity: "low",
    message: "Minor road surface damage near ISBT",
    source: "Citizen report",
    time: "18 min ago",
    location: { lat: 30.2987, lng: 78.0512 },
  },
  {
    id: 6,
    severity: "low",
    message: "Elevated noise at construction site — Saharanpur Road",
    source: "Twitter signal",
    time: "24 min ago",
    location: { lat: 30.3367, lng: 78.0678 },
  },
];

// Auto-generated new alerts (simulates real-time backend push)
// Real: WebSocket ws://localhost:8000/ws/alerts
export const incomingAlertQueue = [
  { id: 7,  severity: "high",   message: "SO2 spike detected near SIDCUL industrial zone",       source: "Sensor #22",    time: "Just now" },
  { id: 8,  severity: "medium", message: "Water logging reported near Bindal river area",          source: "Reddit signal", time: "Just now" },
  { id: 9,  severity: "low",    message: "Pothole reported on Mussoorie road by residents",        source: "Twitter",       time: "Just now" },
  { id: 10, severity: "critical",message: "AQI crossed 200 near Prem Nagar industrial cluster",   source: "WAQI API",      time: "Just now" },
  { id: 11, severity: "high",   message: "Flash flood warning — Suswa river discharge +40%",      source: "Flood API",     time: "Just now" },
];

// MOCK: OpenStreetMap/Nominatim — Dehradun zones for map
// Real: Leaflet renders these as GeoJSON overlays
export const dehradunZones = [
  { id: "z1", name: "Rajpur Road",     lat: 30.3398, lng: 78.0644, aqi: 139, status: "moderate" },
  { id: "z2", name: "Clock Tower",     lat: 30.3245, lng: 78.0435, aqi: 98,  status: "good" },
  { id: "z3", name: "ISBT",            lat: 30.2987, lng: 78.0512, aqi: 112, status: "moderate" },
  { id: "z4", name: "Prem Nagar",      lat: 30.3012, lng: 78.0156, aqi: 187, status: "unhealthy" },
  { id: "z5", name: "Saharanpur Road", lat: 30.3367, lng: 78.0678, aqi: 145, status: "moderate" },
  { id: "z6", name: "Haridwar Bypass", lat: 30.2876, lng: 78.0234, aqi: 76,  status: "good" },
];
