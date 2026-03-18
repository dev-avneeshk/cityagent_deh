import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnomalyChart({ data }) {
  const [activeTab, setActiveTab] = useState('24H');
  const tabs = ['24H', '7D', '30D'];

  // Map incoming anomalyTimeline structure into recharts array
  const formattedData = data.labels.map((label, idx) => ({
    label,
    aqi: data.aqi[idx],
    traffic: data.traffic[idx],
    social: data.social[idx]
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-inner border border-[#ffffff12] rounded-lg p-2 shadow-lg">
          <p className="text-[11px] font-mono text-primary-muted mb-1">{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-[11px] font-semibold" style={{ color: p.fill }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-primary">Anomaly Detection Timeline</h2>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                activeTab === tab 
                  ? 'bg-semantic-blue text-white' 
                  : 'bg-transparent text-primary-muted hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: '"DM Mono", monospace' }} 
              interval={2} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: '"DM Mono", monospace' }} 
              width={24} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Legend 
              iconType="circle" 
              iconSize={8} 
              wrapperStyle={{ fontSize: 11, color: '#e8eaf0', paddingTop: '10px' }} 
            />
            <Bar dataKey="aqi" name="AQI Anomalies" stackId="a" fill="rgba(239,68,68,0.75)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="traffic" name="Traffic Anomalies" stackId="a" fill="rgba(234,179,8,0.75)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="social" name="Social Signals" stackId="a" fill="rgba(168,85,247,0.75)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
