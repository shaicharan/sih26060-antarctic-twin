"""
backend/app/routes/station.py

FastAPI router for Antarctic Station state, simulation, and AI advisor endpoints.
Provides GET /station/state, POST /simulate, and POST /advise.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models.simulation import (
    simulate_energy,
    simulate_fuel,
    simulate_inventory,
    calculate_risk,
    DEFAULT_CURRENT_FUEL,
    DEFAULT_TEMP,
    DEFAULT_CREW_SIZE,
    DEFAULT_GENERATOR_EFFICIENCY,
    DEFAULT_BATTERY_PCT,
    DEFAULT_ANOMALY_SCORE,
)
from app.models.ai_agent import get_recommendation

router = APIRouter()

DEFAULT_STATION_NAME = "Maitri Research Station"

DEFAULT_INVENTORY = [
    {"name": "Food Rations", "quantity": 1200.0, "daily_use": 25.0},
    {"name": "Medical Supplies", "quantity": 300.0, "daily_use": 5.0},
    {"name": "Generator Spare Parts", "quantity": 45.0, "daily_use": 1.0},
]


class InventoryItemInput(BaseModel):
    name: str
    quantity: float = Field(..., ge=0)
    daily_use: float = Field(..., ge=0)


class SimulationOverride(BaseModel):
    temp: Optional[float] = Field(None, description="Outdoor temperature in °C")
    crew_size: Optional[int] = Field(None, ge=1, description="Number of station crew members")
    generator_efficiency: Optional[float] = Field(None, ge=1, le=100, description="Generator efficiency %")
    current_fuel: Optional[float] = Field(None, ge=0, description="Current fuel in liters")
    battery_pct: Optional[float] = Field(None, ge=0, le=100, description="Backup battery charge %")
    equipment_anomaly_score: Optional[float] = Field(None, ge=0, le=1, description="Equipment anomaly score 0.0-1.0")
    inventory: Optional[List[InventoryItemInput]] = Field(None, description="Inventory items override list")


class ConversationTurn(BaseModel):
    question: str
    answer: str
    is_fallback: Optional[bool] = False


class AdviseRequest(BaseModel):
    station_state: Dict[str, Any] = Field(..., description="Current station telemetry state")
    scenario_result: Optional[Dict[str, Any]] = Field(None, description="Optional simulation result object")
    question: Optional[str] = Field(None, description="Free-text user question")
    conversation_history: Optional[List[ConversationTurn]] = Field(None, description="Running Q&A conversation history")
    risk_level: Optional[str] = Field(None, description="Risk level override or current risk")


def build_station_state(
    temp: float = DEFAULT_TEMP,
    crew_size: int = DEFAULT_CREW_SIZE,
    generator_efficiency: float = DEFAULT_GENERATOR_EFFICIENCY,
    current_fuel: float = DEFAULT_CURRENT_FUEL,
    battery_pct: float = DEFAULT_BATTERY_PCT,
    equipment_anomaly_score: float = DEFAULT_ANOMALY_SCORE,
    inventory_list: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Helper to assemble a complete station state dictionary using simulation models."""
    if inventory_list is None:
        inventory_list = DEFAULT_INVENTORY

    energy_res = simulate_energy(
        temp=temp,
        crew_size=crew_size,
        generator_efficiency=generator_efficiency,
    )

    fuel_res = simulate_fuel(
        current_fuel=current_fuel,
        consumption_rate=energy_res["estimated_fuel_rate_lpd"],
    )

    inventory_res = simulate_inventory(items=inventory_list)

    risk = calculate_risk(
        fuel_days_remaining=fuel_res["days_remaining"],
        battery_pct=battery_pct,
        equipment_anomaly_score=equipment_anomaly_score,
    )

    return {
        "station_name": DEFAULT_STATION_NAME,
        "environment": {
            "outdoor_temperature_celsius": float(temp),
            "crew_size": int(crew_size),
            "battery_pct": float(battery_pct),
            "equipment_anomaly_score": float(equipment_anomaly_score),
        },
        "energy": energy_res,
        "fuel": fuel_res,
        "inventory": inventory_res,
        "risk_assessment": {
            "level": risk,
            "risk_triggers": {
                "fuel_days_low": fuel_res["days_remaining"] < 20.0,
                "battery_low": battery_pct < 50.0,
                "equipment_anomaly_high": equipment_anomaly_score > 0.3,
            },
        },
    }


