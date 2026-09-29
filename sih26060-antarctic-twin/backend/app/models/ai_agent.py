"""
backend/app/models/ai_agent.py

Gemini AI Operations Advisor for Antarctic Research Station Digital Twin.
Integrates live Gemini API (google-genai & google.generativeai) with deterministic
Python simulation data for high-quality, data-grounded operational recommendations.
"""

import os
import re
import traceback
import concurrent.futures
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

from app.models.simulation import (
    simulate_energy,
    simulate_fuel,
    calculate_risk,
    DEFAULT_CURRENT_FUEL,
    DEFAULT_BATTERY_PCT,
    DEFAULT_ANOMALY_SCORE,
)

# Load environment variables from .env file
load_dotenv()

FALLBACK_RECOMMENDATION = (
    "[AI Advisor Fallback] Fuel reserves declining faster than normal due to increased heating demand. "
    "Recommend reducing non-critical loads and reviewing resupply schedule."
)


def detect_and_run_question_scenario(
    question: str,
    current_temp: float,
    current_crew: int,
    current_eff: float,
    current_fuel: float = DEFAULT_CURRENT_FUEL,
) -> Optional[Dict[str, Any]]:
    """
    Detects if a user question implies a numerical what-if scenario change
    (e.g., 'what if temperature drops another 10 degrees' or 'crew increases to 50')
    and executes the deterministic Python simulation engine to produce ground-truth numbers.
    """
    if not question:
        return None

    q_lower = question.lower()

    target_temp = current_temp
    target_crew = current_crew
    target_eff = current_eff

    # 1. Temperature change detection
    # "drops another 10", "drops 10", "drops by 15", "falls 10 degrees"
    temp_drop_another = re.search(r'(?:drop|decrease|fall|lower)s?\s*(?:another|by)?\s*(\d+)', q_lower)
    temp_rise_another = re.search(r'(?:increase|rise|climb|warm)s?\s*(?:another|by)?\s*(\d+)', q_lower)
    temp_set = re.search(r'temp(?:erature)?\s*(?:is|=)?\s*(-?\d+)', q_lower)

    if temp_drop_another:
        target_temp = current_temp - float(temp_drop_another.group(1))
    elif temp_rise_another:
        target_temp = current_temp + float(temp_rise_another.group(1))
    elif temp_set:
        target_temp = float(temp_set.group(1))

    # 2. Crew size change detection
    # "crew size increases to 50", "crew becomes 40", "50 crew members"
    crew_set = re.search(r'crew\s*(?:size)?\s*(?:increases?\s*to|becomes?|to|=|is)?\s*(\d+)', q_lower)
    crew_num = re.search(r'(\d+)\s*(?:crew|people|members|personnel)', q_lower)

    if crew_set:
        target_crew = int(crew_set.group(1))
    elif crew_num:
        target_crew = int(crew_num.group(1))

    # 3. Generator efficiency change detection
    eff_set = re.search(r'(?:efficiency|eff)\s*(?:drops?\s*to|becomes?|is|=)?\s*(\d+)\s*%', q_lower)
    eff_num = re.search(r'(\d+)\s*%\s*(?:efficiency|eff)', q_lower)

    if eff_set:
        target_eff = float(eff_set.group(1))
    elif eff_num:
        target_eff = float(eff_num.group(1))

    # If any parameter changed, execute Python simulation engine
    if target_temp != current_temp or target_crew != current_crew or target_eff != current_eff:
        energy_res = simulate_energy(target_temp, target_crew, target_eff)
        fuel_res = simulate_fuel(current_fuel, energy_res["estimated_fuel_rate_lpd"])
        risk = calculate_risk(fuel_res["days_remaining"], DEFAULT_BATTERY_PCT, DEFAULT_ANOMALY_SCORE)

        return {
            "target_temp": target_temp,
            "target_crew": target_crew,
            "target_eff": target_eff,
            "total_demand_kw": energy_res["total_demand_kw"],
            "fuel_rate_lpd": energy_res["estimated_fuel_rate_lpd"],
            "days_remaining": fuel_res["days_remaining"],
            "risk_level": risk,
            "temp_delta": round(target_temp - current_temp, 2),
            "demand_delta": round(energy_res["total_demand_kw"] - simulate_energy(current_temp, current_crew, current_eff)["total_demand_kw"], 2),
        }

    return None


