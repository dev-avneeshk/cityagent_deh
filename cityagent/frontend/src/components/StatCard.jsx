import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, unit, sub, color, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-bg-card border border-[#ffffff12] rounded-xl p-[16px_18px]"
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-primary-muted mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1" style={{ color }}>
        <span className="text-[28px] font-semibold leading-tight">{value}</span>
        {unit && <span className="text-[16px]">{unit}</span>}
      </div>
      {sub && (
        <div className="text-[12px] text-primary-muted mt-0.5">
          {sub}
        </div>
      )}
    </motion.div>
  );
}
