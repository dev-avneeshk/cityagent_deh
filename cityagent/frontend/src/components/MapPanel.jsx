import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { dehradunZones } from '../data/mockData';

export default function MapPanel() {
  const center = [30.3165, 78.0322];

  const getStatusColor = (status) => {
    if (status === 'good') return '#22c55e';
    if (status === 'moderate') return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl overflow-hidden flex flex-col h-full relative z-0">
      <div className="absolute top-0 left-0 right-0 z-[400] bg-gradient-to-b from-bg-card to-transparent p-4 flex justify-between items-center pointer-events-none">
        <h2 className="text-sm font-semibold text-primary pointer-events-auto">Live City Map</h2>
      </div>

      <div className="flex-1 w-full h-full">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', background: '#0d0f14' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {dehradunZones.map(zone => (
            <CircleMarker
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={8}
              pathOptions={{ fillColor: getStatusColor(zone.status), fillOpacity: 0.7, color: 'transparent' }}
            >
              <Popup>
                <div className="text-gray-900 font-sans">
                  <strong>{zone.name}</strong><br />
                  AQI: {zone.aqi} ({zone.status})
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
