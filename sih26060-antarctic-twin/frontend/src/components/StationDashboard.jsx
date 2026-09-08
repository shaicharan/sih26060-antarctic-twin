import React from 'react';

/**
 * StationDashboard Component
 * Renders 4 stat cards using real live data from GET /station/state:
 * {
 *   station_name: "Maitri Research Station",
 *   environment: { outdoor_temperature_celsius: 5.0, battery_pct: 78.0 },
 *   fuel: { days_remaining: 21.82 },
 *   risk_assessment: { level: "LOW" }
 * }
 */
export default function StationDashboard({ data }) {
  const { environment, fuel, risk_assessment, station_name } = data || {};

  const temp = environment?.outdoor_temperature_celsius ?? environment?.temperature ?? 'N/A';
  const source = station_name ?? environment?.source ?? 'Maitri Research Station';
  const battery = environment?.battery_pct ?? data?.energy?.battery_pct ?? 'N/A';
  const fuelDays = fuel?.days_remaining ?? fuel?.days_until_exhaustion ?? 'N/A';
  const riskLevel = risk_assessment?.level ?? data?.risk ?? 'LOW';

  // Risk badge styling mapping
  const getRiskBadge = (level) => {
    switch (String(level).toUpperCase()) {
      case 'HIGH':
        return {
          bg: 'bg-red-950/80 border-red-600/60 text-red-300',
          dot: 'bg-red-500 animate-pulse',
          label: 'HIGH RISK',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/80 border-amber-600/60 text-amber-300',
          dot: 'bg-amber-500 animate-pulse',
          label: 'MODERATE RISK',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'LOW RISK',
        };
    }
  };

  const riskBadge = getRiskBadge(riskLevel);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>📊</span> Station Telemetry Overview
        </h2>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
          Source: {source}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1: Outdoor Temperature (REAL Data) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outdoor Temperature
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 uppercase tracking-wider">
                REAL
              </span>
              <span className="text-xl">🌡️</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-cyan-400">{temp}</span>
            <span className="text-lg text-slate-400 font-medium">°C</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Ambient Antarctic Temp
          </p>
        </div>

        {/* Stat Card 2: Battery Percentage (SIMULATED Data) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Backup Battery
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-700/60 uppercase tracking-wider">
                SIMULATED
              </span>
              <span className="text-xl">🔋</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-blue-400">{battery}</span>
            <span className="text-lg text-slate-400 font-medium">%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                battery > 50 ? 'bg-blue-400' : battery > 20 ? 'bg-amber-400' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(battery) || 0))}%` }}
            ></div>
          </div>
        </div>

        {/* Stat Card 3: Fuel Days Remaining (SIMULATED Data) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fuel Autonomy
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-700/60 uppercase tracking-wider">
                SIMULATED
              </span>
              <span className="text-xl">🛢️</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-amber-400">{fuelDays}</span>
            <span className="text-sm text-slate-400 font-medium">days left</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Depletion rate based on generator load
          </p>
        </div>

        {/* Stat Card 4: Overall Risk Level (SIMULATED Data) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall Station Risk
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-700/60 uppercase tracking-wider">
                SIMULATED
              </span>
              <span className="text-xl">⚠️</span>
            </div>
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold tracking-wide ${riskBadge.bg}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${riskBadge.dot}`}></span>
              {riskBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Real-time automated hazard engine
          </p>
        </div>
      </div>
    </div>
  );
}
