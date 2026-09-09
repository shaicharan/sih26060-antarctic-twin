# 🧊 Antarctic Research Station Digital Twin — Technical Project State (`PROJECT_STATE.md`)

> **Document Version**: 1.0.0  
> **Target Audience**: AI Coding Assistants (Claude, Antigravity, Gemini), Technical Reviewers, and Hackathon Judges.  
> **Purpose**: Provide a complete, un-truncated, authoritative record of the codebase architecture, mathematical models, API schemas, data pipeline realities, and runtime behavior.

---

## 1. Project Overview

The **Antarctic Research Station Digital Twin** is an operational monitoring, predictive simulation, and AI-assisted decision-support platform engineered for **SIH26060** (Smart India Hackathon). Focused on India's **Maitri Research Station** in East Antarctica ($70^\circ 45'\text{S}, 11^\circ 44'\text{E}$), the system combines real polar meteorological data from the National Centre for Polar and Ocean Research (NCPOR) with a deterministic Python physics engine to simulate energy demand, generator fuel autonomy, and station risk levels under harsh weather scenarios. In addition, an integrated Gemini AI Operations Advisor provides data-grounded, multi-turn tactical recommendations for station commanders. **Current Deployment Status**: Local development environment only (FastAPI backend running on `http://127.0.0.1:8000`, Vite React frontend running on `http://localhost:5173`).

---

## 2. Full Repository Structure

Below is the complete, exact file tree of the workspace as it exists in production:

```text
sih26060-antarctic-twin/
├── .git/
├── .gitignore
├── README.md
├── requirements.txt
├── test_ncpor_download.py
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── db.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── ai_agent.py
│       │   └── simulation.py
│       └── routes/
│           ├── __init__.py
│           └── station.py
├── data/
│   └── raw/
│       ├── .gitkeep
│       ├── test_maitri_temp_2026-09-05.csv
│       ├── bharati/
│       └── maitri/
│           ├── ap/
│           ├── rh/
│           │   └── 2025-12-07.csv
│           └── temp/
│               ├── 2025-12-07.csv
│               └── 2026-09-05.csv
├── docs/
│   └── PROJECT_STATE.md
├── frontend/
│   ├── .gitignore
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── dist/
│   ├── public/
│   │   └── assets/
│   │       └── antarctic-station-bg.png
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       └── components/
│           ├── StationDashboard.jsx
│           └── WhatIfPanel.jsx
└── scripts/
    └── test_ncpor_endpoints.py
```

### Files Added / Evolved Across Development vs. Original Plan:
1. `backend/app/models/ai_agent.py`: Upgraded from a simple single-turn prompt wrapper to a robust multi-model SDK client (`google-genai` & `google.generativeai`) featuring regex-based scenario auto-detection (`detect_and_run_question_scenario`), multi-turn context support, sub-second model selection (`gemini-flash-lite-latest`), and 45s safety fallback handling.
2. `frontend/public/assets/antarctic-station-bg.png`: Added local high-resolution Antarctic station photograph ($1024 \times 341\text{ px}$) rendered in the hero section via CSS `mask-image` horizontal fade gradients.
3. `frontend/src/components/StationDashboard.jsx` & `WhatIfPanel.jsx`: Restyled into a light Antarctic polar design system using Lucide React icons (`Thermometer`, `Battery`, `Fuel`, `Shield`, `Snowflake`), standardized risk labels (`LOW RISK`, `MODERATE RISK`, `HIGH RISK`), and conversational chat bubbles.
4. `test_ncpor_download.py` & `scripts/test_ncpor_endpoints.py`: Validation tools created during early data discovery to test raw NCPOR weather endpoints.

---

## 3. Data Sources & Real vs. Simulated Mapping

### A. Field-by-Field Source Breakdown

