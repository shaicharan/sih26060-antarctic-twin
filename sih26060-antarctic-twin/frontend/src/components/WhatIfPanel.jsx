import React, { useState } from 'react';
import { API_BASE_URL } from '../apiConfig';
const FALLBACK_ADVICE =
  "[AI Advisor Fallback] Fuel reserves declining faster than normal due to increased heating demand. Recommend reducing non-critical loads and reviewing resupply schedule.";

/**
 * WhatIfPanel Component
 * Provides interactive sliders for Temperature, Crew Size, and Generator Efficiency.
 * Runs simulation, automatically triggers AI advice, and supports multi-turn conversational Q&A.
 */
export default function WhatIfPanel({ baselineData }) {
  // Baseline initial values derived from baselineData or defaults
  const baseTemp = baselineData?.environment?.outdoor_temperature_celsius ?? baselineData?.environment?.temperature ?? 5.0;
  const baseCrew = baselineData?.environment?.crew_size ?? 25;
  const baseEff = baselineData?.energy?.generator_efficiency_pct ?? 85;

  // Interactive slider controls state
  const [temp, setTemp] = useState(baseTemp);
  const [crewSize, setCrewSize] = useState(baseCrew);
  const [generatorEff, setGeneratorEff] = useState(baseEff);

  // API response & UI states
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  // Conversational AI Advisor state
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isAdvising, setIsAdvising] = useState(false);

  // 1. Simulation & Automatic Initial Advice Handler
  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      setIsAdvising(true);
      setSimError(null);

      const payload = {
        temp: parseFloat(temp),
        crew_size: parseInt(crewSize, 10),
        generator_efficiency: parseFloat(generatorEff),
      };

      // Call POST /simulate
      const simResponse = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!simResponse.ok) {
        throw new Error(`Simulation failed (HTTP ${simResponse.status}: ${simResponse.statusText})`);
      }

      const simData = await simResponse.json();
      setSimulationResult(simData);
      setIsSimulating(false);

      // Automatically request initial advice for the new scenario
      const initialQuestion = `Summarize operational risks and recommended actions for a scenario with temperature ${temp}°C, crew ${crewSize}, efficiency ${generatorEff}%.`;

      try {
        const adviseResponse = await fetch(`${API_BASE_URL}/advise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            station_state: baselineData || simData.before,
            scenario_result: simData,
            question: initialQuestion,
            conversation_history: [],
            risk_level: simData.comparison.risk_level_after,
          }),
        });

        let initialAdviceText = FALLBACK_ADVICE;
        let isFallback = true;

        if (adviseResponse.ok) {
          const adviseData = await adviseResponse.json();
          initialAdviceText = adviseData.recommendation || FALLBACK_ADVICE;
          isFallback = adviseData.is_fallback ?? initialAdviceText.includes('[AI Advisor Fallback]');
        }

        // Initialize / reset conversation thread with initial scenario advice
        setConversationHistory([
          {
            question: "Initial Scenario Analysis",
            answer: initialAdviceText,
            isFallback: isFallback,
          },
        ]);
      } catch (adviseErr) {
        console.warn('AI Advisor fetch failed, using fallback advice:', adviseErr);
        setConversationHistory([
          {
            question: "Initial Scenario Analysis",
            answer: FALLBACK_ADVICE,
            isFallback: true,
          },
        ]);
      } finally {
        setIsAdvising(false);
      }
    } catch (err) {
      console.error('Error running simulation:', err);
      setSimError(err.message || 'Failed to execute simulation on backend server.');
      setIsSimulating(false);
      setIsAdvising(false);
    }
  };

  // 2. Interactive Free-Form Follow-Up Question Handler
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    const qText = userQuestion.trim();
    if (!qText || isAdvising) return;

    try {
      setIsAdvising(true);
      setUserQuestion('');

      const adviseResponse = await fetch(`${API_BASE_URL}/advise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_state: baselineData || simulationResult?.before || {},
          scenario_result: simulationResult,
          question: qText,
          conversation_history: conversationHistory,
          risk_level: simulationResult?.comparison?.risk_level_after || 'LOW',
        }),
      });

      let adviceText = FALLBACK_ADVICE;
      let isFallback = true;

      if (adviseResponse.ok) {
        const adviseData = await adviseResponse.json();
        adviceText = adviseData.recommendation || FALLBACK_ADVICE;
        isFallback = adviseData.is_fallback ?? adviceText.includes('[AI Advisor Fallback]');
      }

      setConversationHistory((prevHistory) => [
        ...prevHistory,
        { question: qText, answer: adviceText, isFallback: isFallback },
      ]);
    } catch (err) {
      console.warn('AI Advisor question call failed, using fallback advice:', err);
      setConversationHistory((prevHistory) => [
        ...prevHistory,
        { question: qText, answer: FALLBACK_ADVICE, isFallback: true },
      ]);
    } finally {
      setIsAdvising(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-sm mb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-serif font-bold text-navy-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-sm shrink-0">
              🧪
            </span>
            What-If Scenario Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Adjust station operating conditions to evaluate energy demand, fuel burn rates, and risk impact via live backend model.
          </p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className={`font-sans font-semibold px-6 py-2.5 rounded-lg shadow-sm text-xs flex items-center justify-center gap-2 transition-all duration-200 shrink-0 ${
            isSimulating
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
              : 'bg-navy-900 hover:bg-navy-800 text-white active:scale-95 shadow-navy-900/10'
          }`}
        >
          {isSimulating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <span>⚡</span> Simulate Scenario &rarr;
            </>
          )}
        </button>
      </div>

      {simError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-sans shadow-xs">
          <span>⚠️</span> <strong>Simulation Error:</strong> {simError}
        </div>
      )}

      {/* Slider Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Slider 1: Outdoor Temperature */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4.5 transition-all hover:border-blue-300">
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌡️</span> OUTDOOR TEMPERATURE
            </label>
            <span className="text-sm font-bold font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200">{temp} °C</span>
          </div>
          <input
            type="range"
            min="-50"
            max="10"
            step="1"
            value={temp}
            onChange={(e) => setTemp(parseFloat(e.target.value))}
            className="w-full my-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>-50 °C (Blizzard)</span>
            <span>+10 °C (Summer)</span>
          </div>
        </div>

        {/* Slider 2: Crew Size */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4.5 transition-all hover:border-blue-300">
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> STATION CREW SIZE
            </label>
            <span className="text-sm font-bold font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200">{crewSize} Members</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={crewSize}
            onChange={(e) => setCrewSize(parseInt(e.target.value, 10))}
            className="w-full my-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>5 Members (Skeleton)</span>
            <span>50 Members (Peak)</span>
          </div>
        </div>

        {/* Slider 3: Generator Efficiency */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4.5 transition-all hover:border-blue-300">
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> GENERATOR EFFICIENCY
            </label>
            <span className="text-sm font-bold font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200">{generatorEff} %</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={generatorEff}
            onChange={(e) => setGeneratorEff(parseFloat(e.target.value))}
            className="w-full my-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>50 % (Degraded)</span>
            <span>100 % (Optimal)</span>
          </div>
        </div>
      </div>

      {/* Before / After Comparison Table & Conversational AI Advisor */}
      {simulationResult && (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span className="text-blue-600">📊</span> Backend Simulation Results & Impact Analysis
            </h3>
            <span className="text-[10px] text-blue-700 font-mono bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              &lt;/&gt; Post / Simulate Executed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 font-sans">
              <thead className="text-[11px] font-mono text-slate-500 uppercase bg-slate-50/70 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-bold">PARAMETER / METRIC</th>
                  <th className="px-5 py-3 font-bold text-slate-500">BASELINE (BEFORE)</th>
                  <th className="px-5 py-3 font-bold text-blue-700">SIMULATED (AFTER)</th>
                  <th className="px-5 py-3 font-bold text-right">VARIANCE / DELTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {/* Temp */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Outdoor Temperature</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.environment.outdoor_temperature_celsius} °C</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{simulationResult.after.environment.outdoor_temperature_celsius} °C</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                    {simulationResult.comparison.temperature_delta_celsius > 0 ? `+${simulationResult.comparison.temperature_delta_celsius}` : simulationResult.comparison.temperature_delta_celsius} °C
                  </td>
                </tr>

                {/* Crew */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Crew Size</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.environment.crew_size} members</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{simulationResult.after.environment.crew_size} members</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                    {simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size > 0
                      ? `+${simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size}`
                      : simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size}
                  </td>
                </tr>

                {/* Generator Efficiency */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Generator Efficiency</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.energy.generator_efficiency_pct}%</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{simulationResult.after.energy.generator_efficiency_pct}%</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                    {round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct) > 0
                      ? `+${round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct)}`
                      : round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct)}%
                  </td>
                </tr>

                {/* Total Energy Demand */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Total Energy Demand</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.energy.total_demand_kw} kW</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-slate-900">{simulationResult.after.energy.total_demand_kw} kW</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.total_demand_delta_kw > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {simulationResult.comparison.total_demand_delta_kw > 0 ? `+${simulationResult.comparison.total_demand_delta_kw}` : simulationResult.comparison.total_demand_delta_kw} kW
                    </span>
                  </td>
                </tr>

                {/* Daily Fuel Burn Rate */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Estimated Fuel Consumption</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.fuel.consumption_rate_lpd} L/day</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-slate-900">{simulationResult.after.fuel.consumption_rate_lpd} L/day</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.fuel_consumption_rate_delta_lpd > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {simulationResult.comparison.fuel_consumption_rate_delta_lpd > 0 ? `+${simulationResult.comparison.fuel_consumption_rate_delta_lpd}` : simulationResult.comparison.fuel_consumption_rate_delta_lpd} L/day
                    </span>
                  </td>
                </tr>

                {/* Fuel Days Remaining */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">Fuel Days Remaining</td>
                  <td className="px-5 py-3 font-mono text-xs">{simulationResult.before.fuel.days_remaining} days</td>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-amber-700">{simulationResult.after.fuel.days_remaining} days</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.fuel_days_remaining_delta < 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {simulationResult.comparison.fuel_days_remaining_delta > 0 ? `+${simulationResult.comparison.fuel_days_remaining_delta}` : simulationResult.comparison.fuel_days_remaining_delta} days
                    </span>
                  </td>
                </tr>

                {/* Risk Level */}
                <tr className="bg-slate-50/60 font-medium">
                  <td className="px-5 py-3.5 font-bold text-slate-900">Station Risk Status</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formatRiskLabel(simulationResult.comparison.risk_level_before)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${
                        String(simulationResult.comparison.risk_level_after).toUpperCase().includes('HIGH')
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : String(simulationResult.comparison.risk_level_after).toUpperCase().includes('MODERATE')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {formatRiskLabel(simulationResult.comparison.risk_level_after)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold">
                    {simulationResult.comparison.risk_level_changed ? (
                      <span className="text-amber-600 animate-pulse">RISK LEVEL CHANGED</span>
                    ) : (
                      <span className="text-slate-400">UNCHANGED</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conversational Gemini AI Advisor Panel (Natural Conversational Q&A Thread) */}
          <div className="p-6 bg-slate-50/90 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-mono font-bold text-navy-900 uppercase tracking-wider">
                  Gemini Operations Advisor
                </h4>
                <p className="text-[11px] text-slate-500 font-sans">
                  Operational decision-support layer grounded in real simulation data
                </p>
              </div>
              <span className="text-[10px] text-blue-700 font-mono bg-white px-2.5 py-1 rounded border border-blue-200">
                POST /advise
              </span>
            </div>

            {/* Conversation Thread — Plain natural conversational thread format */}
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
              {conversationHistory.map((turn, idx) => (
                <div key={idx} className="space-y-3">
                  {turn.question && (
                    <div className="flex justify-end">
                      <div className="bg-blue-50 text-slate-800 rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs font-sans max-w-xl shadow-xs border-0">
                        {turn.question}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-start">
                    <div className="text-xs text-slate-700 font-sans leading-relaxed max-w-2xl px-1 py-0.5">
                      {turn.isFallback && (
                        <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 mb-1">
                          Fallback Advice
                        </span>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{turn.answer}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isAdvising && (
                <div className="flex justify-start">
                  <div className="text-xs text-blue-700 font-sans flex items-center gap-2 py-1 px-1">
                    <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Analyzing station data...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Question Form */}
            <form onSubmit={handleAskQuestion} className="flex gap-2.5 pt-3 border-t border-slate-200">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask follow-up (e.g. 'Why did risk increase?', 'What if temperature drops 10 degrees?')"
                disabled={isAdvising}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans transition shadow-xs"
              />
              <button
                type="submit"
                disabled={isAdvising || !userQuestion.trim()}
                className={`px-5 py-2.5 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isAdvising || !userQuestion.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-navy-900 hover:bg-navy-800 text-white shadow-sm active:scale-95'
                }`}
              >
                <span>Ask Advisor</span>
                <span>💬</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );


}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function formatRiskLabel(lvl) {
  if (!lvl) return 'LOW RISK';
  const str = String(lvl).toUpperCase().trim();
  if (str.endsWith('RISK')) return str;
  return `${str} RISK`;
}

