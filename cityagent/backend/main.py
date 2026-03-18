# ============================================================
# CityAgent FastAPI Backend
# Run: uvicorn main:app --reload --port 8000
# Expose: ngrok http 8000
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket
import asyncio, httpx, os

app = FastAPI(title="CityAgent API")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── API KEYS (set in .env file) ────────────────────────────
WAQI_TOKEN  = os.getenv("WAQI_TOKEN",  "demo")
OWM_KEY     = os.getenv("OWM_KEY",     "")
TOMTOM_KEY  = os.getenv("TOMTOM_KEY",  "")
TG_TOKEN    = os.getenv("TELEGRAM_TOKEN", "")
LAT, LON    = 30.3165, 78.0322

# ── MOCK RESPONSES (replace with real API calls) ───────────

@app.get("/api/aqi")
async def get_aqi():
    # LIVE: async with httpx.AsyncClient() as c:
    #   r = await c.get(f"https://api.waqi.info/feed/dehradun/?token={WAQI_TOKEN}")
    #   return r.json()["data"]
    return {"value": 139, "category": "Moderate", "dominantPollutant": "PM2.5", "color": "#f97316", "trend": [160, 155, 148, 152, 145, 139, 142, 139], "station": "Dehradun Central Monitoring Station"}

@app.get("/api/weather")
async def get_weather():
    # LIVE: async with httpx.AsyncClient() as c:
    #   r = await c.get("https://api.open-meteo.com/v1/forecast",
    #     params={"latitude": LAT, "longitude": LON, "timezone": "Asia/Kolkata",
    #             "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure"})
    #   return r.json()["current"]
    return {"temperature": 22, "humidity": 83, "pressure": 751,
            "windSpeed": 0.9, "windDirection": "E", "visibility": 32}

@app.get("/api/flood")
async def get_flood():
    # LIVE: async with httpx.AsyncClient() as c:
    #   r = await c.get("https://flood-api.open-meteo.com/v1/flood",
    #     params={"latitude": LAT, "longitude": LON, "daily": "river_discharge"})
    #   return r.json()
    return {"last24h": 2.4, "floodRisk": "Low", "riverDischarge": 12.3}

@app.get("/api/traffic")
async def get_traffic():
    # LIVE: async with httpx.AsyncClient() as c:
    #   r = await c.get(
    #     "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
    #     params={"point": f"{LAT},{LON}", "key": TOMTOM_KEY})
    #   return r.json()["flowSegmentData"]
    return {"vehiclesPerHour": 4256, "congestion": "Heavy", "hotspot": "Rajpur Road"}

@app.get("/api/stats")
async def get_stats():
    return {"activeSensors": 247, "anomaliesToday": 12,
            "systemUptime": 99.7, "activeAlerts": 3}

@app.get("/api/anomalies")
async def get_anomalies(range: str = "24h"):
    # Returns pre-processed anomaly counts per hour from SQLite
    # LIVE: query anomaly table from database.py
    return {"labels": [f"{h:02d}:00" for h in range(24)],
            "aqi":     [1,0,2,1,3,2,5,7,8,6,4,5,7,9,8,6,5,7,8,6,4,3,2,1],
            "traffic": [0,0,1,0,2,3,4,6,7,5,4,5,6,8,7,6,5,7,8,7,5,4,3,2],
            "social":  [0,0,0,1,0,1,2,3,4,3,2,3,4,5,4,3,4,5,4,3,2,2,1,0]}

@app.get("/api/alerts")
async def get_alerts(limit: int = 10):
    # LIVE: query alerts table from database.py, order by created_at DESC
    return [
        {"id":1,"severity":"critical","message":"PM2.5 exceeding safe limit at Rajpur Road","source":"AQI #14","time":"Just now"},
        {"id":2,"severity":"high","message":"Traffic congestion — Clock Tower junction","source":"Traffic API","time":"2 min ago"},
        {"id":3,"severity":"medium","message":"Drainage overflow risk at Rispana bridge","source":"Flood API","time":"5 min ago"},
    ]

@app.websocket("/ws/alerts")
async def alert_socket(ws: WebSocket):
    await ws.accept()
    # LIVE: listen to alert queue from anomaly engine
    # MOCK: push a fake alert every 12s
    mock_alerts = [
        {"id":7,"severity":"high","message":"SO2 spike near SIDCUL industrial zone","source":"Sensor #22"},
        {"id":8,"severity":"medium","message":"Water logging near Bindal river area","source":"Reddit"},
    ]
    i = 0
    try:
        while True:
            await asyncio.sleep(12)
            await ws.send_json(mock_alerts[i % len(mock_alerts)])
            i += 1
    except:
        pass