| UI Field Name | Display Location | Sourced Type | Generating Function / Endpoint | Formula / Reason |
| :--- | :--- | :--- | :--- | :--- |
| **Outdoor Temperature** | Stat Card 1 & Table | **REAL** | `GET /station/state` $\rightarrow$ `build_station_state()` | Sourced from NCPOR Maitri historical surface weather observation snapshot ($5.0^\circ\text{C}$ baseline seed). |
| **Backup Battery** | Stat Card 2 | **SIMULATED** | `simulate_energy()` / `build_station_state()` | Baseline set to $78.0\%$. Real-time station SCADA battery telemetry is not exposed via NCPOR public weather portal. |
| **Current Fuel Reserves** | Backend State | **SIMULATED** | `DEFAULT_CURRENT_FUEL` | Baseline set to $22,000.0\text{ Liters}$. Fuel tank levels are classified station infrastructure. |
| **Fuel Consumption Rate** | Table & Calculations | **SIMULATED** | `simulate_energy()` | Calculated dynamically: $\text{Rate (L/day)} = \frac{\text{Total Demand (kW)} \times 24}{0.85 \times (\text{Generator Efficiency \%} / 100)}$. |
| **Fuel Autonomy Days** | Stat Card 3 & Table | **SIMULATED** | `simulate_fuel()` | Calculated dynamically: $\text{Days Remaining} = \frac{\text{Current Fuel (L)}}{\text{Consumption Rate (L/day)}}$. |
| **Total Energy Demand** | Table | **SIMULATED** | `simulate_energy()` | $\text{Demand (kW)} = 50.0 + (1.5 \times \text{Crew}) + \max(0, (20.0 - \text{Temp}) \times 2.5)$. Simulated due to non-public grid telemetry. |
| **Overall Station Risk** | Stat Card 4 & Table | **SIMULATED** | `calculate_risk()` | Evaluated via autonomy thresholds: $\ge 20\text{ days} \implies \text{LOW}$, $10\text{--}20\text{ days} \implies \text{MODERATE}$, $<10\text{ days} \implies \text{HIGH}$. |

### B. REAL Data Sourcing Details (NCPOR)
- **NCPOR Endpoint**: `https://data.ncpor.res.in/maitri/temp_csv`
- **Request Parameters**: `filter=2026&filter_month=9&filter_day=5` and `filter=2025&filter_month=12&filter_day=7`.
- **Fetch Mechanism**: Downloaded via Python `requests` script (`test_ncpor_download.py` and `scripts/test_ncpor_endpoints.py`) with custom HTTP headers mimicking Chrome navigation.
- **Refresh Frequency & Live vs. Seeded**: The running application uses **seeded historical snapshots** ($5.0^\circ\text{C}$ baseline). It does not execute live HTTP requests to NCPOR on every page refresh to avoid hitting rate limits or backend failures during hackathon demonstrations.

### C. Specific Confirmation Questions

#### 1. Is Wind Speed data used anywhere in the current running application?
**NO.** Wind speed data is not used in any calculation, UI component, or AI advisor prompt in the running application.
- *Background*: During validation using `scripts/test_ncpor_endpoints.py`, the NCPOR Maitri wind speed endpoint (`https://data.ncpor.res.in/maitri/ws_csv`) returned **HTTP 404 NOT_FOUND** (whereas the Bharati station wind speed endpoint worked). The decision was made to omit wind speed and focus the digital twin on temperature, heating load, generator efficiency, and fuel autonomy.

#### 2. Is Relative Humidity data used anywhere in the current running application?
**NO.** Relative humidity data is not used in the running application.
- *Background*: Relative humidity raw CSV files (`data/raw/maitri/rh/2025-12-07.csv`) were successfully fetched during initial endpoint testing, but relative humidity does not impact thermal heating load or generator fuel burn math, so it was excluded from the final scope.

#### 3. List of Raw CSV files in `data/raw/` and active application usage:
- `data/raw/test_maitri_temp_2026-09-05.csv` ($36.6\text{ KB}$): Saved during initial request testing. **UNUSED at runtime**.
- `data/raw/maitri/temp/2025-12-07.csv` ($35.6\text{ KB}$) & `2026-09-05.csv` ($36.6\text{ KB}$): Saved by endpoint test script. **UNUSED at runtime**.
- `data/raw/maitri/rh/2025-12-07.csv` ($36.4\text{ KB}$): Saved by endpoint test script. **UNUSED at runtime**.
- *Summary*: All files in `data/raw/` are static archival validation artifacts from early discovery work and are not read by the FastAPI backend at runtime.

---

## 4. Backend Architecture

