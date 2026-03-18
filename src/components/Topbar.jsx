import React, { useState, useEffect } from 'react';

export default function Topbar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-[56px] bg-bg-card border-b border-[#ffffff12] flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold text-primary">Urban Infrastructure Monitor</h1>
        <div className="flex items-center gap-1.5 bg-semantic-green/10 border border-semantic-green/25 text-semantic-green text-[11px] font-semibold rounded-pill px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-green animate-pulse"></span>
          LIVE
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-[12px] font-mono text-primary-muted">
          {time}
        </div>
        <select className="bg-bg-card border border-[#ffffff12] text-primary text-sm rounded-lg px-3 py-1.5 outline-none focus:border-semantic-blue/50">
          <option>Dehradun</option>
          <option>Delhi</option>
          <option>Mumbai</option>
        </select>
      </div>
    </header>
  );
}