def call_gemini_api(prompt: str, api_key: str) -> str:
    """
    Executes Gemini API call using google-genai or google.generativeai SDK.
    """
    model_candidates = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-1.5-pro",
    ]


    # Try official google-genai SDK first
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model_name in model_candidates:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                print(f"[AI Advisor] Model {model_name} failed: {e}")
                continue
    except ImportError:
        pass

    # Fallback to google.generativeai SDK
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        for model_name in model_candidates:
            try:
                model = genai.GenerativeModel(model_name)
                res = model.generate_content(prompt)
                if res and res.text:
                    return res.text.strip()
            except Exception as e:
                print(f"[AI Advisor] Fallback model {model_name} failed: {e}")
                continue
    except Exception:
        pass

    raise RuntimeError("All Gemini model generation attempts failed.")


def get_recommendation(
    station_state: Dict[str, Any],
    scenario_result: Optional[Dict[str, Any]] = None,
    question: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    risk_level: Optional[str] = None,
) -> Tuple[str, bool]:
    """
    Generates data-grounded Gemini AI recommendations for station operators/judges.
    Returns Tuple[recommendation_text: str, is_fallback: bool].
    """
    # Check for API Key in environment or .env
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        print("[AI Advisor] Warning: GEMINI_API_KEY is not set or empty in backend/.env. Using fallback.")
        return FALLBACK_RECOMMENDATION, True

    try:
        # Extract baseline telemetry numbers
        env_state = station_state.get("environment", {})
        energy_state = station_state.get("energy", {})
        fuel_state = station_state.get("fuel", {})
        risk_state = station_state.get("risk_assessment", {})

        base_temp = float(env_state.get("outdoor_temperature_celsius", 5.0))
        base_crew = int(env_state.get("crew_size", 25))
        base_eff = float(energy_state.get("generator_efficiency_pct", 85.0))
        base_fuel = float(fuel_state.get("current_fuel_liters", DEFAULT_CURRENT_FUEL))
        base_demand = float(energy_state.get("total_demand_kw", 125.0))
        base_fuel_rate = float(fuel_state.get("consumption_rate_lpd", 1008.4))
        base_fuel_days = float(fuel_state.get("days_remaining", 21.82))
        base_risk = risk_state.get("level", "LOW")

        # Context active scenario (if present)
        curr_temp = base_temp
        curr_crew = base_crew
        curr_eff = base_eff

        if scenario_result:
            after_env = scenario_result.get("after", {}).get("environment", {})
            after_energy = scenario_result.get("after", {}).get("energy", {})
            curr_temp = float(after_env.get("outdoor_temperature_celsius", base_temp))
            curr_crew = int(after_env.get("crew_size", base_crew))
            curr_eff = float(after_energy.get("generator_efficiency_pct", base_eff))

        # Check if question implies a NEW scenario re-simulation
        new_scenario = detect_and_run_question_scenario(
            question=question,
            current_temp=curr_temp,
            current_crew=curr_crew,
            current_eff=curr_eff,
            current_fuel=base_fuel,
        )

        # Build prompt grounded strictly in simulation numbers
        prompt = (
            "You are the Chief Operations Advisor for Maitri Antarctic Research Station.\n"
            "SYSTEM DIRECTIVES:\n"
            "1. You are advising hackathon judges and station commanders.\n"
            "2. Base your response STRICTLY on the actual ground-truth simulation numbers provided below.\n"
            "3. DO NOT invent or fabricate any numbers not present in this prompt.\n"
            "4. Provide a clear, operational, 2 to 5 sentence answer (under 120 words).\n"
            "5. Include actual numbers from the data (temperature °C, demand in kW, fuel in L/day, fuel days, risk levels).\n"
            "6. Explain WHY metrics changed (e.g. heating demand increase due to temp drop) and state concrete actionable recommendations.\n\n"
            "GROUND-TRUTH STATION TELEMETRY (BASELINE):\n"
            f"- Outdoor Temp: {base_temp} °C\n"
            f"- Crew Size: {base_crew} members\n"
            f"- Generator Efficiency: {base_eff}%\n"
            f"- Total Demand: {base_demand} kW\n"
            f"- Fuel Consumption: {base_fuel_rate} L/day\n"
            f"- Fuel Days Remaining: {base_fuel_days} days\n"
            f"- Baseline Risk Level: {base_risk}\n"
        )

        if scenario_result:
            after_env = scenario_result.get("after", {}).get("environment", {})
            after_energy = scenario_result.get("after", {}).get("energy", {})
            after_fuel = scenario_result.get("after", {}).get("fuel", {})
            comp = scenario_result.get("comparison", {})

            prompt += (
                f"\nACTIVE SIMULATED SCENARIO RESULT:\n"
                f"- Simulated Outdoor Temp: {after_env.get('outdoor_temperature_celsius')} °C\n"
                f"- Simulated Energy Demand: {after_energy.get('total_demand_kw')} kW (Delta: {comp.get('total_demand_delta_kw')} kW)\n"
                f"- Fuel Consumption Rate: {after_fuel.get('consumption_rate_lpd')} L/day (Delta: {comp.get('fuel_consumption_rate_delta_lpd')} L/day)\n"
                f"- Fuel Days Remaining: {after_fuel.get('days_remaining')} days (Delta: {comp.get('fuel_days_remaining_delta')} days)\n"
                f"- Scenario Risk Level: {comp.get('risk_level_after')} (Risk Changed: {comp.get('risk_level_changed')})\n"
            )

        if new_scenario:
            prompt += (
                f"\nNEW SCENARIO COMPUTED BY DETERMINISTIC PYTHON ENGINE FOR THIS QUESTION:\n"
                f"- Target Temp: {new_scenario['target_temp']} °C (Delta from previous: {new_scenario['temp_delta']} °C)\n"
                f"- Target Crew: {new_scenario['target_crew']} members\n"
                f"- Target Efficiency: {new_scenario['target_eff']}%\n"
                f"- Computed Energy Demand: {new_scenario['total_demand_kw']} kW\n"
                f"- Computed Fuel Rate: {new_scenario['fuel_rate_lpd']} L/day\n"
                f"- Computed Days Remaining: {new_scenario['days_remaining']} days\n"
                f"- Computed Risk Level: {new_scenario['risk_level']}\n"
            )

        if conversation_history:
            prompt += "\nRECENT CONVERSATION HISTORY:\n"
            for turn in conversation_history[-4:]:  # Include last 4 turns for concise context
                q = turn.get("question", "")
                a = turn.get("answer", "")
                if q and a:
                    prompt += f"User: {q}\nAdvisor: {a}\n"

        if question:
            prompt += f"\nJUDGE / USER QUESTION: \"{question}\"\nGive a direct 2-4 sentence operational answer using the data above:"
        else:
            prompt += "\nINSTRUCTION: Summarize the key operational risk cause and give 2 concrete recommended actions for the commander:"

        # Enforce 45-second timeout with ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(call_gemini_api, prompt, api_key)
            result = future.result(timeout=45.0)
            if result:
                return result, False

        return FALLBACK_RECOMMENDATION, True

    except Exception:
        # Log actual exception stack trace in backend terminal without exposing API key
        print("\n[AI Advisor Exception Traceback]")
        traceback.print_exc()
        return FALLBACK_RECOMMENDATION, True

