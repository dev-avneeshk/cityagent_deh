# CityAgent — Dehradun Urban Infrastructure Monitor
### ByteVerse 1.0 · Team ISO · ICFAI University Dehradun

A real-time smart city monitoring dashboard tracking **AQI, traffic, rainfall, flood risk and social media signals** for Dehradun, Uttarakhand.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Maps | Leaflet.js + React-Leaflet |
| Icons | Lucide React |
| Animations | Framer Motion |
| Backend | FastAPI (Python 3.11) |
| Database | SQLite via SQLAlchemy |
| Alerts | python-telegram-bot |
| Tunnel | ngrok |

---

## Project Structure

```
cityagent/
├── frontend/
│   └── src/
│       ├── components/      # All UI components
│       ├── data/mockData.js # All mock data (swap for live APIs)
│       ├── api/cityagent.js # API layer
│       └── App.jsx
└── backend/
    ├── main.py             # FastAPI endpoints + WebSocket
    └── requirements.txt
```

---

## Quick Start

```bash
# Frontend
cd cityagent/frontend
npm install
npm run dev
# → http://localhost:5173

# Backend
cd cityagent/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Data Sources — Free (No Key Required)

| Data | API |
|------|-----|
| Weather + Wind + Humidity | [Open-Meteo Weather](https://open-meteo.com) |
| PM2.5, PM10, NO2, O3, AQI | [Open-Meteo Air Quality](https://air-quality-api.open-meteo.com) |
| River discharge / Flood risk | [Open-Meteo Flood API](https://flood-api.open-meteo.com) |
| Geocoding | [Open-Meteo Geocoding](https://geocoding-api.open-meteo.com) |

## Data Sources — API Key Required

| Data | API |
|------|-----|
| Station AQI | [WAQI](https://aqicn.org/data-platform/token/) |
| Real-time Traffic | [TomTom](https://developer.tomtom.com) |
| Reddit signals | [PRAW](https://www.reddit.com/prefs/apps) |
| Telegram alerts | [@BotFather](https://t.me/botfather) |

---

## Environment Variables

Create `.env` files (never commit these):

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
VITE_WAQI_TOKEN=
VITE_TOMTOM_KEY=

# backend/.env
WAQI_TOKEN=
TOMTOM_KEY=
TELEGRAM_TOKEN=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

---

*CityAgent · Team ISO · ByteVerse 1.0 · ICFAI University Dehradun*
