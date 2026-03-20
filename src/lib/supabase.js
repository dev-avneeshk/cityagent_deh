// ============================================================
// Supabase client — PostgreSQL database via Supabase
//
// Tables:
//   city_snapshots  — live AQI/weather/flood readings every 60s
//   chat_logs       — CityAgent AI chatbot conversations
//   alerts_history  — triggered alerts log (deduped per hour)
//
// Gracefully disabled when env vars are not set.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_ANON
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

export const DB_ENABLED = Boolean(supabase);
