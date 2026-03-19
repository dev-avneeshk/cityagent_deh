import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export default function RiskIntelligence({ intel, delay = 0 }) {
  const {
    breathScore, trajectory, trajectoryPct,
    heatLevel, apparentTemp,
    floodPrecursor, dischargeRatioPct,
  } = intel;

  const breathColor = breathScore >= 70 ? '#22c55e' : breathScore >= 40 ? '#eab308' : '#ef4444';
  const breathLabel = breathScore >= 70 ? 'Good' : breathScore >= 40 ? 'Moderate' : 'Poor';

  const TrendIcon  = trajectory === 'Improving' ? TrendingDown : trajectory === 'Worsening' ? TrendingUp : Minus;
  const trendColor = trajectory === 'Improving' ? '#22c55e' : trajectory === 'Worsening' ? '#ef4444' : '#eab308';

  const heatColor  = { Safe: '#22c55e', Caution: '#eab308', Danger: '#f97316', Extreme: '#ef4444' }[heatLevel];
  const floodColor = { Normal: '#22c55e', Watch: '#eab308', Warning: '#f97316', Critical: '#ef4444' }[floodPrecursor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 flex flex-col h-full"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-primary">Urban Intelligence</h2>
        <span className="text-[10px] font-medium text-semantic-blue bg-semantic-blue/10 px-2 py-0.5 rounded-full">
          DERIVED
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 flex-1">

        {/* City Breath Score */}
        <div className="bg-bg-inner border border-[#ffffff08] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-primary-muted uppercase tracking-wider">City Breath</span>
          <div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-[22px] font-semibold leading-none" style={{ color: breathColor }}>
                {breathScore}
              </span>
              <span className="text-[11px] text-primary-muted">/100</span>
            </div>
            <div className="mt-2 h-[3px] rounded-full bg-bg-deep overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${breathScore}%`, backgroundColor: breathColor }}
              />
            </div>
            <span className="text-[11px] mt-1.5 block" style={{ color: breathColor }}>{breathLabel}</span>
          </div>
        </div>

        {/* AQI Trajectory */}
        <div className="bg-bg-inner border border-[#ffffff08] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-primary-muted uppercase tracking-wider">AQI Trend · 8h</span>
          <div>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendIcon size={16} style={{ color: trendColor }} />
              <span className="text-[15px] font-semibold" style={{ color: trendColor }}>{trajectory}</span>
            </div>
            <span className="text-[11px] text-primary-muted mt-1.5 block">{trajectoryPct}% change</span>
          </div>
        </div>

        {/* Heat Stress */}
        <div className="bg-bg-inner border border-[#ffffff08] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-primary-muted uppercase tracking-wider">Heat Stress</span>
          <div>
            <span
              className="text-[18px] font-semibold leading-none mt-2 block"
              style={{ color: heatColor }}
            >
              {heatLevel}
            </span>
            <span className="text-[11px] text-primary-muted mt-1.5 block">Feels {apparentTemp}°C</span>
          </div>
        </div>

        {/* Flood Signal */}
        <div className="bg-bg-inner border border-[#ffffff08] rounded-lg p-3 flex flex-col justify-between">
          <span className="text-[10px] text-primary-muted uppercase tracking-wider">Flood Signal</span>
          <div>
            <span
              className="text-[18px] font-semibold leading-none mt-2 block"
              style={{ color: floodColor }}
            >
              {floodPrecursor}
            </span>
            <span className="text-[11px] text-primary-muted mt-1.5 block">{dischargeRatioPct}% of 30d max</span>
          </div>
        </div>

      </div>

      <p className="text-[10px] text-primary-muted mt-3 pt-3 border-t border-[#ffffff08]">
        Derived from AQI · weather · hydrology · 8h trends
      </p>
    </motion.div>
  );
}