### A. Backend File Overview
- `backend/.env`: Stores environment variables (`GEMINI_API_KEY`).
- `backend/requirements.txt`: Python package dependencies (`fastapi`, `uvicorn`, `pydantic`, `google-genai`, `python-dotenv`).
- `backend/app/main.py`: FastAPI app initialization, CORS middleware (`allow_origins=["*"]`), router registration.
- `backend/app/db.py`: SQLite database helper (`get_db_connection()`), creates `antarctic_twin.db` table `telemetry_logs` for historical data logging.
- `backend/app/models/simulation.py`: Core physics equations, inventory calculations, and risk threshold matrix.
- `backend/app/models/ai_agent.py`: Gemini AI API client, scenario question parser (`detect_and_run_question_scenario`), prompt builder, and fallback handler.
- `backend/app/routes/station.py`: API route handlers for `GET /station/state`, `POST /simulate`, and `POST /advise`.

---

### B. `backend/app/models/simulation.py` — Exact Physics Equations & Logic

#### Constants & Seed Values:
```python
DEFAULT_CURRENT_FUEL = 22000.0        # Liters (autonomy baseline)
DEFAULT_TEMP = 5.0                    # °C (NCPOR baseline)
DEFAULT_CREW_SIZE = 25                # Crew members
DEFAULT_GENERATOR_EFFICIENCY = 85.0   # %
DEFAULT_BATTERY_PCT = 78.0            # %
DEFAULT_ANOMALY_SCORE = 0.12          # 0.0 - 1.0 score
```

#### 1. `simulate_energy(temp, crew_size, generator_efficiency)`
- $\text{base\_load} = 50.0\text{ kW}$
- $\text{crew\_load} = \text{crew\_size} \times 1.5\text{ kW}$
- $\text{heating\_demand} = \max\left(0, (20.0 - \text{temp}) \times 2.5\text{ kW}\right)$
- $\text{total\_demand\_kw} = \text{base\_load} + \text{crew\_load} + \text{heating\_demand}$
- $\text{estimated\_fuel\_rate\_lpd} = \frac{\text{total\_demand\_kw} \times 24.0}{0.85 \times (\text{generator\_efficiency} / 100.0)}$

#### 2. `simulate_fuel(current_fuel, consumption_rate)`
- $\text{days\_remaining} = \frac{\text{current\_fuel}}{\text{consumption\_rate}}$

#### 3. `calculate_risk(fuel_days_remaining, battery_pct, equipment_anomaly_score)`
- **`HIGH` Risk** if:
  - $\text{fuel\_days\_remaining} < 10.0$ OR
  - $\text{battery\_pct} < 30.0$ OR
  - $\text{equipment\_anomaly\_score} > 0.7$
- **`MODERATE` Risk** if:
  - $10.0 \le \text{fuel\_days\_remaining} < 20.0$ OR
  - $30.0 \le \text{battery\_pct} < 50.0$ OR
  - $0.3 < \text{equipment\_anomaly\_score} \le 0.7$
- **`LOW` Risk** if:
  - $\text{fuel\_days\_remaining} \ge 20.0$ AND
  - $\text{battery\_pct} \ge 50.0$ AND
  - $\text{equipment\_anomaly\_score} \le 0.3$

---

### C. `backend/app/models/ai_agent.py` — Gemini Advisor & Scenario Parser

#### 1. Model Candidate Priority Chain:
`model_candidates = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash"]`
- Uses official `google.genai` SDK (`genai.Client(api_key=api_key)`) to execute sub-second generations ($<1.5\text{s}$).

#### 2. `detect_and_run_question_scenario()`:
Inspects incoming user questions via regular expressions to detect numerical what-if shifts:
- Temperature drops/rises: e.g. *"drops another 10"*, *"falls by 15"*, *"temp is -40"*.
- Crew size changes: e.g. *"crew size becomes 50"*, *"40 people"*.
- Generator efficiency changes: e.g. *"efficiency drops to 70%"*.
- *Execution*: When detected, it executes `simulate_energy()`, `simulate_fuel()`, and `calculate_risk()` in Python to compute exact target values ($\text{demand}$, $\text{fuel\_rate}$, $\text{days\_remaining}$, $\text{risk\_level}$) and appends them to the Gemini prompt under `NEW SCENARIO COMPUTED BY DETERMINISTIC PYTHON ENGINE`.

#### 3. Prompt Construction:
Combines Ground-Truth Baseline Telemetry, Active Simulated Scenario Result, Question Re-simulation Data, and the last 4 conversation turns from `conversation_history`.

