import React, { useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000';
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
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>🧪</span> What-If Scenario Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Adjust station operating conditions to evaluate energy demand, fuel burn rates, and risk impact via live backend model.
          </p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className={`font-bold px-6 py-2.5 rounded-lg shadow-lg text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            isSimulating
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95'
          }`}
        >
          {isSimulating ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <span>⚡</span> Simulate Scenario
            </>
          )}
        </button>
      </div>

      {simError && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-800 rounded-lg text-red-300 text-xs">
          ⚠️ <strong>Simulation Error:</strong> {simError}
        </div>
      )}

      {/* Slider Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Slider 1: Outdoor Temperature */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Outdoor Temperature
            </label>
            <span className="text-sm font-bold text-cyan-400">{temp} °C</span>
          </div>
          <input
            type="range"
            min="-50"
            max="10"
            step="1"
            value={temp}
            onChange={(e) => setTemp(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>-50 °C (Blizzard)</span>
            <span>+10 °C (Summer)</span>
          </div>
        </div>

        {/* Slider 2: Crew Size */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Station Crew Size
            </label>
            <span className="text-sm font-bold text-blue-400">{crewSize} Members</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={crewSize}
            onChange={(e) => setCrewSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>5 Members (Skeleton)</span>
            <span>50 Members (Peak)</span>
          </div>
        </div>

        {/* Slider 3: Generator Efficiency */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Generator Efficiency
            </label>
            <span className="text-sm font-bold text-amber-400">{generatorEff} %</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={generatorEff}
            onChange={(e) => setGeneratorEff(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>50 % (Degraded)</span>
            <span>100 % (Optimal)</span>
          </div>
        </div>
      </div>

      {/* Before / After Comparison Table & Conversational AI Advisor */}
      {simulationResult && (
        <div className="mt-6 bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>📋</span> Backend Simulation Results & Impact Analysis
            </h3>
            <span className="text-xs text-cyan-400 font-mono bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800">
              POST /simulate Executed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Parameter / Metric</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Baseline (Before)</th>
                  <th className="px-5 py-3 font-semibold text-cyan-400">Simulated (After)</th>
                  <th className="px-5 py-3 font-semibold text-right">Variance / Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* Temp */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Outdoor Temperature</td>
                  <td className="px-5 py-3">{simulationResult.before.environment.outdoor_temperature_celsius} °C</td>
                  <td className="px-5 py-3 font-bold text-cyan-300">{simulationResult.after.environment.outdoor_temperature_celsius} °C</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {simulationResult.comparison.temperature_delta_celsius > 0 ? `+${simulationResult.comparison.temperature_delta_celsius}` : simulationResult.comparison.temperature_delta_celsius} °C
                  </td>
                </tr>

                {/* Crew */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Crew Size</td>
                  <td className="px-5 py-3">{simulationResult.before.environment.crew_size} members</td>
                  <td className="px-5 py-3 font-bold text-blue-300">{simulationResult.after.environment.crew_size} members</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size > 0
                      ? `+${simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size}`
                      : simulationResult.after.environment.crew_size - simulationResult.before.environment.crew_size}
                  </td>
                </tr>

                {/* Generator Efficiency */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Generator Efficiency</td>
                  <td className="px-5 py-3">{simulationResult.before.energy.generator_efficiency_pct}%</td>
                  <td className="px-5 py-3 font-bold text-amber-300">{simulationResult.after.energy.generator_efficiency_pct}%</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct) > 0
                      ? `+${round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct)}`
                      : round2(simulationResult.after.energy.generator_efficiency_pct - simulationResult.before.energy.generator_efficiency_pct)}%
                  </td>
                </tr>

                {/* Total Energy Demand */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Total Energy Demand</td>
                  <td className="px-5 py-3">{simulationResult.before.energy.total_demand_kw} kW</td>
                  <td className="px-5 py-3 font-bold text-slate-100">{simulationResult.after.energy.total_demand_kw} kW</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.total_demand_delta_kw > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {simulationResult.comparison.total_demand_delta_kw > 0 ? `+${simulationResult.comparison.total_demand_delta_kw}` : simulationResult.comparison.total_demand_delta_kw} kW
                    </span>
                  </td>
                </tr>

                {/* Daily Fuel Burn Rate */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Estimated Fuel Consumption</td>
                  <td className="px-5 py-3">{simulationResult.before.fuel.consumption_rate_lpd} L/day</td>
                  <td className="px-5 py-3 font-bold text-slate-100">{simulationResult.after.fuel.consumption_rate_lpd} L/day</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.fuel_consumption_rate_delta_lpd > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {simulationResult.comparison.fuel_consumption_rate_delta_lpd > 0 ? `+${simulationResult.comparison.fuel_consumption_rate_delta_lpd}` : simulationResult.comparison.fuel_consumption_rate_delta_lpd} L/day
                    </span>
                  </td>
                </tr>

                {/* Fuel Days Remaining */}
                <tr className="hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium text-slate-200">Fuel Days Remaining</td>
                  <td className="px-5 py-3">{simulationResult.before.fuel.days_remaining} days</td>
                  <td className="px-5 py-3 font-bold text-amber-400">{simulationResult.after.fuel.days_remaining} days</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                    <span className={simulationResult.comparison.fuel_days_remaining_delta < 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {simulationResult.comparison.fuel_days_remaining_delta > 0 ? `+${simulationResult.comparison.fuel_days_remaining_delta}` : simulationResult.comparison.fuel_days_remaining_delta} days
                    </span>
                  </td>
                </tr>

                {/* Risk Level */}
                <tr className="bg-slate-900/60">
                  <td className="px-5 py-3.5 font-bold text-slate-100">Station Risk Status</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {simulationResult.comparison.risk_level_before}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold border ${
                        simulationResult.comparison.risk_level_after === 'HIGH'
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : simulationResult.comparison.risk_level_after === 'MODERATE'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {simulationResult.comparison.risk_level_after}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold">
                    {simulationResult.comparison.risk_level_changed ? (
                      <span className="text-amber-400 animate-pulse">RISK LEVEL CHANGED</span>
                    ) : (
                      <span className="text-slate-500">UNCHANGED</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conversational Gemini AI Advisor Panel */}
          <div className="p-5 bg-slate-900/95 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-xs shadow">
                  ✨
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Gemini Operations Advisor
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Ask questions or explore scenario impacts with the AI station advisor
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-purple-300 font-mono bg-purple-950/80 px-2.5 py-1 rounded border border-purple-800">
                POST /advise
              </span>
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
              {conversationHistory.map((turn, idx) => (
                <div key={idx} className="space-y-2">
                  {turn.question && (
                    <div className="flex justify-end">
                      <div className="bg-purple-950/70 border border-purple-800/80 text-purple-200 rounded-xl px-4 py-2 text-xs max-w-xl">
                        <span className="font-semibold text-purple-400 text-[10px] block mb-0.5">👤 User / Judge Question</span>
                        {turn.question}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-start">
                    <div className={`border rounded-xl p-4 text-xs max-w-2xl shadow-inner ${
                      turn.isFallback
                        ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                        : 'bg-slate-950/90 border-purple-900/50 text-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-indigo-400 text-[10px] flex items-center gap-1">
                          <span>✨</span> {turn.isFallback ? 'AI Advisor Fallback' : 'Gemini Operations Advisor'}
                        </span>
                        {turn.isFallback && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-300 border border-amber-700 uppercase">
                            Fallback
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{turn.answer}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isAdvising && (
                <div className="flex justify-start">
                  <div className="bg-slate-950/80 border border-slate-800 text-purple-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Gemini AI Advisor is analyzing station numbers...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Question Form */}
            <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2 border-t border-slate-800/60">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask follow-up (e.g. 'Why did risk increase?', 'What if temperature drops 10 degrees?')"
                disabled={isAdvising}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
              <button
                type="submit"
                disabled={isAdvising || !userQuestion.trim()}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isAdvising || !userQuestion.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 active:scale-95'
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
