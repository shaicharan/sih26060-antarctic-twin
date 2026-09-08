"""
backend/app/models/simulation.py

Pure Python simulation functions for Antarctic Station Digital Twin.
Includes energy simulation, fuel depletion, inventory tracking, and risk assessment.
"""

from typing import List, Dict, Any, Union

# Default seed values for station simulation state
DEFAULT_CURRENT_FUEL = 22000.0  # Liters (increased from 15,000 so baseline risk is not HIGH)
DEFAULT_TEMP = 5.0  # °C (baseline outdoor temperature for LOW risk operation)
DEFAULT_CREW_SIZE = 25
DEFAULT_GENERATOR_EFFICIENCY = 85.0  # %
DEFAULT_BATTERY_PCT = 78.0  # %
DEFAULT_ANOMALY_SCORE = 0.12


def simulate_energy(
    temp: float,
    crew_size: int,
    generator_efficiency: float,
) -> Dict[str, Any]:
    """
    Simulates station energy requirements based on outdoor temperature, crew size, and generator efficiency.
    Heating demand rises linearly as outdoor temperature drops below 20.0 °C.
    """
    base_load_kw = 50.0  # Constant life-support & station operations load
    crew_load_kw = crew_size * 1.5  # 1.5 kW per crew member for personal equipment & facilities

    # Heating demand rises as outdoor temperature drops below 20 °C comfort threshold
    target_temp = 20.0
    heating_demand_kw = (target_temp - temp) * 2.5 if temp < target_temp else 0.0

    total_demand_kw = base_load_kw + crew_load_kw + heating_demand_kw

    # Normalize generator efficiency to fraction 0.0-1.0
    eff_fraction = generator_efficiency / 100.0 if generator_efficiency > 1.0 else generator_efficiency
    eff_fraction = max(0.1, min(1.0, eff_fraction))

    # Fuel consumption rate calculation (Liters Per Day)
    # Approx 3.5 kWh per liter of diesel at 100% generator efficiency
    hourly_fuel_liters = total_demand_kw / (eff_fraction * 3.5)
    daily_fuel_lpd = hourly_fuel_liters * 24.0

    return {
        "temperature_celsius": float(temp),
        "crew_size": int(crew_size),
        "generator_efficiency_pct": round(eff_fraction * 100.0, 2),
        "base_load_kw": round(base_load_kw, 2),
        "crew_load_kw": round(crew_load_kw, 2),
        "heating_demand_kw": round(heating_demand_kw, 2),
        "total_demand_kw": round(total_demand_kw, 2),
        "estimated_fuel_rate_lpd": round(daily_fuel_lpd, 2),
    }


def simulate_fuel(
    current_fuel: float,
    consumption_rate: float,
) -> Dict[str, Any]:
    """
    Simulates fuel depletion and estimates remaining operational days.
    """
    if consumption_rate > 0:
        days_remaining = current_fuel / consumption_rate
    else:
        days_remaining = 999.0

    return {
        "current_fuel_liters": round(float(current_fuel), 2),
        "consumption_rate_lpd": round(float(consumption_rate), 2),
        "days_remaining": round(days_remaining, 2),
    }


def simulate_inventory(
    items: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Simulates station inventory stock levels and days of supply remaining for each item.
    items format: list of dicts with 'name', 'quantity', 'daily_use'.
    """
    evaluated_items = []
    min_days = 999.0
    low_stock_count = 0

    for item in items:
        name = str(item.get("name", "Unknown Item"))
        quantity = float(item.get("quantity", 0.0))
        daily_use = float(item.get("daily_use", 1.0))

        days_left = quantity / daily_use if daily_use > 0 else 999.0
        is_low_stock = days_left < 30.0

        if is_low_stock:
            low_stock_count += 1
        if days_left < min_days:
            min_days = days_left

        evaluated_items.append({
            "name": name,
            "quantity": round(quantity, 2),
            "daily_use": round(daily_use, 2),
            "days_remaining": round(days_left, 2),
            "low_stock": is_low_stock,
        })

    return {
        "items": evaluated_items,
        "min_inventory_days": round(min_days, 2) if evaluated_items else 999.0,
        "low_stock_count": low_stock_count,
    }


def calculate_risk(
    fuel_days_remaining: float,
    battery_pct: float,
    equipment_anomaly_score: float,
) -> str:
    """
    Calculates overall station risk level ('LOW', 'MODERATE', or 'HIGH').
    Thresholds:
    - 20+ days fuel = LOW
    - 10 to 20 days fuel = MODERATE
    - under 12 days fuel = HIGH
    (Battery % and equipment anomaly score thresholds are preserved).
    """
    # Critical risk triggers (under ~10-12 days fuel, battery < 20%, or high anomaly score)
    if fuel_days_remaining < 12.0 or battery_pct < 20.0 or equipment_anomaly_score > 0.7:
        return "HIGH"

    # Warning / Moderate risk triggers (10-20 days fuel, battery < 50%, or moderate anomaly score)
    if fuel_days_remaining < 20.0 or battery_pct < 50.0 or equipment_anomaly_score > 0.3:
        return "MODERATE"

    return "LOW"