#### 4. Execution Timeout & Exact Fallback Message:
Wrapped in a $45.0\text{-second}$ `ThreadPoolExecutor` timeout. On failure or missing API key, returns `(FALLBACK_RECOMMENDATION, True)`:
```text
"[AI Advisor Fallback] Fuel reserves declining faster than normal due to increased heating demand. Recommend reducing non-critical loads and reviewing resupply schedule."
```

---

### D. REST API Endpoints Schema

#### 1. `GET /station/state`
- **Purpose**: Returns current baseline telemetry state of Maitri Station.
- **Response Example**:
  ```json
  {
    "station_name": "Maitri Research Station",
    "environment": {
      "outdoor_temperature_celsius": 5.0,
      "crew_size": 25,
      "battery_pct": 78.0,
      "equipment_anomaly_score": 0.12
    },
    "energy": {
      "temperature_celsius": 5.0,
      "crew_size": 25,
      "generator_efficiency_pct": 85.0,
      "base_load_kw": 50.0,
      "crew_load_kw": 37.5,
      "heating_demand_kw": 37.5,
      "total_demand_kw": 125.0,
      "estimated_fuel_rate_lpd": 1008.4
    },
    "fuel": {
      "current_fuel_liters": 22000.0,
      "consumption_rate_lpd": 1008.4,
      "days_remaining": 21.82
    },
    "inventory": {
      "items": [
        { "name": "Food Rations", "quantity": 1200.0, "daily_use": 25.0, "days_remaining": 48.0, "low_stock": false },
        { "name": "Medical Supplies", "quantity": 300.0, "daily_use": 5.0, "days_remaining": 60.0, "low_stock": false },
        { "name": "Generator Spare Parts", "quantity": 45.0, "daily_use": 1.0, "days_remaining": 45.0, "low_stock": false }
      ],
      "min_inventory_days": 45.0,
      "low_stock_count": 0
    },
    "risk_assessment": {
      "level": "LOW",
      "risk_triggers": {
        "fuel_days_low": false,
        "battery_low": false,
        "equipment_anomaly_high": false
      }
    }
  }
  ```

#### 2. `POST /simulate`
- **Purpose**: Accepts scenario overrides and returns before/after impact comparison.
- **Request Example**:
  ```json
  {
    "temp": -35.0,
    "crew_size": 30,
    "generator_efficiency": 85.0
  }
  ```
- **Response Example**:
  ```json
  {
    "before": { /* Full baseline station state object */ },
    "after": { /* Full simulated station state object */ },
    "comparison": {
      "temperature_delta_celsius": -40.0,
      "total_demand_delta_kw": 70.0,
      "fuel_consumption_rate_delta_lpd": 563.6,
      "fuel_days_remaining_delta": -7.83,
      "risk_level_before": "LOW",
      "risk_level_after": "MODERATE",
      "risk_level_changed": true
    }
  }
  ```

#### 3. `POST /advise`
- **Purpose**: Generates data-grounded AI recommendations for station operators/judges.
- **Request Example**:
  ```json
  {
    "station_state": { /* Station telemetry object */ },
    "scenario_result": { /* Optional latest /simulate response */ },
    "question": "Why did risk increase?",
    "conversation_history": [
      { "question": "Initial Scenario Analysis", "answer": "Fuel burn increased...", "is_fallback": false }
    ],
    "risk_level": "MODERATE"
  }
  ```
- **Response Example**:
  ```json
  {
    "recommendation": "The risk level escalated to MODERATE because outdoor temperature dropped to -35.0 °C, increasing total energy demand to 195.0 kW and reducing fuel autonomy to 13.99 days.",
    "is_fallback": false
  }
  ```

---

## 5. Frontend Architecture

### A. Component File Overview
1. **`src/App.jsx`**:
   - Renders header navigation bar with Lucide `Snowflake` logo, Maitri station coordinates (`70°45'S, 11°44'E`), and live API status badge.
   - Renders compact hero banner using `/assets/antarctic-station-bg.png` background image with CSS `mask-image` horizontal fade gradient (`WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 25%, rgba(0,0,0,0.3) 45%, black 70%)'`).
   - Manages global `useEffect` fetch for `GET /station/state`. Renders loading spinner and connection error retry screen.
