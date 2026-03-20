// ============================================================
// Database API — Supabase (PostgreSQL) operations
//
// All functions are fire-and-forget safe: they never throw,
// never block the UI, and silently skip when DB is not configured.
//
// Usage:
//   logCitySnapshot(cityName, lat, lon, { aqi, weather, flood })
//   logAlert(cityName, alert)
//   logChat(sessionId, cityName, role, content)
// ============================================================

import { supabase, DB_ENABLED } from '../lib/supabase';

// ── City Snapshots ────────────────────────────────────────────────────────────
// Writes one row per 60s poll cycle per city.
// Used for historical trend charts and anomaly detection.

export async function logCitySnapshot(cityName, lat, lon, { aqi, weather, flood } = {}) {
  if (!DB_ENABLED) return;
  try {
    await supabase.from('city_snapshots').insert({
      city_name:        cityName,
      lat,
      lon,
      aqi_value:        aqi?.value        ?? null,
      aqi_category:     aqi?.category     ?? null,
      pm25:             aqi?.components?.pm25 ?? null,
      pm10:             aqi?.components?.pm10 ?? null,
      temperature:      weather?.temperature  ?? null,
      humidity:         weather?.humidity     ?? null,
      precipitation:    weather?.precipitation ?? null,
      wind_speed:       weather?.windSpeed    ?? null,
      wind_direction:   weather?.windDirection ?? null,
      condition:        weather?.condition    ?? null,
      flood_risk:       flood?.floodRisk      ?? null,
      river_discharge:  flood?.riverDischarge ?? null,
      recorded_at:      new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[DB] logCitySnapshot failed:', err.message);
  }
}

// ── Alerts History ────────────────────────────────────────────────────────────
// Logs each alert once per hour per city+message combination.
// Prevents duplicate rows from the 60s polling interval.

const _loggedAlerts = new Map(); // key → timestamp (in-memory dedup within session)

export async function logAlerts(cityName, alerts = []) {
  if (!DB_ENABLED || !alerts.length) return;
  const now = Date.now();
  const DEDUP_WINDOW = 60 * 60_000; // 1 hour

  const newAlerts = alerts.filter(a => {
    const key = `${cityName}|${a.message}`;
    const last = _loggedAlerts.get(key);
    if (last && now - last < DEDUP_WINDOW) return false;
    _loggedAlerts.set(key, now);
    return true;
  });

  if (!newAlerts.length) return;

  try {
    await supabase.from('alerts_history').insert(
      newAlerts.map(a => ({
        city_name:    cityName,
        severity:     a.severity,
        message:      a.message,
        source:       a.source   ?? null,
        triggered_at: new Date().toISOString(),
      }))
    );
  } catch (err) {
    console.warn('[DB] logAlerts failed:', err.message);
  }
}

// ── Chat Logs ─────────────────────────────────────────────────────────────────
// Logs each user message and AI reply pair.
// session_id is generated once per page load in ChatBot.jsx.

export async function logChat(sessionId, cityName, role, content) {
  if (!DB_ENABLED || !content?.trim()) return;
  try {
    await supabase.from('chat_logs').insert({
      session_id: sessionId,
      city_name:  cityName,
      role,           // 'user' | 'assistant'
      content:    content.slice(0, 4000), // cap at 4KB
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[DB] logChat failed:', err.message);
  }
}

// ── Fetch Historical Snapshots (for future trend charts) ─────────────────────

export async function fetchSnapshots(cityName, hours = 24) {
  if (!DB_ENABLED) return [];
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('city_snapshots')
    .select('recorded_at, aqi_value, temperature, river_discharge, precipitation')
    .eq('city_name', cityName)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) return [];
  return data;
}
