import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader, X } from 'lucide-react';
import TelegramButton from './TelegramButton';

export default function Topbar({ city, locating, locationError, onDetectLocation, onSearchCities, onSelectCity, data, alerts, intel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [clock, setClock] = useState('');
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await onSearchCities(val);
      setResults(res);
      setShowDropdown(res.length > 0);
      setSearching(false);
    }, 350);
  };

  const handleSelect = (result) => {
    onSelectCity(result);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setQuery('');
    }
  };

  return (
    <header className="h-[56px] bg-bg-card border-b border-[#ffffff12] flex items-center gap-3 px-4 shrink-0 z-50">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-semantic-blue flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <rect x="4"  y="6"  width="3" height="12" fill="white" />
            <rect x="10" y="10" width="3" height="8"  fill="white" />
            <rect x="16" y="4"  width="3" height="14" fill="white" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-primary hidden md:block">CityAgent</span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-[#ffffff12] hidden md:block" />

      {/* Current City badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <MapPin size={13} className="text-semantic-blue shrink-0" />
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold text-primary">{city.name}</span>
          {city.state && <span className="text-[10px] text-primary-muted">{city.state}</span>}
        </div>
      </div>

      {/* Search bar (flex-1) */}
      <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm">
        <div className="flex items-center gap-2 bg-bg-inner border border-[#ffffff12] rounded-lg px-3 h-8">
          {searching ? (
            <Loader size={13} className="text-primary-muted animate-spin shrink-0" />
          ) : (
            <Search size={13} className="text-primary-muted shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search any city..."
            className="flex-1 bg-transparent text-[12px] text-primary placeholder:text-primary-muted outline-none min-w-0"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}>
              <X size={12} className="text-primary-muted hover:text-primary transition-colors" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-bg-card border border-[#ffffff12] rounded-lg overflow-hidden shadow-xl z-[999]">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-bg-inner transition-colors text-left"
              >
                <MapPin size={12} className="text-semantic-blue mt-0.5 shrink-0" />
                <div>
                  <div className="text-[12px] font-medium text-primary">{r.name}</div>
                  <div className="text-[10px] text-primary-muted">
                    {[r.admin1, r.admin2, r.country].filter(Boolean).join(', ')} · {r.latitude?.toFixed(2)}°N {r.longitude?.toFixed(2)}°E
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use My Location button */}
      <button
        onClick={onDetectLocation}
        disabled={locating}
        title={locationError || 'Use my current location'}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11px] font-semibold transition-all shrink-0 ${
          locating
            ? 'border-semantic-blue/30 text-semantic-blue bg-semantic-blue/10 cursor-wait'
            : locationError
            ? 'border-semantic-red/30 text-semantic-red bg-semantic-red/5 hover:bg-semantic-red/10'
            : 'border-[#ffffff12] text-primary-muted hover:text-semantic-blue hover:border-semantic-blue/30 hover:bg-semantic-blue/5'
        }`}
      >
        {locating ? (
          <Loader size={12} className="animate-spin" />
        ) : (
          <MapPin size={12} />
        )}
        <span className="hidden md:block">{locating ? 'Locating…' : locationError ? 'Denied' : 'My Location'}</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Error toast */}
      {locationError && (
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-semantic-red font-mono max-w-[180px] truncate">
          {locationError}
        </div>
      )}

      {/* Clock */}
      <div className="font-mono text-[12px] text-primary-muted shrink-0">{clock}</div>

      {/* Telegram update button */}
      <TelegramButton city={city} data={data} alerts={alerts ?? []} intel={intel} />

      {/* Live badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-semantic-green animate-pulse" />
        <span className="text-[10px] font-semibold text-semantic-green uppercase tracking-wide">LIVE</span>
      </div>
    </header>
  );
}