@router.get("/station/state")
def get_station_state() -> Dict[str, Any]:
    """
    Returns the current state of the Antarctic Research Station using seed values
    and pure Python simulation models.
    """
    return build_station_state()


@router.post("/simulate")
def run_simulation(override: SimulationOverride) -> Dict[str, Any]:
    """
    Accepts scenario override parameters and returns a before/after comparison
    showing changes in energy demand, fuel burn rate, days remaining, and risk level.
    """
    # 1. Baseline state
    before_state = build_station_state()

    # 2. Overridden state
    effective_temp = override.temp if override.temp is not None else DEFAULT_TEMP
    effective_crew = override.crew_size if override.crew_size is not None else DEFAULT_CREW_SIZE
    effective_eff = override.generator_efficiency if override.generator_efficiency is not None else DEFAULT_GENERATOR_EFFICIENCY
    effective_fuel = override.current_fuel if override.current_fuel is not None else DEFAULT_CURRENT_FUEL
    effective_batt = override.battery_pct if override.battery_pct is not None else DEFAULT_BATTERY_PCT
    effective_anom = override.equipment_anomaly_score if override.equipment_anomaly_score is not None else DEFAULT_ANOMALY_SCORE

    if override.inventory is not None:
        effective_inv = [item.model_dump() for item in override.inventory]
    else:
        effective_inv = DEFAULT_INVENTORY

    after_state = build_station_state(
        temp=effective_temp,
        crew_size=effective_crew,
        generator_efficiency=effective_eff,
        current_fuel=effective_fuel,
        battery_pct=effective_batt,
        equipment_anomaly_score=effective_anom,
        inventory_list=effective_inv,
    )

    # 3. Before/After Comparison
    temp_delta = round(after_state["environment"]["outdoor_temperature_celsius"] - before_state["environment"]["outdoor_temperature_celsius"], 2)
    demand_delta = round(after_state["energy"]["total_demand_kw"] - before_state["energy"]["total_demand_kw"], 2)
    fuel_rate_delta = round(after_state["fuel"]["consumption_rate_lpd"] - before_state["fuel"]["consumption_rate_lpd"], 2)
    fuel_days_delta = round(after_state["fuel"]["days_remaining"] - before_state["fuel"]["days_remaining"], 2)

    risk_before = before_state["risk_assessment"]["level"]
    risk_after = after_state["risk_assessment"]["level"]

    return {
        "before": before_state,
        "after": after_state,
        "comparison": {
            "temperature_delta_celsius": temp_delta,
            "total_demand_delta_kw": demand_delta,
            "fuel_consumption_rate_delta_lpd": fuel_rate_delta,
            "fuel_days_remaining_delta": fuel_days_delta,
            "risk_level_before": risk_before,
            "risk_level_after": risk_after,
            "risk_level_changed": risk_before != risk_after,
        },
    }


@router.post("/advise")
def get_station_advice(payload: AdviseRequest) -> Dict[str, Any]:
    """
    Returns conversational AI advisory recommendations based on station telemetry,
    scenario simulation, user questions, and conversation history.
    """
    history_list = [turn.model_dump() for turn in payload.conversation_history] if payload.conversation_history else None

    recommendation, is_fallback = get_recommendation(
        station_state=payload.station_state,
        scenario_result=payload.scenario_result,
        question=payload.question,
        conversation_history=history_list,
        risk_level=payload.risk_level,
    )
    return {
        "recommendation": recommendation,
        "is_fallback": is_fallback,
    }