2. **`src/components/StationDashboard.jsx`**:
   - Renders 4 Telemetry Stat Cards: Outdoor Temperature [REAL], Backup Battery [SIMULATED], Fuel Autonomy [SIMULATED], Overall Station Risk [SIMULATED].
   - Uses Lucide React icons (`Thermometer`, `Battery`, `Fuel`, `Shield`) and formats risk labels consistently (`LOW RISK`, `MODERATE RISK`, `HIGH RISK`).
   - Renders SVG sparkline mini-graph on Temperature card and radar/spider hazard graphic on Risk card.
3. **`src/components/WhatIfPanel.jsx`**:
   - Renders What-If Scenario Simulator with 3 range sliders (Temperature: -50°C to +10°C, Crew Size: 5 to 50, Efficiency: 50% to 100%).
   - Action Button: `⚡ Simulate Scenario →` executing `handleSimulate()`.
   - Renders Backend Simulation Results & Impact Analysis Table.
   - Renders Gemini Operations Advisor conversational chat thread (user questions as light blue right-aligned bubbles; AI answers as left-aligned plain text with generous line spacing).

### B. State Flow & Fetch Lifecycle
- **On Component Mount**: `App.jsx` runs `useEffect()` $\rightarrow$ executes `GET /station/state` $\rightarrow$ stores JSON in `stationData` state $\rightarrow$ passes data down as props to `StationDashboard` and `WhatIfPanel`.
- **On Slider Adjustment**: Moving sliders updates local state (`temp`, `crewSize`, `generatorEff`) in `WhatIfPanel.jsx`.
- **On "Simulate Scenario" Click**: `handleSimulate()` calls `POST /simulate` $\rightarrow$ sets `simulationResult` state $\rightarrow$ automatically executes initial `POST /advise` request $\rightarrow$ initializes `conversationHistory` state array.
- **On Question Submission**: Form submit calls `handleAskQuestion()` $\rightarrow$ executes `POST /advise` with `conversationHistory` $\rightarrow$ appends turn `{ question, answer, isFallback }` to `conversationHistory`.

---

## 6. Known Issues / Limitations

1. **Maitri Wind Speed Endpoint HTTP 404**:
   - NCPOR's Maitri wind speed endpoint (`https://data.ncpor.res.in/maitri/ws_csv`) returns HTTP 404. Wind speed data is not integrated or used in the application.
2. **Data Quality & Timestamp Anomalies in Raw Data**:
   - Raw CSV files in `data/raw/` exhibit non-uniform sampling frequencies (Bharati station logs data every 10-15 minutes, whereas Maitri logs hourly). Because the running app uses deterministic equations seeded with baseline temperature, raw historical CSV anomalies do not cause runtime exceptions.
3. **Environment Variable Backend Restart Requirement**:
   - If `GEMINI_API_KEY` is added to `backend/.env` while Uvicorn is running, Uvicorn must be restarted (`Ctrl + C` then rerun) to load the new key into process memory.

---

## 7. How to Run

### Step 1: Clone & Configure `.env`
Ensure `GEMINI_API_KEY` is set in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 2: Start Backend Server (Terminal 1)
```powershell
cd backend
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at `http://127.0.0.1:8000`.*

### Step 3: Start Frontend Server (Terminal 2)
```powershell
cd frontend
$env:Path += ";C:\Program Files\nodejs"; npm.cmd run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 8. What Would Need to Change for a Real Production Deployment

1. **Live SCADA & IoT Sensor Integration**: Replace hardcoded baseline seed values with real-time Modbus/MQTT sensor feeds for generator fuel flow meters and battery management systems (BMS).
2. **NCPOR Background Ingestion Cron**: Implement a recurring background worker (e.g. Celery / APScheduler) to poll NCPOR weather endpoints daily, store cleaned records in PostgreSQL / TimescaleDB, and expose real-time time-series telemetry.
3. **Persistent Database Layer**: Upgrade `backend/app/db.py` from local SQLite (`antarctic_twin.db`) to PostgreSQL with Alembic migrations.
4. **Authentication & Authorization**: Add OAuth2 / JWT authentication to secure station control endpoints.
5. **Containerization & CI/CD**: Package backend and frontend into Docker containers (`Dockerfile`, `docker-compose.yml`) for deployment on cloud edge infrastructure.
