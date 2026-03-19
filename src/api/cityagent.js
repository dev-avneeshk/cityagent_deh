// ============================================================
// CityAgent API Layer — v3 (dynamic lat/lon + live Open-Meteo)
// Weather, AQI, Flood: LIVE from Open-Meteo for any city
// Traffic, Social, Alerts: MOCK (needs API keys)
// ============================================================

import axios from 'axios';
import {
  trafficData, systemStats, generateCityData
} from '../data/mockData';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WAQI_TOKEN  = import.meta.env.VITE_WAQI_TOKEN  || 'demo';
const TOMTOM_KEY  = import.meta.env.VITE_TOMTOM_KEY  || '';

// ── AQI (LIVE — Open-Meteo CAMS, no key needed) ──────────────────────────
export async function fetchAQI(lat = 30.3165, lon = 78.0322) {
  try {
    const r = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude: lat, longitude: lon, timezone: 'auto',
        current: 'pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,european_aqi,us_aqi,dust,uv_index',
        hourly: 'pm2_5',
        past_days: 0, forecast_days: 1
      }
    });
    const c = r.data.current;
    const hourlyPm25 = r.data.hourly?.pm2_5 || [];
    const last8 = hourlyPm25.slice(-8).map(v => v ?? 0);

    return {
      value: c.us_aqi,
      eu_aqi: c.european_aqi,
      category: getUSAQICategory(c.us_aqi),
      dominantPollutant: getDominantPollutant(c),
      color: getAQIColor(c.us_aqi),
      markerPosition: `${Math.min(Math.round((c.us_aqi / 300) * 100), 100)}%`,
      components: {
        pm25: c.pm2_5,
        pm10: c.pm10,
        no2:  c.nitrogen_dioxide,
        o3:   c.ozone,
        so2:  c.sulphur_dioxide,
        co:   c.carbon_monoxide,
        dust: c.dust,
        uv:   c.uv_index,
      },
      trend: last8.length > 0 ? last8 : [32, 30, 28, 30, 31, 33, 32, c.pm2_5],
      station: `Open-Meteo CAMS · ${lat.toFixed(2)}°N ${lon.toFixed(2)}°E`,
      lastUpdated: c.time,
    };
  } catch (e) {
    console.warn('[AQI] API failed, using fallback', e.message);
    return { value: 64, eu_aqi: 48, category: 'Moderate', dominantPollutant: 'PM2.5',
      color: '#eab308', markerPosition: '21%',
      components: { pm25: 32.5, pm10: 82.4, no2: 22.6, o3: 66, so2: 12.3, co: 434, dust: 107, uv: 0 },
      trend: [43, 38, 42, 38, 22, 18, 16, 32], station: 'Open-Meteo CAMS (fallback)', lastUpdated: new Date().toISOString() };
  }
}

// ── WEATHER (LIVE — Open-Meteo, no key needed) ───────────────────────────
export async function fetchWeather(lat = 30.3165, lon = 78.0322) {
  try {
    const r = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lon, timezone: 'auto',
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,precipitation,weather_code'
      }
    });
    const c = r.data.current;
    return {
      temperature: Math.round(c.temperature_2m * 10) / 10,
      humidity: c.relative_humidity_2m,
      pressure: Math.round(c.surface_pressure * 0.750062),  // hPa → mmHg
      windSpeed: Math.round((c.wind_speed_10m / 3.6) * 10) / 10,  // km/h → m/s
      windDirection: degreesToCompass(c.wind_direction_10m),
      visibility: Math.round((c.visibility / 1000) * 10) / 10,  // m → km
      precipitation: c.precipitation,
      condition: wmoToCondition(c.weather_code),
      icon: wmoToIcon(c.weather_code),
    };
  } catch (e) {
    console.warn('[Weather] API failed, using fallback', e.message);
    return { temperature: 16.9, humidity: 64, pressure: 704, windSpeed: 1.3,
      windDirection: 'SW', visibility: 24.1, precipitation: 0, condition: 'Overcast', icon: '☁️' };
  }
}

