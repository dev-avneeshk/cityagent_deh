// ============================================================
// CityAgent AI — Llama 3.1 8B via NVIDIA NIM
// ============================================================

import { dehradunZones, dehradunLocalities } from '../data/mockData';

const KIMI_API_URL = '/api/kimi';
const KIMI_API_KEY = import.meta.env.VITE_KIMI_API_KEY || '';

// ── Rate limiter: max 10 requests per minute, min 2s between requests ────────
const RATE_WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const MIN_GAP_MS     = 2_000;
const _timestamps    = [];

export function checkRateLimit() {
  const now = Date.now();
  // Drop timestamps older than the window
  while (_timestamps.length && now - _timestamps[0] > RATE_WINDOW_MS) _timestamps.shift();

  if (_timestamps.length >= MAX_PER_WINDOW)
    return `Rate limit reached (${MAX_PER_WINDOW} messages/min). Wait ${Math.ceil((RATE_WINDOW_MS - (now - _timestamps[0])) / 1000)}s.`;

  const last = _timestamps[_timestamps.length - 1];
  if (last && now - last < MIN_GAP_MS)
    return `Slow down — wait ${Math.ceil((MIN_GAP_MS - (now - last)) / 1000)}s before sending again.`;

  _timestamps.push(now);
  return null; // allowed
}

// ── System prompt — includes per-zone AQI so AI knows area-level data ────────
export function buildCityContext(city, data, alerts, userCoords = null, userLocData = null) {
  if (!data) return `You are CityAgent AI for ${city?.name}. No live data yet.`;

  const { aqi, weather, flood, traffic, social } = data;
  const criticals = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 3);

  const zones = dehradunZones?.length
    ? `Monitored zone AQI: ${dehradunZones.map(z => `${z.name} ${z.aqi}(${z.status})`).join(', ')}`
    : `Overall AQI: ${aqi.value}`;

  // Build locality knowledge: name → distance + description (condensed for prompt)
  const localityIndex = dehradunLocalities?.length
    ? dehradunLocalities.map(l => `${l.name}(${l.distKm}km,${l.type})`).join('; ')
    : '';

  // Distance from user to city center (rough km)
  const userLocationLine = userCoords
    ? (() => {
        const dist = Math.sqrt((userCoords.lat - city.lat) ** 2 + (userCoords.lon - city.lon) ** 2) * 111;
        const nearestZone = dehradunZones?.length
          ? dehradunZones.reduce((best, z) => {
              const d = Math.sqrt((userCoords.lat - z.lat) ** 2 + (userCoords.lon - z.lng) ** 2);
              return d < Math.sqrt((userCoords.lat - best.lat) ** 2 + (userCoords.lon - best.lng) ** 2) ? z : best;
            })
          : null;
        const locLine = `User GPS: ${userCoords.lat.toFixed(5)}°N, ${userCoords.lon.toFixed(5)}°E — ${dist.toFixed(1)}km from ${city.name} center${nearestZone ? `, nearest zone: ${nearestZone.name} (AQI ${nearestZone.aqi}, ${nearestZone.status})` : ''}`;
        // If we fetched real AQI/weather for the exact GPS, include it
        const realLocal = userLocData
          ? `\nLive data AT USER'S EXACT LOCATION: AQI ${userLocData.aqi?.value} (${userLocData.aqi?.category}), PM2.5 ${userLocData.aqi?.components?.pm25}µg/m³, ${userLocData.weather?.temperature}°C ${userLocData.weather?.condition}, humidity ${userLocData.weather?.humidity}%`
          : '';
        return locLine + realLocal;
      })()
    : null;

  // Find locality details for a specific name query (used for existence checks)
  const findLocality = (name) => {
    if (!dehradunLocalities?.length || !name) return null;
    const q = name.toLowerCase().replace(/\s+/g, '');
    return dehradunLocalities.find(l => l.name.toLowerCase().replace(/\s+/g, '').includes(q) || q.includes(l.name.toLowerCase().replace(/\s+/g, '')));
  };

  return `CityAgent AI — ${city.name} live dashboard. Answer concisely and directly using the data below.
${userLocationLine ? `\n${userLocationLine}` : ''}
AQI ${aqi.value} (${aqi.category}), PM2.5 ${aqi.components?.pm25}µg/m³, PM10 ${aqi.components?.pm10}µg/m³, dominant: ${aqi.dominantPollutant}
${zones}
Weather: ${weather.temperature}°C ${weather.condition}, humidity ${weather.humidity}%, wind ${weather.windSpeed}m/s ${weather.windDirection}, visibility ${weather.visibility}km
Flood: ${flood.floodRisk} risk, river ${flood.riverDischarge}m³/s (30d max ${flood.riverDischargeMax30d}m³/s), 24h rain ${flood.last24h}mm
Traffic: ${traffic.congestionLevel} at ${traffic.hotspot}, ${traffic.currentSpeed}km/h (free-flow ${traffic.freeFlowSpeed}km/h)${traffic.incidents?.length ? `, incidents: ${traffic.incidents.map(i => i.location).join(', ')}` : ''}
Alerts (${alerts.length}): ${criticals.map(a => `[${a.severity}] ${a.message}`).join(' | ') || 'none critical'}
Social: ${social.signalCount} signals, top issues: ${social.topKeywords?.slice(0, 4).join(', ')}

CITY GEOGRAPHY — All known localities in Dehradun district (name, distance from Clock Tower, type):
${localityIndex}

Locality details (for existence/info queries):
${dehradunLocalities?.map(l => `• ${l.name} — ${l.distKm}km from centre, ${l.type}: ${l.desc}`).join('\n') || ''}

Rules:
- If asked whether an area/locality EXISTS in Dehradun, search the locality list above and confirm with its distance and description. NEVER say an area doesn't exist if it is in the list above.
- For areas NOT in the list, say "I don't have this locality in my Dehradun database — it may be a very small village or outside the district."
- For locality-specific AQI/weather, use city-wide data as a baseline and note that the nearest monitored zone is the closest reference.
- Give direct answers in 2-4 sentences. When user GPS is available, reference their nearest zone and distance.`;
}

// ── Streaming chat ─────────────────────────────────────────────────────────
export async function* streamKimiChat(messages, systemPrompt) {
  if (!KIMI_API_KEY) {
    yield '⚠️ No API key found. Add `VITE_KIMI_API_KEY` to your `.env` file.';
    return;
  }

  const response = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 400,
      temperature: 0.3,
      top_p: 0.9,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const token = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch { /* skip malformed SSE */ }
    }
  }
}

// ── Suggested questions based on live data ───────────────────────────────────
export function getSuggestedQuestions(data, alerts) {
  if (!data) return ['What does CityGen monitor?'];
  const { aqi, traffic } = data;
  const hasCritical = alerts.some(a => a.severity === 'critical');

  const questions = [];
  if (hasCritical)                                         questions.push('What critical issues need immediate attention?');
  if (aqi.value > 100)                                     questions.push('Is it safe to go outside today?');
  else                                                     questions.push('Which area has the worst air quality?');
  if (traffic.congestionLevel === 'Heavy' || traffic.congestionLevel === 'Standstill')
                                                           questions.push(`Best route to avoid traffic near ${traffic.hotspot}?`);
  else                                                     questions.push('Give me a full city health summary');
  if (aqi.value > 50)                                      questions.push("What's causing the elevated pollution?");
  questions.push('What should city officials prioritize today?');

  return questions.slice(0, 4);
}
