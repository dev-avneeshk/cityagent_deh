import React from 'react';
import { LayoutDashboard, Wind, Car, Bell, Activity, Settings } from 'lucide-react';

export default function Sidebar({ activePage, onChangePage }) {
  const navItems = [
    { id: 'overview', icon: <LayoutDashboard size={18} /> },
    { id: 'air', icon: <Wind size={18} /> },
    { id: 'traffic', icon: <Car size={18} /> },
    { id: 'alerts', icon: <Bell size={18} /> },
    { id: 'pipeline', icon: <Activity size={18} /> },
  ];

  return (
    <aside className="w-full md:w-[56px] h-auto md:h-full bg-bg-card border-t md:border-t-0 md:border-r border-[#ffffff12] flex flex-row md:flex-col items-center justify-between md:py-4 shrink-0 px-4 md:px-0 flex-none pb-safe">
      <div className="hidden md:flex w-8 h-8 rounded bg-semantic-blue items-center justify-center mb-6 shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="6" width="3" height="12" fill="white" stroke="none" />
          <rect x="10" y="10" width="3" height="8" fill="white" stroke="none" />
          <rect x="16" y="4" width="3" height="14" fill="white" stroke="none" />
        </svg>
      </div>
      
      <nav className="flex flex-row md:flex-col gap-1 md:gap-2 w-full md:px-2 justify-between md:justify-start overflow-x-auto custom-scrollbar items-center py-2 md:py-0">
        {navItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => onChangePage(item.id)}
            className={`w-10 h-10 shrink-0 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors ${
              activePage === item.id 
                ? 'bg-semantic-blue/15 text-semantic-blue' 
                : 'text-primary-muted hover:bg-bg-inner'
            }`}
          >
            {item.icon}
          </div>
        ))}
      </nav>
      
      <div className="hidden md:flex mt-auto mb-2 w-10 h-10 rounded-[10px] items-center justify-center text-primary-muted hover:bg-bg-inner cursor-pointer transition-colors shrink-0">
        <Settings size={18} />
      </div>
    </aside>
  );
}
