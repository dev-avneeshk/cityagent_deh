import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function MetricCard({ title, value, unit, label, delta, deltaType, sparkData, sparkColor, icon, iconBg, delay = 0 }) {
  const isUp = deltaType === 'up';
  const isDown = deltaType === 'down';
  const isNeutral = deltaType === 'neutral';

  const badgeStyles = {
    up: 'bg-semantic-green/10 text-semantic-green border-semantic-green/20',
    down: 'bg-semantic-red/10 text-semantic-red border-semantic-red/20',
    neutral: 'bg-primary-muted/15 text-primary-muted border-primary-muted/20',
  };

  const chartData = sparkData.map((v, i) => ({ v, i }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-bg-card border border-[#ffffff12] rounded-xl p-[16px_18px] flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: iconBg, color: sparkColor }}
          >
            {icon}
          </div>
          <div className={`px-2 py-0.5 rounded-pill text-[11px] font-semibold border ${badgeStyles[deltaType]}`}>
            {delta}
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-[24px] font-semibold leading-none text-primary">{value}</span>
          <span className="text-[14px] text-primary-muted">{unit}</span>
        </div>
        <div className="text-[12px] text-primary-muted mb-4">{label}</div>
      </div>

      <div className="h-[36px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area 
              type="monotone" 
              dataKey="v" 
              stroke={sparkColor} 
              strokeWidth={1.5} 
              fill={sparkColor} 
              fillOpacity={0.1} 
              dot={false} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
