// ============================================================
// CityAgent API Layer
// Currently returns mock data.
// To go live: replace each mock return with the fetch() call
// shown in the comment above it.
// Base URL switches automatically between dev and prod.
// ============================================================

import axios from 'axios';
import {
  aqiData, weatherData, rainfallData, trafficData,
  socialData, systemStats, anomalyTimeline, initialAlerts
} from '../data/mockData';

// ── CONFIG ────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WAQI_TOKEN  = import.meta.env.VITE_WAQI_TOKEN  || 'demo';
const OWM_KEY     = import.meta.env.VITE_OWM_KEY     || '';
const TOMTOM_KEY  = import.meta.env.VITE_TOMTOM_KEY  || '';

const api = axios.create({ baseURL: BACKEND_URL, timeout: 8000 });

// ── AQI ──────────────────────────────────────────────────
export async function fetchAQI(city = 'dehradun') {
  // LIVE: return (await axios.get(`https://api.waqi.info/feed/${city}/?token=${WAQI_TOKEN}`)).data.data;
  return aqiData;
}

// ── WEATHER ──────────────────────────────────────────────
export async function fetchWeather(lat = 30.3165, lon = 78.0322) {
  // LIVE:
  // const r = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
  //   params: { latitude: lat, longitude: lon, timezone: 'Asia/Kolkata',
  //     current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,visibility' }
  // });
  // return r.data.current;
  return weatherData;
}

// ── RAINFALL / FLOOD ────────────────────────────────────
export async function fetchFlood(lat = 30.3165, lon = 78.0322) {
  // LIVE:
  // const r = await axios.get(`https://flood-api.open-meteo.com/v1/flood`, {
  //   params: { latitude: lat, longitude: lon, daily: 'river_discharge' }
  // });
  // return r.data.daily;
  return rainfallData;
}

// ── TRAFFIC ──────────────────────────────────────────────
export async function fetchTraffic(lat = 30.3165, lon = 78.0322) {
  // LIVE:
  // const r = await axios.get(
  //   `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`,
  //   { params: { point: `${lat},${lon}`, key: TOMTOM_KEY } }
  // );
  // return r.data.flowSegmentData;
  return trafficData;
}

// ── SOCIAL SIGNALS ───────────────────────────────────────
export async function fetchSocialSignals() {
  // LIVE: return (await api.get('/api/social')).data;
  return socialData;
}

// ── SYSTEM STATS ─────────────────────────────────────────
export async function fetchSystemStats() {
  // LIVE: return (await api.get('/api/stats')).data;
  return systemStats;
}

// ── ANOMALY TIMELINE ─────────────────────────────────────
export async function fetchAnomalies(range = '24h') {
  // LIVE: return (await api.get(`/api/anomalies?range=${range}`)).data;
  return anomalyTimeline;
}

// ── ALERTS ───────────────────────────────────────────────
export async function fetchAlerts(limit = 10) {
  // LIVE: return (await api.get(`/api/alerts?limit=${limit}`)).data;
  return initialAlerts;
}

// ── WEBSOCKET (real-time alerts) ─────────────────────────
export function connectAlertSocket(onMessage) {
  // LIVE:
  // const ws = new WebSocket(`${BACKEND_URL.replace('http','ws')}/ws/alerts`);
  // ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  // return ws;

  // MOCK: simulate incoming alerts every 12 seconds
  // const { incomingAlertQueue } = require('../data/mockData');
  // since vite uses ESM we can't do require easily here. We'll import it correctly instead.
  let idx = 0;
  let interval;
  
  import('../data/mockData').then(({ incomingAlertQueue }) => {
    interval = setInterval(() => {
      onMessage(incomingAlertQueue[idx % incomingAlertQueue.length]);
      idx++;
    }, 12000);
  });
  
  return { close: () => clearInterval(interval) };
}
