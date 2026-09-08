# NCPOR Antarctic Data Pipeline Documentation

Welcome to the data ingestion pipeline documentation for the **Antarctic Research Station Digital Twin (SIH 2026)**. This guide explains how raw weather data is safely collected, validated, and cleaned from the NCPOR Antarctic Weather Portal.

---

## 1. Overview Architecture Flow

```
+-------------------------------------------------------+
|  NCPOR Weather Portal (data.ncpor.res.in)             |
+-------------------------------------------------------+
                           |
                           v  (scripts/download_ncpor.py)
+-------------------------------------------------------+
|  CSV Endpoints (?filter=YYYY&filter_month=M&filter_day=D)|
+-------------------------------------------------------+
                           |
                           v  (Unmodified HTTP Body)
+-------------------------------------------------------+
|  RAW DATA (data/raw/<station>/<param>/YYYY-MM-DD.csv) |
|  * IMMUTABLE SACRED LAYER *                           |
+-------------------------------------------------------+
                           |
                           v  (scripts/test_ncpor_endpoints.py & scripts/inspect_ncpor_csv.py)
+-------------------------------------------------------+
|  Validation & Schema Inspection                       |
+-------------------------------------------------------+
                           |
                           v  (scripts/clean_ncpor.py)
+-------------------------------------------------------+
|  CLEAN DATA (data/clean/<station>/<param>/YYYY-MM-DD.csv)|
+-------------------------------------------------------+
                           |
                           v  (Phase 5 - Future Stage)
+-------------------------------------------------------+
|  Combined Station Dataset (Timestamp Join)            |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|  Future Analytics / Digital Twin Simulation Platform   |
+-------------------------------------------------------+
```

---

## 2. Component Pipeline Scripts

### Phase 1: Reusable Downloader (`scripts/download_ncpor.py`)
- **Purpose**: Fetches single-day weather CSVs from NCPOR.
- **Key Features**:
  - Automatically constructs URL queries with date parameters.
  - Validates station (`maitri`, `bharati`) and parameters (`temp`, `ws`, `wd`, `ap`, `rh`).
  - Checks HTTP 200 status, content type, and detects HTML error pages.
  - Saves exact raw responses to `data/raw/<station>/<parameter>/YYYY-MM-DD.csv`.
  - Skips already downloaded files unless `--overwrite` is specified.

### Phase 2: Endpoint Validation Test (`scripts/test_ncpor_endpoints.py`)
- **Purpose**: Tests all 10 NCPOR endpoints for a given date (`2025-12-07`).
- **Key Features**:
  - Reports HTTP status code, Content-Type, total rows, header names, first and last data rows.
  - Highlights endpoint availability and flags any HTTP 404 errors.

### Phase 3: CSV Schema Inspection (`scripts/inspect_ncpor_csv.py`)
- **Purpose**: Performs read-only analysis on downloaded raw CSV files.
- **Key Features**:
  - Checks column data types, row counts, and timestamp min/max bounds.
  - Detects duplicate timestamps and calculates sampling frequency.
  - Identifies missing values (NaNs) and sentinel values (e.g. `-999`).

### Phase 4: Data Cleaning Pipeline (`scripts/clean_ncpor.py`)
- **Purpose**: Transforms raw CSVs into clean, standardized datasets.
- **Rules**:
  1. Parses timestamps and sorts rows chronologically.
  2. Converts measurement values to numeric types.
  3. Maps sentinel values like `-999` to `NaN` (without altering valid negative temperatures).
  4. Deduplicates exact duplicate rows.
  5. Flags conflicting duplicate timestamps with `ambiguous_duplicate = True`.
  6. Never fabricates or interpolates missing timestamps or values.
  7. Output saved to `data/clean/<station>/<parameter>/YYYY-MM-DD.csv`.

---

## 3. Data Integrity & Safety Principles

1. **Raw Data is Sacred**: Never manually edit files inside `data/raw/`.
2. **No Data Fabrication**: We never fill in missing values or interpolate timestamps.
3. **Explicit Units**: Units are not assumed or converted until verified against official documentation.
