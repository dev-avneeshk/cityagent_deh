import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertFeed({ alerts }) {
  const [displayAlerts, setDisplayAlerts] = useState(alerts);

  useEffect(() => {
    setDisplayAlerts(prev => {
      // Keep only last 8 alerts roughly if new ones prepend
      const newAlerts = [...alerts];
      return newAlerts.slice(0, 8);
    });
  }, [alerts]);

  const severityConfig = {
    critical: { border: 'border-semantic-red/20', bg: 'bg-semantic-red/5 hover:bg-semantic-red/10', badgeTheme: 'bg-semantic-red text-white' },
    high:     { border: 'border-semantic-orange/20', bg: 'bg-semantic-orange/5 hover:bg-semantic-orange/10', badgeTheme: 'bg-semantic-orange text-white' },
    medium:   { border: 'border-semantic-yellow/20', bg: 'bg-semantic-yellow/5 hover:bg-semantic-yellow/10', badgeTheme: 'bg-semantic-yellow text-bg-deep' },
    low:      { border: 'border-semantic-blue/20', bg: 'bg-semantic-blue/5 hover:bg-semantic-blue/10', badgeTheme: 'bg-semantic-blue text-white' },
  };

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-primary">Live Alert Feed</h2>
        <span className="text-[10px] font-mono text-primary-muted">
          {displayAlerts.length} alerts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {displayAlerts.map(alert => {
              const config = severityConfig[alert.severity] || severityConfig.low;
              
              return (
                <motion.div
                  key={alert.id}
                  layoutId={String(alert.id)}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex flex-row gap-2.5 p-2.5 items-start rounded-lg border cursor-pointer transition-colors ${config.border} ${config.bg}`}
                >
                  <div className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider rounded-[4px] px-1.5 py-0.5 shrink-0 w-16 text-center ${config.badgeTheme}`}>
                    {alert.severity}
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium leading-snug text-primary line-clamp-2">
                      {alert.message}
                    </span>
                    <span className="text-[10px] font-mono text-primary-muted mt-0.5">
                      {alert.source} · {alert.time}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
