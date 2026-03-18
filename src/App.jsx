import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import StatCard from './components/StatCard';
import MetricCard from './components/MetricCard';
import AnomalyChart from './components/AnomalyChart';
import Pipeline from './components/Pipeline';
import AQIGauge from './components/AQIGauge';
import AlertFeed from './components/AlertFeed';
import MapPanel from './components/MapPanel';
import { Wind, Briefcase, CloudRain, MessageSquare, AlertTriangle, Construction } from 'lucide-react';

import {
  fetchAQI, fetchWeather, fetchFlood, fetchTraffic,
  fetchSocialSignals, fetchSystemStats, fetchAnomalies,
  fetchAlerts, connectAlertSocket
} from './api/cityagent';

function App() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activePage, setActivePage] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      const [aqi, weather, flood, traffic, social, stats, anomalies, initialAlerts] = await Promise.all([
        fetchAQI(),
        fetchWeather(),
        fetchFlood(),
        fetchTraffic(),
        fetchSocialSignals(),
        fetchSystemStats(),
        fetchAnomalies(),
        fetchAlerts()
      ]);

      setData({ aqi, weather, flood, traffic, social, stats, anomalies });
      setAlerts(initialAlerts);
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    
    const socket = connectAlertSocket((newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, []);

  if (!data) return <div className="h-screen w-screen flex items-center justify-center bg-bg-deep text-semantic-blue animate-pulse font-semibold">Loading CityAgent Systems...</div>;

  return (
    <div className="h-screen w-screen bg-bg-deep flex flex-col md:flex-row overflow-hidden">
      <Sidebar activePage={activePage} onChangePage={setActivePage} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Topbar />
        
        {activePage === 'overview' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[16px_16px] xl:p-[20px_24px]">
            {/* ROW 1: STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-[12px] mb-4">
              <StatCard label="Active Sensors" value={data.stats.activeSensors} color="#3b82f6" sub="↑ 4 added today" delay={0.05} />
              <StatCard label="Anomalies Today" value={data.stats.anomaliesToday} color="#eab308" sub="3 critical, 9 others" delay={0.10} />
              <StatCard label="System Uptime" value={data.stats.systemUptime} unit="%" color="#22c55e" sub="All pipelines healthy" delay={0.15} />
              <StatCard label="Active Alerts" value={alerts.length} color="#ef4444" sub="2 require action" delay={0.20} />
            </div>

            {/* ROW 2: METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[12px] mb-4">
              <MetricCard 
                title="AQI Index" value={data.aqi.value} unit="AQI"
                label={`${data.aqi.category} · ${data.aqi.dominantPollutant} dominant`}
                delta="−8%" deltaType="neutral" sparkData={data.aqi.trend} sparkColor="#ef4444"
                icon={<Wind size={16} />} iconBg="rgba(239,68,68,0.12)" delay={0.25}
              />
              <MetricCard 
                title="Traffic Flow" value={data.traffic.vehiclesPerHour.toLocaleString()} unit="veh/hr"
                label={`${data.traffic.hotspot} · ${data.traffic.congestionLevel} congestion`}
                delta="+12%" deltaType="up" sparkData={data.traffic.trend} sparkColor="#eab308"
                icon={<Briefcase size={16} />} iconBg="rgba(234,179,8,0.12)" delay={0.30}
              />
              <MetricCard 
                title="Rainfall" value={data.flood.last24h} unit="mm"
                label={`Last 24h · ${data.flood.floodRisk} flood risk`}
                delta="0%" deltaType="neutral" sparkData={data.flood.trend} sparkColor="#14b8a6"
                icon={<CloudRain size={16} />} iconBg="rgba(20,184,166,0.12)" delay={0.35}
              />
              <MetricCard 
                title="Social Signals" value={data.social.signalCount} unit="signals"
                label={`Complaints · Twitter + Reddit`}
                delta="+23%" deltaType="up" sparkData={data.social.trend} sparkColor="#a855f7"
                icon={<MessageSquare size={16} />} iconBg="rgba(168,85,247,0.12)" delay={0.40}
              />
            </div>

            {/* ROW 3: BOTTOM GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[12px]">
              {/* Left Column Stack */}
              <div className="flex flex-col gap-[12px]">
                <div className="h-[220px]">
                  <AnomalyChart data={data.anomalies} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12px] h-auto lg:h-[300px]">
                   <Pipeline status={data.stats.pipelineStatus} />
                   <div className="h-[300px] lg:h-auto"><MapPanel /></div>
                </div>
              </div>

              {/* Right Column Stack */}
              <div className="flex flex-col gap-[12px]">
                <div className="flex-1 max-h-[300px]">
                  <AQIGauge value={data.aqi.value} category={data.aqi.category} station={data.aqi.station} components={data.aqi.components} weather={data.weather} />
                </div>
                <div className="flex-1 min-h-[300px] max-h-[400px]">
                  <AlertFeed alerts={alerts} />
                </div>
              </div>
            </div>
            
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-deep opacity-70">
            <Construction size={48} className="text-semantic-yellow mb-4" />
            <h2 className="text-2xl font-semibold text-primary mb-2 capitalize">{activePage} Dashboard</h2>
            <p className="text-primary-muted max-w-sm">
              This module is not fully mocked out for the hackathon prototype yet. Try clicking "Overview" (the first button) to see the main dashboard!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
