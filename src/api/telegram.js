// ============================================================
// CityAgent — Telegram Update Sender
// Sends formatted city news to @cityagentdh every 5 minutes
// ============================================================

import { dehradunZones } from '../data/mockData';

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID   || '@cityagentdh';
const API_URL   = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// ── Alternate route suggestions keyed by hotspot name ─────────────────────────
const ALTERNATE_ROUTES = {
  'Rajpur Road':      { via: 'Turner Road → EC Road', saves: '~12 min' },
  'Clock Tower':      { via: 'Paltan Bazaar → Astley Hall', saves: '~8 min' },
  'ISBT Bypass':      { via: 'Ring Road (Saharanpur Rd side)', saves: '~10 min' },
  'Haridwar Bypass':  { via: 'Rishikesh Road → NH-58', saves: '~15 min' },
  'Saharanpur Road':  { via: 'Shimla Bypass → Canal Road', saves: '~9 min' },
  'Prem Nagar':       { via: 'Ballupur Chowk → GMS Road', saves: '~7 min' },
};

// ── AQI health advisories ──────────────────────────────────────────────────────
function aqiAdvisory(aqiValue) {
  if (aqiValue > 200) return '🚫 Hazardous — stay indoors, wear N95 if outside.';
  if (aqiValue > 150) return '😷 Unhealthy — avoid outdoor exercise, use mask.';
  if (aqiValue > 100) return '⚠️ Sensitive groups limit outdoor exposure.';
  if (aqiValue > 50)  return '🟡 Moderate — generally safe, some precaution advised.';
  return '✅ Good — safe for all outdoor activities.';
}

// ── Build "Areas to Avoid" block ──────────────────────────────────────────────
function buildAvoidBlock(data, alerts) {
  const avoidItems = [];

  const { traffic, aqi } = data;

  // 1. Traffic congestion hotspot + alternate route
  if (traffic.congestionLevel === 'Heavy' || traffic.congestionLevel === 'Standstill') {
    const alt = ALTERNATE_ROUTES[traffic.hotspot];
    avoidItems.push(`🚦 <b>${traffic.hotspot}</b> — ${traffic.congestionLevel} traffic (${traffic.currentSpeed} km/h). ${alt ? `Use <i>${alt.via}</i>, saves ${alt.saves}.` : 'Seek alternate routes.'}`);
  }

  // 2. Traffic incidents
  if (traffic.incidents?.length) {
    traffic.incidents.forEach(inc => {
      const alt = ALTERNATE_ROUTES[inc.location];
      avoidItems.push(`🚧 <b>${inc.location}</b> — ${inc.type} (${inc.severity} severity). ${alt ? `Alternate: <i>${alt.via}</i>.` : 'Expect delays.'}`);
    });
  }

  // 3. High-AQI zones from zone data
  const badAQIZones = dehradunZones?.filter(z => z.aqi > 140) ?? [];
  badAQIZones.forEach(z => {
    avoidItems.push(`💨 <b>${z.name}</b> — AQI ${z.aqi} (${z.status}). Avoid jogging/outdoor exercise here.`);
  });

  // 4. Flood / waterlogging alerts from alert feed
  const waterAlerts = alerts.filter(a =>
    a.message?.toLowerCase().match(/flood|waterlog|drainage|overflow|river/)
  );
  waterAlerts.forEach(a => {
    avoidItems.push(`🌊 <b>Waterlogging risk</b> — ${a.message}. Avoid low-lying routes nearby.`);
  });

  // 5. Citizen-reported road issues
  const roadAlerts = alerts.filter(a =>
    a.message?.toLowerCase().match(/pothole|road damage|construction/)
  );
  roadAlerts.forEach(a => {
    avoidItems.push(`🕳 <b>Road hazard</b> — ${a.message}.`);
  });

  return avoidItems;
}

