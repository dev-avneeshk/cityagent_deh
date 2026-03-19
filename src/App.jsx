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
import { Wind, Briefcase, CloudRain, MessageSquare, Construction } from 'lucide-react';
import { useCity } from './hooks/useCity';
import ChatBot from './components/ChatBot';

import {
  fetchAQI, fetchWeather, fetchFlood, fetchTraffic,
  fetchSocialSignals, fetchSystemStats, fetchAnomalies,
  fetchAlerts, connectAlertSocket
} from './api/cityagent';

function App() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePage, setActivePage] = useState('overview');

  const {
    city, locating, locationError,
    detectLocation, searchCities, selectCity
  } = useCity();

  // Re-fetch all data whenever city changes.
  // Use city.lat & city.lon (primitives) not city (object) — React compares by value.
  useEffect(() => {
    let cancelled = false;
    // First load: show full loading screen. Subsequent city changes: show refresh bar.
    if (!data) setLoading(true);
    else setRefreshing(true);

    const loadData = async () => {
      const { lat, lon, name: cityName } = city;

      // Step 1: Fetch live data simultaneously
      const [aqi, weather, flood, traffic, stats] = await Promise.all([
        fetchAQI(lat, lon),
        fetchWeather(lat, lon),
        fetchFlood(lat, lon),
        fetchTraffic(lat, lon),
        fetchSystemStats(),
      ]);

      // Step 2: Use real AQI value to seed city-specific mock data
      const aqiValue = aqi?.value ?? 60;
      const [social, anomalies, alertsResult] = await Promise.all([
        fetchSocialSignals(cityName, aqiValue),
        fetchAnomalies(cityName, aqiValue),
        fetchAlerts(cityName, aqiValue),
      ]);

      if (!cancelled) {
        // Give alerts globally unique IDs (prefix with city hash) to prevent React key collisions
        const cityPrefix = cityName.replace(/\s+/g, '').slice(0, 4).toUpperCase();
        const uniqueAlerts = alertsResult.alerts.map((a, i) => ({
          ...a,
          id: `${cityPrefix}-${i}`,
        }));
        const mergedStats = {
          ...stats,
          // anomaliesToday = number of alerts for easy sub-label math
          anomaliesToday: uniqueAlerts.length,
        };
        setData({ aqi, weather, flood, traffic, social, stats: mergedStats, anomalies });
        setAlerts(uniqueAlerts);
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.lat, city.lon]);

  // WebSocket (mock) for live alerts — only runs when not actively refreshing
  useEffect(() => {
    const socket = connectAlertSocket((newAlert) => {
      setRefreshing(prev => {
        if (prev) return prev;  // skip stale websocket alerts during city refresh
        return prev;
      });
      setAlerts(prev => {
        // Avoid duplicate keys — check if same id already exists
        if (prev.some(a => a.id === newAlert.id)) return prev;
        return [{ ...newAlert, id: `WS-${newAlert.id}` }, ...prev.slice(0, 9)];
      });
    });
    return () => socket.close();
  }, []);

  if (loading || !data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-deep gap-3">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-semantic-blue animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <div className="text-[13px] font-semibold text-primary-muted">
          Fetching live data for <span className="text-primary">{city.name}</span>…
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-deep flex flex-col md:flex-row overflow-hidden">
      <Sidebar activePage={activePage} onChangePage={setActivePage} />

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Topbar
          city={city}
          locating={locating || refreshing}
          locationError={locationError}
          onDetectLocation={detectLocation}
          onSearchCities={searchCities}
          onSelectCity={selectCity}
          data={data}
          alerts={alerts}
        />

        {activePage === 'overview' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[16px] xl:p-[20px_24px]">

            {/* ROW 1: STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Live Data Streams" value={data.stats.activeSensors} color="#3b82f6"
                sub={`${data.stats.apiEndpoints} APIs · ${data.stats.apiEndpointsUp}/${data.stats.apiEndpoints} online`}
                delay={0.05}
              />
              <StatCard
                label="Anomalies Today" value={data.stats.anomaliesToday} color="#eab308"
                sub={(() => {
                  const critical = alerts.filter(a => a.severity === 'critical').length;
                  const others   = alerts.filter(a => a.severity !== 'critical').length;
                  return `${critical} critical, ${others} others`;
                })()}
                delay={0.10}
              />
              <StatCard
                label="API Uptime" value={data.stats.systemUptime} unit="%" color="#22c55e"
                sub={`${data.stats.apiEndpointsUp}/${data.stats.apiEndpoints} endpoints responding`} delay={0.15}
              />
              <StatCard
                label="Active Alerts" value={alerts.length} color="#ef4444"
                sub={alerts.length ? `${alerts[0]?.severity} — ${alerts[0]?.source}` : 'All clear'} delay={0.20}
              />
            </div>

            {/* ROW 2: METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <MetricCard
                title="US AQI" value={data.aqi.value} unit="AQI"
                label={`${data.aqi.category} · ${data.aqi.dominantPollutant} · PM2.5 ${data.aqi.components?.pm25 ?? '—'} µg/m³`}
                delta="LIVE" deltaType="neutral" sparkData={data.aqi.trend} sparkColor="#ef4444"
                icon={<Wind size={16} />} iconBg="rgba(239,68,68,0.12)" delay={0.25}
              />
              <MetricCard
                title="Traffic Flow" value={data.traffic.vehiclesPerHour.toLocaleString()} unit="veh/hr"
                label={`${data.traffic.hotspot} · ${data.traffic.congestionLevel} · ${data.traffic.currentSpeed ?? '?'} km/h`}
                delta={data.traffic.dataSource?.includes('LIVE') ? 'LIVE' : 'MOCK'}
                deltaType="neutral" sparkData={data.traffic.trend} sparkColor="#eab308"
                icon={<Briefcase size={16} />} iconBg="rgba(234,179,8,0.12)" delay={0.30}
              />
              <MetricCard
                title="River Discharge" value={data.flood.riverDischarge ?? data.flood.last24h} unit="m³/s"
                label={`${data.flood.floodRisk} flood risk · 30d max ${data.flood.riverDischargeMax30d ?? '—'}`}
                delta="LIVE" deltaType="neutral" sparkData={data.flood.trend} sparkColor="#14b8a6"
                icon={<CloudRain size={16} />} iconBg="rgba(20,184,166,0.12)" delay={0.35}
              />
              <MetricCard
                title="Social Signals" value={data.social.signalCount} unit="signals"
                label={`${city.name} · Twitter ${data.social.sources?.twitter ?? 0} + Reddit ${data.social.sources?.reddit ?? 0} · MOCK`}
                delta="MOCK" deltaType="neutral" sparkData={data.social.trend} sparkColor="#a855f7"
                icon={<MessageSquare size={16} />} iconBg="rgba(168,85,247,0.12)" delay={0.40}
              />
            </div>

            {/* ROW 3: BOTTOM GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3">
              {/* Left Column */}
              <div className="flex flex-col gap-3">
                <div className="h-[220px]">
                  <AnomalyChart data={data.anomalies} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-auto lg:h-[300px]">
                  <Pipeline status={data.stats.pipelineStatus} />
                  <div className="h-[300px] lg:h-auto"><MapPanel city={city} aqiValue={data.aqi.value} /></div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-3">
                <div className="flex-1 max-h-[300px]">
                  <AQIGauge
                    value={data.aqi.value} category={data.aqi.category}
                    station={data.aqi.station} components={data.aqi.components}
                    weather={data.weather}
                  />
                </div>
                <div className="flex-1 min-h-[280px] max-h-[400px]">
                  <AlertFeed alerts={alerts} />
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Construction size={48} className="text-semantic-yellow mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2 capitalize">{activePage} Module</h2>
            <p className="text-primary-muted max-w-sm text-sm">
              Coming soon! This module is under development.
              Switch back to <strong className="text-primary">Overview</strong> to see the live dashboard.
            </p>
          </div>
        )}
      </main>

      {/* Floating AI chatbot — fixed position, always accessible with full live city context */}
      <ChatBot city={city} data={data} alerts={alerts} />
    </div>
  );
}

export default App;
