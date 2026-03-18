import React from 'react';

export default function AQIGauge({ value, category, station }) {
  // Map 0-300 AQI to 0-100% position on gradient bar
  let position = 0;
  if (value <= 50) position = (value / 50) * 17;
  else if (value <= 100) position = 17 + ((value - 50) / 50) * 16;
  else if (value <= 150) position = 33 + ((value - 100) / 50) * 17;
  else if (value <= 200) position = 50 + ((value - 150) / 50) * 17;
  else position = 67 + (Math.min(value - 200, 100) / 100) * 33;

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-5 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-primary mb-3">Air Quality Index</h2>
      
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[42px] font-semibold text-semantic-orange leading-none">{value}</span>
          <span className="text-[14px] font-semibold text-semantic-orange">{category}</span>
        </div>
        <div className="text-[11px] text-primary-muted mt-1 text-center">
          PM2.5 dominant · {station}
        </div>
      </div>

      <div className="w-full relative px-2 mb-2">
        <div 
          className="w-full h-1.5 rounded-full relative" 
          style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }}
        >
          <div 
            className="absolute top-1/2 -translate-y-1/2 -ml-[6px] w-[12px] h-[12px] rounded-full bg-white border-2 border-bg-deep shadow-sm transition-all duration-700" 
            style={{ left: `${position}%` }}
          />
        </div>
      </div>
      
      <div className="flex justify-between w-full px-2 text-[10px] text-primary-muted uppercase tracking-wider font-semibold mb-6">
        <span className="text-semantic-green">Good</span>
        <span className="text-semantic-yellow">Moderate</span>
        <span className="text-semantic-red">Hazardous</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <MiniStat label="Humidity" value="83" unit="%" iconColor="text-semantic-teal" />
        <MiniStat label="Pressure" value="751" unit="mmHg" iconColor="text-primary-muted" />
        <MiniStat label="Wind" value="0.9" unit="m/s E" iconColor="text-primary-muted" />
        <MiniStat label="Visibility" value="32" unit="km" iconColor="text-primary-muted" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, iconColor }) {
  return (
    <div className="bg-bg-inner rounded-lg p-2.5 flex flex-col justify-center">
      <div className="text-[10px] uppercase font-semibold text-primary-muted tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[18px] font-semibold leading-none ${iconColor}`}>{value}</span>
        <span className="text-[11px] text-primary-muted">{unit}</span>
      </div>
    </div>
  );
}