// ── Build smart health / advisory alerts block ────────────────────────────────
function buildAdvisoryBlock(data, intel) {
  const advisories = [];
  const { aqi, weather, flood } = data;

  // AQI health advisory
  advisories.push(`🫁 <b>Air Health</b> — ${aqiAdvisory(aqi.value)} (AQI ${aqi.value}, PM2.5 ${aqi.components?.pm25}µg/m³)`);

  // Dust alert if elevated
  if (aqi.components?.dust > 80) {
    advisories.push(`🌫 <b>Dust Alert</b> — Dust ${aqi.components.dust}µg/m³ (elevated). Pre-monsoon dust event. Keep windows closed.`);
  }

  // Heat stress
  if (intel?.heatLevel === 'Danger' || intel?.heatLevel === 'Extreme') {
    advisories.push(`🌡 <b>Heat Stress ${intel.heatLevel}</b> — Feels like ${intel.apparentTemp}°C. Stay hydrated, avoid peak sun hours (12–4 PM).`);
  }

  // Flood precursor
  if (intel?.floodPrecursor === 'Warning') {
    advisories.push(`🌧 <b>Flood Precursor Warning</b> — River discharge at ${intel.dischargeRatioPct}% of 30-day max. Residents near Rispana/Bindal should stay alert.`);
  } else if (intel?.floodPrecursor === 'Watch') {
    advisories.push(`💧 <b>Flood Watch</b> — River discharge at ${intel.dischargeRatioPct}% of 30-day max. Monitor updates.`);
  }

  // Low visibility
  if (weather.visibility < 5) {
    advisories.push(`🌁 <b>Low Visibility</b> — Only ${weather.visibility} km. Drive slow, use fog lights, avoid highway night driving.`);
  }

  // Strong wind
  if (weather.windSpeed > 7) {
    advisories.push(`💨 <b>Strong Wind</b> — ${weather.windSpeed} m/s from ${weather.windDirection}. Secure loose objects, avoid high-rise terraces.`);
  }

  return advisories;
}

// ── News generator based on live dashboard data ───────────────────────────────
function generateNewsItems(city, data, alerts, intel) {
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
    items.push(`📣 <b>Citizen Reports</b> — ${social.signalCount} Reddit signals. Top issues: ${social.topKeywords?.slice(0,3).join(', ')}. ${social.recentPosts?.[0]?.text || ''}`);

  // 7. Critical alerts
  const criticals = alerts.filter(a => a.severity === 'critical');
  if (criticals.length)
    items.push(`🚨 <b>${criticals.length} Critical Alert${criticals.length > 1 ? 's' : ''}</b> — ${criticals.map(a => a.message).join(' | ')}`);

  return items;
}

// ── Format full Telegram HTML message ─────────────────────────────────────────
export function formatTelegramMessage(city, data, alerts, intel) {
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
  });

  const newsItems   = generateNewsItems(city, data, alerts, intel);
  const avoidItems  = buildAvoidBlock(data, alerts);
  const advisories  = buildAdvisoryBlock(data, intel);

  const body = newsItems.map(item => `• ${item}`).join('\n\n');

  const avoidBlock = avoidItems.length
    ? `\n\n🚫 <b>AREAS &amp; ROUTES TO AVOID RIGHT NOW</b>\n${avoidItems.map(i => `⛔ ${i}`).join('\n')}`
    : '';

  const advisoryBlock = advisories.length
    ? `\n\n⚠️ <b>HEALTH &amp; SAFETY ADVISORIES</b>\n${advisories.map(i => `• ${i}`).join('\n')}`
    : '';

  // City Breath Score summary line
  const breathLine = intel
    ? `🫧 City Breath Score: <b>${intel.breathScore}/100</b> · AQI trend: <b>${intel.trajectory}</b>${intel.trajectoryPct > 0 ? ` (${intel.trajectoryPct}%)` : ''}`
    : '';

  return `🏙 <b>CityAgent Update — ${city.name}</b>
🕐 ${now} IST${breathLine ? `\n${breathLine}` : ''}

${body}${avoidBlock}${advisoryBlock}

━━━━━━━━━━━━━━━━━━
📡 <i>Live data from CityGen Dashboard</i>
🔗 <a href="https://t.me/cityagentdh">@cityagentdh</a>`;
}

// ── Send to Telegram ───────────────────────────────────────────────────────────
export async function sendTelegramUpdate(city, data, alerts, intel) {
  if (!BOT_TOKEN) throw new Error('No VITE_TELEGRAM_BOT_TOKEN in .env');

  const text = formatTelegramMessage(city, data, alerts, intel);

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
