import React, { useState, useRef, useCallback } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

const AQI_ZONES = [
  { min: 0,   max: 50,  label: 'Good',              color: '#22c55e', desc: 'Satisfactory air. Enjoy outdoors!' },
  { min: 51,  max: 100, label: 'Moderate',           color: '#eab308', desc: 'Acceptable. Sensitive people may feel mild effects.' },
  { min: 101, max: 150, label: 'Unhealthy for Some', color: '#f97316', desc: 'Sensitive groups should limit prolonged outdoor exertion.' },
  { min: 151, max: 200, label: 'Unhealthy',          color: '#ef4444', desc: 'Everyone may begin to experience health effects.' },
  { min: 201, max: 300, label: 'Very Unhealthy',     color: '#a855f7', desc: 'Health alert — avoid outdoor activity.' },
  { min: 301, max: 500, label: 'Hazardous',          color: '#7c3aed', desc: 'Emergency conditions. Stay indoors.' },
];

function aqiToPercent(v) {
  if (v <= 50)  return (v / 50) * 17;
  if (v <= 100) return 17 + ((v - 50)  / 50)  * 16;
  if (v <= 150) return 33 + ((v - 100) / 50)  * 17;
  if (v <= 200) return 50 + ((v - 150) / 50)  * 17;
  return             67 + (Math.min(v - 200, 300) / 300) * 33;
}

function percentToAqi(pct) {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 17)  return Math.round((p / 17) * 50);
  if (p <= 33)  return Math.round(50  + ((p - 17) / 16) * 50);
  if (p <= 50)  return Math.round(100 + ((p - 33) / 17) * 50);
  if (p <= 67)  return Math.round(150 + ((p - 50) / 17) * 50);
  return              Math.round(200 + ((p - 67) / 33) * 300);
}

function getZone(aqi) {
  return AQI_ZONES.find(z => aqi >= z.min && aqi <= z.max) || AQI_ZONES[AQI_ZONES.length - 1];
}

const THUMB = 18; // thumb diameter px

export default function AQIGauge({ value, category, station, weather }) {
  const barRef = useRef(null);
  const controls = useAnimationControls();
  const pointerStartX = useRef(null);

  const originPct = aqiToPercent(value);

  const [isDragging, setIsDragging] = useState(false);
  const [dragAqi, setDragAqi] = useState(value);

  const getClampedPct = useCallback((clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return originPct;
    const originPx = (originPct / 100) * rect.width;
    const rawOffsetPx = clientX - pointerStartX.current;
    const newPx = Math.max(0, Math.min(rect.width, originPx + rawOffsetPx));
    return (newPx / rect.width) * 100;
  }, [originPct]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartX.current = e.clientX;
    controls.stop();
    setIsDragging(true);
    setDragAqi(value);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;

    const originPx = (originPct / 100) * rect.width;
    const rawOffsetPx = e.clientX - pointerStartX.current;
    // Clamp so thumb never goes past the bar edges
    const newPx = Math.max(0, Math.min(rect.width, originPx + rawOffsetPx));
    const clampedOffsetPx = newPx - originPx;

    controls.set({ x: clampedOffsetPx }); // instant move, no animation
    setDragAqi(percentToAqi((newPx / rect.width) * 100));
  };

  const onPointerUp = () => {
    setIsDragging(false);
    // Spring back to origin
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 350, damping: 22 } });
    setDragAqi(value);
  };

  const zone = getZone(isDragging ? dragAqi : value);

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 flex flex-col h-full overflow-hidden">
      <h2 className="text-[13px] font-semibold text-primary mb-1">Air Quality Index</h2>

      <div className="flex flex-col items-center mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[42px] font-semibold leading-none transition-colors duration-200" style={{ color: zone.color }}>
            {isDragging ? dragAqi : value}
          </span>
          <span className="text-[13px] font-semibold transition-colors duration-200" style={{ color: zone.color }}>
            {zone.label}
          </span>
        </div>
        <div className="text-[10px] text-primary-muted mt-1 text-center truncate w-full px-2" title={station}>
          {isDragging ? 'Drag · release to reset' : station}
        </div>
      </div>

      {/* Gradient bar + thumb */}
      <div className="w-full relative px-2 mb-1 select-none" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div
          ref={barRef}
          className="w-full h-3 rounded-full relative"
          style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7, #7c3aed)' }}
        >
          {/* Thumb — left is fixed at real AQI position; x from Framer does the dragging */}
          <motion.div
            animate={controls}
            className="absolute z-10"
            style={{
              top: '50%',
              left: `${originPct}%`,
              translateY: '-50%',
              translateX: '-50%',   // center the thumb on the point
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: '50%',
                border: '2.5px solid white',
                background: zone.color,
                transform: isDragging ? 'scale(1.3)' : 'scale(1)',
                transition: 'background 0.2s, transform 0.1s',
                boxShadow: isDragging
                  ? `0 0 0 5px ${zone.color}44, 0 4px 14px #00000077`
                  : '0 2px 6px #00000066',
              }}
            />

            {/* Tooltip while dragging */}
            {isDragging && (
              <div className="absolute bottom-full mb-2 left-1/2 pointer-events-none"
                   style={{ transform: 'translateX(-50%)', minWidth: 155 }}>
                <div className="bg-[#1a1e28] border border-[#ffffff1a] rounded-lg p-2.5 shadow-2xl text-center relative">
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1e28] border-b border-r border-[#ffffff1a] rotate-45" />
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: zone.color }} />
                    <span className="text-[12px] font-bold text-primary">{zone.label}</span>
                  </div>
                  <div className="font-mono text-[11px] text-primary-muted mb-1">AQI {zone.min}–{zone.max}</div>
                  <div className="text-[10px] text-primary leading-snug">{zone.desc}</div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex justify-between w-full px-2 text-[9px] text-primary-muted uppercase tracking-wider font-semibold mb-4">
        <span className="text-semantic-green">Good</span>
        <span className="text-semantic-yellow">Moderate</span>
        <span className="text-semantic-red">Hazardous</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <MiniStat label="Humidity"   value={weather?.humidity   ?? 83}  unit="%" iconColor="text-semantic-teal" />
        <MiniStat label="Pressure"   value={weather?.pressure   ?? 751} unit="mmHg" iconColor="text-primary-muted" />
        <MiniStat label="Wind"       value={weather?.windSpeed  ?? 0.9} unit={`m/s ${weather?.windDirection ?? 'E'}`} iconColor="text-primary-muted" />
        <MiniStat label="Visibility" value={weather?.visibility ?? 32}  unit="km" iconColor="text-primary-muted" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, iconColor }) {
  return (
    <div className="bg-bg-inner rounded-lg p-2 flex flex-col justify-center min-h-[44px]">
      <div className="text-[9px] uppercase font-semibold text-primary-muted tracking-wider mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[16px] font-semibold leading-none ${iconColor}`}>{value}</span>
        <span className="text-[10px] text-primary-muted">{unit}</span>
      </div>
    </div>
  );
}
