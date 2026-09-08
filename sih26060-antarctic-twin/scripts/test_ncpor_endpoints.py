"""
scripts/test_ncpor_endpoints.py

Endpoint Validation Script for NCPOR Antarctic Research Station Weather Data Portal.
Tests all 10 confirmed endpoint combinations (2 stations x 5 parameters) for date 2025-12-07.

Usage:
    python scripts/test_ncpor_endpoints.py
"""

import sys
from datetime import date
from pathlib import Path
from typing import Dict, List, Any
import requests

BASE_URL = "https://data.ncpor.res.in"

ENDPOINTS = {
    "maitri": {
        "temp": f"{BASE_URL}/maitri/temp_csv",
        "ws": f"{BASE_URL}/maitri/ws_csv",
        "wd": f"{BASE_URL}/maitri/wd_csv",
        "ap": f"{BASE_URL}/maitri/ap_csv",
        "rh": f"{BASE_URL}/maitri/rh_csv",
    },
    "bharati": {
        "temp": f"{BASE_URL}/bharati/temp_csv",
        "ws": f"{BASE_URL}/bharati/ws_csv",
        "wd": f"{BASE_URL}/bharati/wd_csv",
        "ap": f"{BASE_URL}/bharati/ap_csv",
        "rh": f"{BASE_URL}/bharati/rh_csv",
    },
}

REFERERS = {
    "maitri": {
        "temp": f"{BASE_URL}/maitri/temp",
        "ws": f"{BASE_URL}/maitri/ws",
        "wd": f"{BASE_URL}/maitri/wd",
        "ap": f"{BASE_URL}/maitri/ap",
        "rh": f"{BASE_URL}/maitri/rh",
    },
    "bharati": {
        "temp": f"{BASE_URL}/bharati/temp",
        "ws": f"{BASE_URL}/bharati/ws",
        "wd": f"{BASE_URL}/bharati/wd",
        "ap": f"{BASE_URL}/bharati/ap",
        "rh": f"{BASE_URL}/bharati/rh",
    },
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
)

TARGET_DATE = date(2025, 12, 7)


def test_endpoint(
    session: requests.Session,
    station: str,
    parameter: str,
    target_date: date,
    base_data_dir: Path,
) -> Dict[str, Any]:
    url = ENDPOINTS[station][parameter]
    params = {
        "filter": target_date.year,
        "filter_month": target_date.month,
        "filter_day": target_date.day,
    }
    referer = REFERERS.get(station, {}).get(parameter, BASE_URL)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Referer": referer,
        "Connection": "keep-alive",
    }

    result: Dict[str, Any] = {
        "station": station.capitalize(),
        "parameter": parameter,
        "url": url,
        "status_code": None,
        "content_type": None,
        "header": None,
        "row_count": 0,
        "first_row": None,
        "last_row": None,
        "is_csv": False,
        "saved_path": None,
        "error": None,
    }

    try:
        response = session.get(url, params=params, headers=headers, timeout=30)
        result["status_code"] = response.status_code
        result["content_type"] = response.headers.get("Content-Type", "")

        if response.status_code != 200:
            result["error"] = f"HTTP {response.status_code}"
            return result

        body_text = response.text.strip()

        # Check for HTML error response
        if "<html" in body_text.lower() or "<!doctype html" in body_text.lower():
            result["error"] = "Returned HTML page instead of CSV"
            return result

        lines = [l for l in body_text.splitlines() if l.strip()]
        if not lines:
            result["error"] = "Empty response body"
            return result

        header_line = lines[0]
        data_rows = lines[1:]

        result["header"] = header_line
        result["row_count"] = len(data_rows)
        result["first_row"] = data_rows[0] if data_rows else None
        result["last_row"] = data_rows[-1] if data_rows else None
        result["is_csv"] = "," in header_line and not header_line.startswith("<")

        # Save raw CSV
        date_str = target_date.strftime("%Y-%m-%d")
        save_dir = base_data_dir / "raw" / station / parameter
        save_dir.mkdir(parents=True, exist_ok=True)
        save_file = save_dir / f"{date_str}.csv"
        save_file.write_bytes(response.content)
        result["saved_path"] = str(save_file)

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    print("=" * 80)
    print(f"NCPOR ENDPOINT VALIDATION TEST — Target Date: {TARGET_DATE}")
    print("=" * 80)

    base_data_dir = Path("data")
    session = requests.Session()

    results: List[Dict[str, Any]] = []

    for station in ["maitri", "bharati"]:
        for param in ["temp", "ws", "wd", "ap", "rh"]:
            res = test_endpoint(session, station, param, TARGET_DATE, base_data_dir)
            results.append(res)

    print("\n" + "=" * 80)
    print("DETAILED ENDPOINT VALIDATION SUMMARY")
    print("=" * 80)

    for r in results:
        st = r["station"]
        param = r["parameter"]
        url = r["url"]

        print(f"\n[{st} - {param.upper()}]")
        print(f"  URL:               {url}")
        print(f"  HTTP Status:       {r['status_code']}")
        print(f"  Content-Type:      {r['content_type']}")
        
        if r["error"]:
            print(f"  Validation Result: FAILED ({r['error']})")
        else:
            print(f"  Validation Result: PASSED")
            print(f"  Header:            {r['header']}")
            print(f"  Number of Rows:    {r['row_count']}")
            print(f"  First Data Row:    {r['first_row']}")
            print(f"  Last Data Row:     {r['last_row']}")
            print(f"  Looks Like CSV:    {r['is_csv']}")
            print(f"  Saved Raw File:    {r['saved_path']}")

    print("\n" + "=" * 80)
    print("VALIDATION TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
