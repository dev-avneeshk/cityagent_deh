-- ============================================================
-- CityAgent Database Schema — Supabase (PostgreSQL)
--
-- Setup:
--   1. Go to https://supabase.com → New Project
--   2. Open SQL Editor → paste this file → Run
--   3. Copy Project URL + anon key to .env:
--        VITE_SUPABASE_URL=https://xxxx.supabase.co
--        VITE_SUPABASE_ANON_KEY=eyJhbGc...
-- ============================================================


-- ── 1. City Snapshots ─────────────────────────────────────────────────────────
-- Stores one row every 60 seconds per active city.
-- Powers historical trend charts and anomaly detection.

CREATE TABLE IF NOT EXISTS city_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  city_name        TEXT            NOT NULL,
  lat              DOUBLE PRECISION,
  lon              DOUBLE PRECISION,

  -- Air Quality
  aqi_value        INTEGER,
  aqi_category     TEXT,
  pm25             DOUBLE PRECISION,   -- µg/m³
  pm10             DOUBLE PRECISION,   -- µg/m³

  -- Weather
  temperature      DOUBLE PRECISION,   -- °C
  humidity         INTEGER,            -- %
  precipitation    DOUBLE PRECISION,   -- mm/h
  wind_speed       DOUBLE PRECISION,   -- m/s
  wind_direction   TEXT,
  condition        TEXT,               -- "Clear", "Rain", etc.

  -- Flood / Hydrology
  flood_risk       TEXT,               -- "Low" | "Medium" | "High" | "Critical"
  river_discharge  DOUBLE PRECISION,   -- m³/s

  recorded_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast time-range queries per city
CREATE INDEX IF NOT EXISTS idx_snapshots_city_time
  ON city_snapshots (city_name, recorded_at DESC);

-- Auto-delete rows older than 30 days (keeps DB lean)
-- Enable pg_cron extension in Supabase Dashboard first, then:
-- SELECT cron.schedule('cleanup-snapshots', '0 3 * * *',
--   $$DELETE FROM city_snapshots WHERE recorded_at < NOW() - INTERVAL '30 days'$$);


-- ── 2. Alerts History ─────────────────────────────────────────────────────────
-- Logs every unique alert triggered by live sensor data.
-- Deduplicated in application code (same message+city within 1 hour → skipped).

CREATE TABLE IF NOT EXISTS alerts_history (
  id           BIGSERIAL PRIMARY KEY,
  city_name    TEXT        NOT NULL,
  severity     TEXT        NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message      TEXT        NOT NULL,
  source       TEXT,                  -- "Open-Meteo AQI", "Google News", etc.
  triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_city_time
  ON alerts_history (city_name, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity
  ON alerts_history (severity, triggered_at DESC);


-- ── 3. Chat Logs ──────────────────────────────────────────────────────────────
-- Stores every user message + AI reply from the CityAgent chatbot.
-- session_id groups one browser session (UUID generated on page load).

CREATE TABLE IF NOT EXISTS chat_logs (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT        NOT NULL,
  city_name   TEXT,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_session
  ON chat_logs (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_city
  ON chat_logs (city_name, created_at DESC);


-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
-- The anon key is public (embedded in frontend), so we restrict it to INSERT
-- and SELECT only — no DELETE, no UPDATE from the browser.

ALTER TABLE city_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs       ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can insert
CREATE POLICY "anon insert snapshots" ON city_snapshots  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert alerts"    ON alerts_history  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert chats"     ON chat_logs       FOR INSERT TO anon WITH CHECK (true);

-- Anyone can read (for future public dashboards / analytics)
CREATE POLICY "anon read snapshots"   ON city_snapshots  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read alerts"      ON alerts_history  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read chats"       ON chat_logs       FOR SELECT TO anon USING (true);
