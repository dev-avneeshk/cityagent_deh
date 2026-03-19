// ============================================================
// CityAgent — Telegram Update Sender
// Sends formatted city news to @cityagentdh every 5 minutes
// ============================================================

import { dehradunZones } from '../data/mockData';

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID   || '@cityagentdh';
const API_URL   = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// ── News generator based on live dashboard data ───────────────────────────────
function generateNewsItems(city, data, alerts) {
  if (!data) return [];
  const { aqi, weather, flood, traffic, social } = data;
  const items = [];

  // 1. Air quality headline
  const worstZone = dehradunZones?.length
    ? [...dehradunZones].sort((a, b) => b.aqi - a.aqi)[0]
    : null;

  if (aqi.value > 150)
    items.push(`🔴 <b>Air Quality ALERT</b> — AQI ${aqi.value} (${aqi.category}) in ${city.name}. PM2.5 ${aqi.components?.pm25}µg/m³ — ${Math.round(aqi.components?.pm25 / 15)}× WHO limit. Avoid outdoor activity.`);
  else if (aqi.value > 100)
    items.push(`🟠 <b>Air Quality Warning</b> — AQI ${aqi.value} (${aqi.category}) in ${city.name}. Sensitive groups should limit outdoor exposure.`);
  else
    items.push(`🟢 <b>Air Quality</b> — AQI ${aqi.value} (${aqi.category}) in ${city.name}. PM2.5 ${aqi.components?.pm25}µg/m³, dominant: ${aqi.dominantPollutant}.`);

  // 2. Worst zone callout
  if (worstZone)
    items.push(`📍 <b>Worst zone</b>: ${worstZone.name} with AQI ${worstZone.aqi} (${worstZone.status}). Best zone: ${[...dehradunZones].sort((a,b) => a.aqi - b.aqi)[0].name} at AQI ${[...dehradunZones].sort((a,b) => a.aqi - b.aqi)[0].aqi}.`);

  // 3. Traffic
  if (traffic.congestionLevel === 'Heavy' || traffic.congestionLevel === 'Standstill')
    items.push(`🚦 <b>Traffic Alert</b> — ${traffic.congestionLevel} congestion at ${traffic.hotspot}. Speed ${traffic.currentSpeed} km/h vs ${traffic.freeFlowSpeed} km/h free-flow. ${traffic.incidents?.length ? `Incidents: ${traffic.incidents.map(i => i.location).join(', ')}.` : ''}`);
  else
    items.push(`🚗 <b>Traffic</b> — ${traffic.congestionLevel} flow near ${traffic.hotspot}. ${traffic.vehiclesPerHour?.toLocaleString()} vehicles/hr.`);

  // 4. Weather
  items.push(`🌤 <b>Weather</b> — ${weather.temperature}°C, ${weather.condition}. Humidity ${weather.humidity}%, wind ${weather.windSpeed} m/s ${weather.windDirection}, visibility ${weather.visibility} km.`);

  // 5. Flood / hydrology
  if (flood.floodRisk === 'High' || flood.floodRisk === 'Critical')
    items.push(`💧 <b>Flood Warning</b> — ${flood.floodRisk} risk. River discharge ${flood.riverDischarge} m³/s (30d max ${flood.riverDischargeMax30d} m³/s). Monitor low-lying areas.`);
  else
    items.push(`💧 <b>Hydrology</b> — Flood risk ${flood.floodRisk}. River discharge ${flood.riverDischarge} m³/s — well within safe range.`);

  // 6. Social signals / citizen reports
  if (social.signalCount > 60)
    items.push(`📣 <b>Citizen Reports</b> — ${social.signalCount} signals on Twitter + Reddit. Top issues: ${social.topKeywords?.slice(0,3).join(', ')}. ${social.recentPosts?.[0]?.text || ''}`);

  // 7. Critical alerts
  const criticals = alerts.filter(a => a.severity === 'critical');
  if (criticals.length)
    items.push(`🚨 <b>${criticals.length} Critical Alert${criticals.length > 1 ? 's' : ''}</b> — ${criticals.map(a => a.message).join(' | ')}`);

  return items;
}

// ── Format full Telegram HTML message ─────────────────────────────────────────
export function formatTelegramMessage(city, data, alerts) {
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
  });

  const newsItems = generateNewsItems(city, data, alerts);
  const body = newsItems.map(item => `• ${item}`).join('\n\n');

  return `🏙 <b>CityAgent Update — ${city.name}</b>
🕐 ${now} IST

${body}

━━━━━━━━━━━━━━━━━━
📡 <i>Live data from CityGen Dashboard</i>
🔗 <a href="https://t.me/cityagentdh">@cityagentdh</a>`;
}

// ── Send to Telegram ───────────────────────────────────────────────────────────
export async function sendTelegramUpdate(city, data, alerts) {
  if (!BOT_TOKEN) throw new Error('No VITE_TELEGRAM_BOT_TOKEN in .env');

  const text = formatTelegramMessage(city, data, alerts);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram error: ${json.description}`);
  return json;
}
