import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Blinking "You Are Here" icon
const pulseIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;margin-left:-16px;margin-top:-16px">
      <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:#3b82f6;opacity:0.45;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 0 12px rgba(59,130,246,0.9);"></div>
    </div>
    <style>@keyframes ping{75%,to{transform:scale(2);opacity:0}}</style>
  `,
  iconSize: [0, 0],
});

// Smoothly fly to new city
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] && center[1]) {
      map.flyTo(center, 13, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// Generate 20 monitoring zones spread around a city center
function generateZones(lat, lon, baseAQI = 60) {
  // Offsets in degrees (~0.01° ≈ 1 km)
  const offsets = [
    { dx: 0.02, dy: 0.01, name: 'City Centre',       aqi: baseAQI },
    { dx: -0.05, dy: 0.03, name: 'North Zone',        aqi: Math.round(baseAQI * 0.85) },
    { dx: 0.06, dy: -0.04, name: 'East Industrial',   aqi: Math.round(baseAQI * 1.35) },
    { dx: -0.06, dy: -0.05, name: 'South Market',     aqi: Math.round(baseAQI * 1.1) },
    { dx: 0.07, dy: 0.07, name: 'Northeast Sector',   aqi: Math.round(baseAQI * 0.75) },
    { dx: -0.08, dy: 0.06, name: 'Northwest Park',    aqi: Math.round(baseAQI * 0.65) },
    { dx: 0.04, dy: -0.09, name: 'South Residential', aqi: Math.round(baseAQI * 0.90) },
    { dx: -0.03, dy: -0.08, name: 'West Junction',    aqi: Math.round(baseAQI * 1.2) },
    { dx: 0.10, dy: 0.00, name: 'East Bypass',        aqi: Math.round(baseAQI * 1.45) },
    { dx: -0.10, dy: 0.00, name: 'West Outskirts',    aqi: Math.round(baseAQI * 0.70) },
    { dx: 0.00, dy: 0.10, name: 'North Highway',      aqi: Math.round(baseAQI * 1.05) },
    { dx: 0.00, dy: -0.10, name: 'South Highway',     aqi: Math.round(baseAQI * 0.95) },
    { dx: 0.08, dy: -0.07, name: 'SE Industrial',     aqi: Math.round(baseAQI * 1.55) },
    { dx: -0.07, dy: 0.08, name: 'NW Residential',    aqi: Math.round(baseAQI * 0.60) },
    { dx: 0.12, dy: 0.05, name: 'Far East',           aqi: Math.round(baseAQI * 0.80) },
    { dx: -0.12, dy: -0.04, name: 'Far West',         aqi: Math.round(baseAQI * 1.15) },
    { dx: 0.05, dy: 0.12, name: 'Northern Forest',    aqi: Math.round(baseAQI * 0.50) },
    { dx: -0.04, dy: -0.12, name: 'Southern Plains',  aqi: Math.round(baseAQI * 1.00) },
    { dx: 0.14, dy: -0.02, name: 'East Fringe',       aqi: Math.round(baseAQI * 1.25) },
    { dx: -0.14, dy: 0.02, name: 'West Fringe',       aqi: Math.round(baseAQI * 0.88) },
  ];

  return offsets.map((z, i) => ({
    id: i,
    lat: lat + z.dx,
    lng: lon + z.dy,
    name: z.name,
    aqi: z.aqi,
    status: z.aqi <= 50 ? 'good' : z.aqi <= 100 ? 'moderate' : 'critical',
  }));
}

function getStatusColor(status) {
  if (status === 'good')     return '#22c55e';
  if (status === 'moderate') return '#f97316';
  return '#ef4444';
}

export default function MapPanel({ city = { name: 'Dehradun', lat: 30.3165, lon: 78.0322 }, aqiValue = 60 }) {
  const center = [city.lat, city.lon];

  // Re-generate 20 zones every time the city changes
  const zones = useMemo(() => generateZones(city.lat, city.lon, aqiValue), [city.lat, city.lon, aqiValue]);

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl overflow-hidden flex flex-col h-full relative z-0">
      <div className="absolute top-0 left-0 right-0 z-[400] bg-gradient-to-b from-bg-card to-transparent p-4 flex justify-between items-center pointer-events-none">
        <h2 className="text-[13px] font-semibold text-primary pointer-events-auto flex items-center gap-2">
          <span>Live City Map</span>
          <span className="text-primary-muted font-normal">— {city.name}</span>
        </h2>
        <div className="flex items-center gap-3 text-[10px] pointer-events-auto">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-semantic-green"></span>Good</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-semantic-orange"></span>Moderate</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-semantic-red"></span>Critical</span>
        </div>
      </div>

      <div className="flex-1 w-full h-full">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', background: '#0d0f14' }} zoomControl={false}>
          <MapUpdater center={center} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Blinking center location marker */}
          <Marker position={center} icon={pulseIcon}>
            <Popup>
              <div className="text-gray-900 font-sans text-xs">
                <strong>{city.name}</strong><br />
                Current Tracking Center
              </div>
            </Popup>
          </Marker>

          {/* 20 Dynamic AQI monitor zones */}
          {zones.map(zone => (
            <CircleMarker
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={7}
              pathOptions={{ fillColor: getStatusColor(zone.status), fillOpacity: 0.75, color: 'transparent' }}
            >
              <Popup>
                <div className="text-gray-900 font-sans text-xs">
                  <strong>{zone.name}</strong><br />
                  AQI: <strong>{zone.aqi}</strong> — {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
