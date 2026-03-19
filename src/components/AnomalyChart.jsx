import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnomalyChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || !data.labels) return null;

  // Find max total to normalize height
  const maxTotal = Math.max(...data.labels.map((_, i) => 
    (data.aqi[i] || 0) + (data.traffic[i] || 0) + (data.social[i] || 0)
  ));
  const HEIGHT_MULTIPLIER = maxTotal > 0 ? 120 / maxTotal : 1; // 120px max height

  // Variants for staggering the entry animation of pillars
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 h-full flex flex-col relative overflow-visible">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-primary">24h City Activity Pattern</h3>
          <span className="text-[10px] font-medium text-primary-muted bg-bg-inner border border-[#ffffff10] px-2 py-0.5 rounded-full">MODELED</span>
        </div>
        <div className="flex items-center gap-3">
          <LegendItem color="bg-semantic-red" label="Air Quality" />
          <LegendItem color="bg-semantic-purple" label="Reports" />
          <LegendItem color="bg-semantic-yellow" label="Traffic" />
        </div>
      </div>

      {/* 3D Pillars Container (Flex row) */}
      <motion.div 
        variants={containerVars} initial="hidden" animate="show"
        className="flex-1 flex items-end justify-between gap-1 w-full pt-12 pb-6 relative"
      >
        {/* Background grid lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pt-12 pb-6 z-0">
          <div className="border-b border-[#ffffff0a] w-full" />
          <div className="border-b border-[#ffffff0a] w-full" />
          <div className="border-b border-[#ffffff0a] w-full" />
        </div>

        {data.labels.map((time, i) => {
          const aqi = data.aqi[i] || 0;
          const traffic = data.traffic[i] || 0;
          const social = data.social[i] || 0;
          const total = aqi + traffic + social;

          return (
            <div key={i} 
                 className={`relative flex-1 flex flex-col justify-end items-center h-full z-10 group transition-all duration-300 ${
                   hoveredIdx !== null && hoveredIdx !== i ? 'opacity-30' : 'opacity-100'
                 }`}
                 onMouseEnter={() => setHoveredIdx(i)}
                 onMouseLeave={() => setHoveredIdx(null)}>
              
              {/* Interactive 3D Pillar */}
              <motion.div 
                variants={itemVars}
                whileHover={{ y: -8, scale: 1.15, filter: "brightness(1.2) drop-shadow(0 10px 15px rgba(0,0,0,0.5))" }}
                className="w-full max-w-[14px] flex flex-col justify-end origin-bottom cursor-pointer rounded-t-sm overflow-hidden"
                style={{
                  height: total > 0 ? `${total * HEIGHT_MULTIPLIER}px` : '4px',
                  // 3D Bevel effect
                  boxShadow: total > 0 ? 'inset 2px 0 0 rgba(255,255,255,0.15), inset -2px 0 0 rgba(0,0,0,0.3)' : 'none',
                  backgroundColor: total === 0 ? '#ffffff0a' : 'transparent',
                }}
              >
                {/* Segments */}
                <Segment val={social} mult={HEIGHT_MULTIPLIER} color="rgb(168 85 247)" />
                <Segment val={traffic} mult={HEIGHT_MULTIPLIER} color="rgb(234 179 8)" />
                <Segment val={aqi} mult={HEIGHT_MULTIPLIER} color="rgb(239 68 68)" />
              </motion.div>

              {/* Time Label (only show every 4th hour for clarity) */}
              <div className="absolute -bottom-6 text-[9px] font-mono text-primary-muted group-hover:text-primary transition-colors">
                {i % 4 === 0 || hoveredIdx === i ? time : ''}
              </div>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredIdx === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max bg-[#1a1e28] border border-[#ffffff1a] rounded-lg p-3 shadow-2xl z-50 pointer-events-none"
                  >
                    {/* Tooltip Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1e28] border-b border-r border-[#ffffff1a] rotate-45" />
                    
                    <div className="text-[11px] font-mono text-primary-muted mb-2">{time}</div>
                    
                    <div className="flex flex-col gap-1.5">
                      <TooltipRow color="bg-semantic-red" label="Air Quality Events" val={aqi} />
                      <TooltipRow color="bg-semantic-yellow" label="Traffic Activity" val={traffic} />
                      <TooltipRow color="bg-semantic-purple" label="Citizen Reports" val={social} />
                    </div>
                    {total === 0 && <div className="text-[11px] text-primary italic mt-1">No activity this hour</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// Subcomponents

function Segment({ val, mult, color }) {
  if (!val) return null;
  return (
    <div 
      style={{ 
        height: `${val * mult}px`, 
        backgroundColor: color,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2)', // Top highlight for 3D specularity
      }}
      className="w-full border-b border-black/20 last:border-0"
    />
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
      <span className="text-[10px] text-primary">{label}</span>
    </div>
  );
}

function TooltipRow({ color, label, val }) {
  if (!val) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-[12px]">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-sm ${color}`} />
        <span className="text-primary-muted">{label}</span>
      </div>
      <span className="font-semibold text-primary">{val}</span>
    </div>
  );
}
