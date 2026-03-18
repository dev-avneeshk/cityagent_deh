import React from 'react';
import { LayoutDashboard, Wind, Car, Bell, Activity, Settings } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { icon: <LayoutDashboard size={18} />, active: true },
    { icon: <Wind size={18} />, active: false },
    { icon: <Car size={18} />, active: false },
    { icon: <Bell size={18} />, active: false },
    { icon: <Activity size={18} />, active: false },
  ];

  return (
    <aside className="w-[56px] bg-bg-card border-r border-[#ffffff12] flex flex-col items-center py-4 shrink-0">
      <div className="w-8 h-8 rounded bg-semantic-blue flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="6" width="3" height="12" fill="white" stroke="none" />
          <rect x="10" y="10" width="3" height="8" fill="white" stroke="none" />
          <rect x="16" y="4" width="3" height="14" fill="white" stroke="none" />
        </svg>
      </div>
      
      <nav className="flex flex-col gap-2 w-full px-2">
        {navItems.map((item, idx) => (
          <div 
            key={idx}
            className={`w-10 h-10 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors ${
              item.active 
                ? 'bg-semantic-blue/15 text-semantic-blue' 
                : 'text-primary-muted hover:bg-bg-inner'
            }`}
          >
            {item.icon}
          </div>
        ))}
      </nav>
      
      <div className="mt-auto mb-2 w-10 h-10 rounded-[10px] flex items-center justify-center text-primary-muted hover:bg-bg-inner cursor-pointer transition-colors">
        <Settings size={18} />
      </div>
    </aside>
  );
}
