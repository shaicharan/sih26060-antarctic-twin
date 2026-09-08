import React, { useState, useEffect } from 'react';
import StationDashboard from './components/StationDashboard';
import WhatIfPanel from './components/WhatIfPanel';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStationState() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/station/state`);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setStationData(data);
      } catch (err) {
        console.error('Error fetching station state:', err);
        setError(err.message || 'Failed to fetch station state from backend.');
      } finally {
        setLoading(false);
      }
    }

    fetchStationState();
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F7FA] text-slate-800 font-sans pb-16 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3.5">
            {/* Geometric Snowflake Icon */}
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m-9-9h18m-4.5-6.5l-9 9m0-9l9 9M7.5 4.5l9 15m-9 0l9-15" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-serif font-bold text-navy-900 tracking-tight">
                  Antarctic Station Digital Twin
                </h1>
                <span className="h-4 w-px bg-slate-300 hidden sm:inline-block"></span>
                <span className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  MAITRI RESEARCH STATION <span className="text-slate-400 font-normal">| 70°45′S, 11°44′E</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Station Operations & Predictive Simulation Platform
              </p>
            </div>
          </div>

          {/* Header Status Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold font-mono shadow-xs">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
              <span>{loading ? 'CONNECTING...' : error ? 'OFFLINE' : 'LIVE API CONNECTED'}</span>
            </div>
            <div className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-700 shadow-xs" title="India (NCPOR)">
              <span>🇮🇳</span>
              <span className="font-mono text-[11px] text-slate-600">IN</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* Hero Section Banner with Panoramic Station Visual */}
        <section className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white p-8 md:p-10 shadow-xl border border-navy-700/50">
          {/* Subtle Snowy Mountain Graphic Background Overlay */}
          <div 
            className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1600&q=80')`
            }}
          ></div>

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 font-semibold">
                STATION TELEMETRY OVERVIEW
              </span>
              <span className="h-px w-12 bg-cyan-400/50"></span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight mb-3">
              Real-time Insights.<br className="hidden sm:inline" /> Smarter Decisions.
            </h2>
            <p className="text-sm text-slate-300 font-normal leading-relaxed max-w-xl">
              Monitor critical systems, assess operational risks, and simulate predictive what-if scenarios for a safer, more resilient Antarctic station.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-800 font-semibold text-sm">Loading station data...</p>
            <p className="text-slate-500 font-mono text-xs mt-1">Connecting to http://127.0.0.1:8000/station/state</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50/90 border border-red-200 rounded-2xl text-center my-8 shadow-md">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="text-lg font-serif font-bold text-red-900">Failed to Load Station Data</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
            <p className="text-xs text-slate-600 mt-4">
              Make sure the FastAPI backend server is running on <code className="bg-white border border-slate-300 px-2 py-0.5 rounded text-blue-700 font-mono">http://127.0.0.1:8000</code>.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold transition shadow-sm active:scale-95"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Component 1: Telemetry Stat Cards */}
            <StationDashboard data={stationData} />

            {/* Component 2: What-If Scenario Simulator */}
            <WhatIfPanel baselineData={stationData} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 border-t border-slate-200/80 pt-6 mt-12 text-center text-xs text-slate-500 font-sans">
        Antarctic Station Digital Twin Platform &bull; Maitri Research Station (70°45′S, 11°44′E) &bull; SIH 2026 Hackathon
      </footer>
    </div>
  );

}
