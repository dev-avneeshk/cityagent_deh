// ============================================================
// useCity — manages location detection and city search
// Uses browser Geolocation API + Open-Meteo Geocoding (no key needed)
// ============================================================

import { useState, useCallback } from 'react';
import axios from 'axios';

const DEFAULT_CITY = { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lon: 78.0322 };

export function useCity() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // ── Auto-detect from browser GPS ────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported in this browser');
      return;
    }
    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          // Free reverse geocoding — no API key needed
          const r = await axios.get(
            'https://api.bigdatacloud.net/data/reverse-geocode-client',
            { params: { latitude, longitude, localityLanguage: 'en' } }
          );
          const d = r.data;
          const name = d.city || d.locality || d.principalSubdivision || 'Your Location';
          const state = d.principalSubdivision || '';
          setCity({ name, state, lat: latitude, lon: longitude });
        } catch {
          // Fallback: use coords even if reverse geocoding fails
          setCity({ name: 'Current Location', state: '', lat: latitude, lon: longitude });
        }
        setLocating(false);
      },
      (err) => {
        const msgs = {
          1: 'Location permission denied — please allow access',
          2: 'Unable to determine position',
          3: 'Location request timed out',
        };
        setLocationError(msgs[err.code] || 'Location unavailable');
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // ── Search cities via Open-Meteo Geocoding ───────────────
  const searchCities = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const r = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: query.trim(), count: 6, language: 'en' }
      });
      return r.data.results || [];
    } catch {
      return [];
    }
  }, []);

  // ── Select a city from search results ───────────────────
  const selectCity = useCallback((result) => {
    setCity({
      name: result.name,
      state: result.admin1 || result.country || '',
      lat: result.latitude,
      lon: result.longitude,
    });
    setLocationError(null);
  }, []);

  const resetToDefault = useCallback(() => {
    setCity(DEFAULT_CITY);
    setLocationError(null);
  }, []);

  return { city, locating, locationError, detectLocation, searchCities, selectCity, resetToDefault };
}
