import React from 'react';
import { Thermometer, Battery, Fuel, Shield } from 'lucide-react';

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

  // Risk badge styling mapping (Ensuring consistent "LOW RISK", "MODERATE RISK", "HIGH RISK" format)
  const getRiskBadge = (level) => {
    const norm = String(level || 'LOW').toUpperCase();
    if (norm.includes('HIGH')) {
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500 animate-pulse',
        label: '▲ HIGH RISK',
      };
    }
    if (norm.includes('MODERATE')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500 animate-pulse',
        label: '▲ MODERATE RISK',
      };
    }
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: '▲ LOW RISK',
    };
  };

  const riskBadge = getRiskBadge(riskLevel);

  return (
    <div className="w-full mb-8 relative z-30">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Stat Card 1: Outdoor Temperature (REAL Data) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  OUTDOOR TEMPERATURE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                REAL
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold font-serif text-navy-900">{temp}</span>
              <span className="text-lg text-slate-500 font-sans font-medium">°C</span>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Ambient Antarctic Temp
            </p>
            {/* Sparkline Graphic */}
            <svg className="w-16 h-8 text-blue-500 shrink-0 opacity-80" viewBox="0 0 60 25" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M 0 18 Q 15 5 30 15 T 60 8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Stat Card 2: Backup Battery (SIMULATED Data) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Battery className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  BACKUP BATTERY
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                SIMULATED
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold font-serif text-navy-900">{battery}</span>
              <span className="text-lg text-slate-500 font-sans font-medium">%</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500 font-sans mb-2">
              Simulated after depletion rate model
            </p>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  Number(battery) > 50 ? 'bg-blue-600' : Number(battery) > 20 ? 'bg-amber-500' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, Number(battery) || 0))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stat Card 3: Fuel Autonomy (SIMULATED Data) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Fuel className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  FUEL AUTONOMY
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                SIMULATED
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-bold font-serif text-navy-900">{fuelDays}</span>
              <span className="text-xs text-slate-500 font-sans font-medium">days left</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 font-sans">
            Depletion rate based on generator load
          </p>
        </div>

        {/* Stat Card 4: Overall Station Risk (SIMULATED Data) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  OVERALL STATION RISK
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                SIMULATED
              </span>
            </div>

            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-bold font-mono tracking-wide ${riskBadge.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${riskBadge.dot}`}></span>
                {riskBadge.label}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <p className="text-xs text-slate-500 font-sans">
              Real-time automated hazard engine
            </p>
            {/* Spider / Radar Hazard Graphic */}
            <svg className="w-12 h-12 text-blue-400 opacity-60 shrink-0" viewBox="0 0 40 40">
              <polygon points="20,4 35,13 35,31 20,38 5,31 5,13" fill="none" stroke="currentColor" strokeWidth="1" />
              <polygon points="20,10 30,16 30,28 20,33 10,28 10,16" fill="rgba(2, 132, 199, 0.15)" stroke="#0284C7" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

