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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">
              ❄️
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
                Antarctic Station Digital Twin
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  SIH26060
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Maitri Station Operations & Predictive Simulation Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-400 animate-ping'}`}></span>
              <span>{loading ? 'CONNECTING...' : error ? 'OFFLINE' : 'LIVE API CONNECTED'}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              70°45'S, 11°44'E
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-300 font-medium text-sm">Loading station data...</p>
            <p className="text-slate-500 text-xs mt-1">Connecting to http://127.0.0.1:8000/station/state</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/80 border border-red-800 rounded-xl text-center my-8 shadow-xl">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-red-300">Failed to Load Station Data</h3>
            <p className="text-xs text-red-400 mt-1 max-w-md mx-auto">{error}</p>
            <p className="text-xs text-slate-400 mt-4">
              Make sure the FastAPI backend server is running on <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400 font-mono">http://127.0.0.1:8000</code>.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
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
      <footer className="max-w-7xl mx-auto px-6 border-t border-slate-900 pt-6 text-center text-xs text-slate-500">
        SIH 2026 Hackathon Demo — Antarctic Research Station Digital Twin Platform
      </footer>
    </div>
  );
}