// ── FLOOD (LIVE — Open-Meteo GloFAS, no key needed) ──────────────────────
export async function fetchFlood(lat = 30.3165, lon = 78.0322) {
  try {
    const r = await axios.get('https://flood-api.open-meteo.com/v1/flood', {
      params: {
        latitude: lat, longitude: lon, timezone: 'auto',
        daily: 'river_discharge,river_discharge_max,river_discharge_min',
        past_days: 7, forecast_days: 3
      }
    });
    const d = r.data.daily;
    const discharges = d.river_discharge || [];
    const today = discharges[7] ?? discharges[discharges.length - 1] ?? 0;
    const history = discharges.slice(0, 7);
    const max30d = Math.max(...(d.river_discharge_max || [today]));

    return {
      last24h: 0,  // from weather precipitation
      floodRisk: getFloodRisk(today, history),
      riverDischarge: Math.round(today * 100) / 100,
      riverDischargeMax30d: Math.round(max30d * 100) / 100,
      trend: [...history, today].map(v => Math.round((v ?? 0) * 100) / 100),
    };
  } catch (e) {
    console.warn('[Flood] API failed, using fallback', e.message);
    return { last24h: 0, floodRisk: 'Low', riverDischarge: 0.34,
      riverDischargeMax30d: 5.93, trend: [0.22, 0.22, 0.22, 0.22, 0.22, 2.47, 1.0, 0.34] };
  }
}

// ── TRAFFIC (LIVE — TomTom Traffic Flow + Incidents APIs) ─────────────────
export async function fetchTraffic(lat = 30.3165, lon = 78.0322) {
  if (!TOMTOM_KEY) return trafficData;    // no key → fall back to mock

  try {
    // Parallel: flow segment + incident details for a ~20km bbox
    const delta = 0.15;
    const bbox  = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;

    const [flowRes, incRes] = await Promise.allSettled([
      axios.get('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json', {
        params: { point: `${lat},${lon}`, key: TOMTOM_KEY, unit: 'kmph' },
        timeout: 6000,
      }),
      axios.get('https://api.tomtom.com/traffic/services/5/incidentDetails', {
        params: {
          key:                TOMTOM_KEY,
          bbox,
          fields:             '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},from,to,length,delay,roadNumbers}}}',
          language:           'en-GB',
          categoryFilter:     '0,1,2,3,4,5,6,7,8,9,10,11,14',
          timeValidityFilter: 'present',
        },
        timeout: 6000,
      }),
    ]);

    // ── Flow data ────────────────────────────────────────────────────────
    let currentSpeed  = trafficData.currentSpeed;
    let freeFlowSpeed = trafficData.freeFlowSpeed;
    let congestionLevel = trafficData.congestionLevel;
    let roadClosure   = false;

    if (flowRes.status === 'fulfilled') {
      const f = flowRes.value.data.flowSegmentData;
      currentSpeed  = Math.round(f.currentSpeed);
      freeFlowSpeed = Math.round(f.freeFlowSpeed);
      roadClosure   = f.roadClosure ?? false;
      const ratio   = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
      congestionLevel = ratio >= 0.8 ? 'Free flow' : ratio >= 0.5 ? 'Moderate' : ratio >= 0.25 ? 'Heavy' : 'Standstill';
    }

    // Estimate vehicles/hr from speed ratio (proxy: higher congestion → more cars on road)
    const speedRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 0.5;
    const vehiclesPerHour = Math.round(4000 * (1 - speedRatio * 0.5) + 500);

    // Trend: approximate congestion curve for last 8 hours (seeded from current)
    const trend = Array.from({ length: 8 }, (_, i) =>
      Math.max(800, Math.round(vehiclesPerHour * (0.7 + Math.sin((i + 2) * 0.8) * 0.2)))
    );

    // ── Incident data ────────────────────────────────────────────────────
    let incidents = [];
    let hotspot   = `Location near ${lat.toFixed(2)}°N ${lon.toFixed(2)}°E`;

    if (incRes.status === 'fulfilled') {
      const raw = incRes.value.data.incidents || [];
      incidents = raw.slice(0, 5).map(inc => {
        const p    = inc.properties || {};
        const ev   = p.events?.[0];
        const desc = ev?.description || p.from || 'Traffic incident';
        const sev  = p.magnitudeOfDelay >= 3 ? 'High' : p.magnitudeOfDelay >= 2 ? 'Medium' : 'Low';
        return { location: p.from || desc, type: ev?.description || 'Incident', severity: sev };
      });
      if (incidents.length > 0) hotspot = incidents[0].location;
    }

    return {
      vehiclesPerHour,
      congestionLevel,
      currentSpeed,
      freeFlowSpeed,
      roadClosure,
      hotspot,
      trend,
      incidents: incidents.length ? incidents : trafficData.incidents,
      dataSource: 'TomTom Traffic API · LIVE',
    };

  } catch (e) {
    console.warn('[Traffic] TomTom API failed, using fallback:', e.message);
    return trafficData;
  }
}

