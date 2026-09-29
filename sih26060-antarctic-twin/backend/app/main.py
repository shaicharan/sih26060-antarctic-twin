"""
backend/app/main.py

FastAPI entrypoint for Antarctic Research Station Digital Twin Platform backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.station import router as station_router

app = FastAPI(
    title="SIH 2026 — Antarctic Research Station Digital Twin API",
    description="Backend API for station state simulation, energy modeling, fuel tracking, and risk assessment.",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers (both root and /api prefix for compatibility with Vercel rewrites)
app.include_router(station_router, tags=["Station & Simulation"])
app.include_router(station_router, prefix="/api", tags=["Station & Simulation"])


@app.get("/")
@app.get("/api")
def root():
    return {
        "status": "online",
        "service": "Antarctic Station Digital Twin API",
        "docs_url": "/docs",
    }
