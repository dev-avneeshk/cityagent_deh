import React from 'react';

export default function Pipeline({ status }) {
  const steps = [
    { title: "Data Collect", sub: "APIs & Social Media", state: status.dataCollect || "running" },
    { title: "Filter", sub: "Keywords & Geo-tags", state: status.filter || "running" },
    { title: "Detect Anomaly", sub: "Spike Detection · spaCy NLP", state: status.detectAnomaly || "processing" },
    { title: "Decide", sub: "Severity Score", state: status.decide || "waiting" },
    { title: "Alert & Act", sub: "Telegram Bot notification", state: status.alertAct || "waiting" },
  ];

  const stateConfig = {
    running: { dot: 'bg-semantic-green', badge: 'bg-semantic-green/10 text-semantic-green', label: 'Running' },
    processing: { dot: 'bg-semantic-yellow', badge: 'bg-semantic-yellow/10 text-semantic-yellow', label: 'Processing' },
    waiting: { dot: 'bg-primary-muted', badge: 'bg-primary-muted/10 text-primary-muted', label: 'Waiting' },
  };

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-sm font-semibold text-primary">Processing Pipeline</h2>
        <span className="text-[11px] text-semantic-green flex items-center gap-1 font-medium bg-semantic-green/10 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-green animate-pulse" /> All running
        </span>
      </div>

      <div className="flex flex-col flex-1 pl-1">
        {steps.map((step, idx) => {
          const config = stateConfig[step.state];
          const isLast = idx === steps.length - 1;

          return (
            <div key={idx} className="flex flex-row relative min-h-[46px]">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[3px] top-[14px] bottom-0 w-[1px] border-l border-dashed border-gray-800" />
              )}
              {/* Dot */}
              <div className="w-6 flex shrink-0 justify-start mt-1.5 relative z-10">
                <div className={`w-2 h-2 rounded-full ${config.dot} ring-4 ring-bg-card`} />
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-4 flex justify-between items-start pr-2">
                <div>
                  <div className="text-[12px] font-medium text-primary leading-tight">{step.title}</div>
                  <div className="text-[11px] text-primary-muted leading-tight mt-0.5">{step.sub}</div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${config.badge}`}>
                  {config.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#ffffff12] flex flex-wrap gap-1.5">
        {["Python", "spaCy NLP", "REST APIs", "SQLite", "Telegram Bot"].map(tag => (
          <span key={tag} className="bg-bg-inner border border-[#ffffff12] text-[10px] text-primary-muted rounded-full px-2.5 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