// ── SOCIAL (MOCK — city-specific) ───────────────────────────────────────────
export async function fetchSocialSignals(cityName = 'Dehradun', aqiValue = 60) {
  return generateCityData(cityName, aqiValue).social;
}

// ── SYSTEM STATS (partially real) ────────────────────────────────────────
export async function fetchSystemStats() {
  return systemStats;
}

// ── ANOMALIES (MOCK — city-specific) ────────────────────────────────────────
export async function fetchAnomalies(cityName = 'Dehradun', aqiValue = 60) {
  return generateCityData(cityName, aqiValue).anomalyTimeline;
}

// ── ALERTS (MOCK — city-specific) ───────────────────────────────────────────
export async function fetchAlerts(cityName = 'Dehradun', aqiValue = 60) {
  const { alerts, anomaliesToday } = generateCityData(cityName, aqiValue);
  return { alerts, anomaliesToday };
}

// ── WEBSOCKET (MOCK) ─────────────────────────────────────────────────────
export function connectAlertSocket(onMessage) {
  let idx = 0;
  let interval;
  import('../data/mockData').then(({ incomingAlertQueue }) => {
    interval = setInterval(() => {
      onMessage({ ...incomingAlertQueue[idx % incomingAlertQueue.length], time: 'Just now' });
      idx++;
    }, 15000);
  });
  return { close: () => clearInterval(interval) };
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function degreesToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

function getUSAQICategory(v) {
  if (v == null) return 'Unknown';
  if (v <= 50) return 'Good';
  if (v <= 100) return 'Moderate';
  if (v <= 150) return 'Unhealthy for Sensitive Groups';
  if (v <= 200) return 'Unhealthy';
  if (v <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function getDominantPollutant(c) {
  const ratios = {
    'PM2.5': (c.pm2_5 ?? 0) / 15,
    'PM10':  (c.pm10  ?? 0) / 45,
    'NO2':   (c.nitrogen_dioxide ?? 0) / 25,
    'O3':    (c.ozone ?? 0) / 100,
    'SO2':   (c.sulphur_dioxide  ?? 0) / 40,
  };
  return Object.entries(ratios).sort((a, b) => b[1] - a[1])[0][0];
}

function getAQIColor(v) {
  if (v == null) return '#6b7280';
  if (v <= 50)  return '#22c55e';
  if (v <= 100) return '#eab308';
  if (v <= 150) return '#f97316';
  if (v <= 200) return '#ef4444';
  return '#a855f7';
}

function getFloodRisk(current, history) {
  const sorted = [...history].sort((a, b) => a - b);
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.90)] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  if (current > max)  return 'Critical';
  if (current > p90)  return 'High';
  if (current > p75)  return 'Medium';
  return 'Low';
}

function wmoToCondition(code) {
  if (code === 0)              return 'Clear';
  if (code <= 2)               return 'Partly Cloudy';
  if (code === 3)              return 'Overcast';
  if (code >= 51 && code <= 67) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95)              return 'Thunderstorm';
  if (code >= 45 && code <= 48) return 'Fog';
  return 'Cloudy';
}

function wmoToIcon(code) {
  if (code === 0)              return '☀️';
  if (code <= 2)               return '⛅';
  if (code === 3)              return '☁️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95)              return '⛈️';
  if (code >= 45 && code <= 48) return '🌫️';
  return '🌤️';
}
