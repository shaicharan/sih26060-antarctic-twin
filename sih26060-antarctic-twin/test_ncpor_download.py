"""
Standalone test script — reproduces one captured NCPOR "Get Data" request.

Purpose: verify the endpoint, headers, and response format before building
the full downloader/cleaner pipeline. Does NOT modify or parse the data,
just saves it raw and reports basic facts about the response.

Usage:
    python test_ncpor_download.py
"""

import requests
from pathlib import Path

# --- Request setup, reproduced from the captured browser request ---

URL = "https://data.ncpor.res.in/maitri/temp_csv"

PARAMS = {
    "filter": 2026,
    "filter_month": 9,
    "filter_day": 5,
}

HEADERS = {
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8,"
        "application/signed-exchange;v=b3;q=0.7"
    ),
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
    # Referer matters here — some servers reject requests that don't look
    # like they came from clicking the button on the actual page.
    "Referer": "https://data.ncpor.res.in/maitri/temp",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
    ),
    # Sec-Fetch-* / sec-ch-ua headers are browser-internal signals; usually
    # not required for the server to respond, but included here since they
    # were present in the captured request. Safe to trim later if unneeded.
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
}

OUTPUT_PATH = Path("data/raw/test_maitri_temp_2026-09-05.csv")


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(URL, params=PARAMS, headers=HEADERS, timeout=30)

    print(f"Status code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    print(f"Final URL requested: {response.url}")

    if response.status_code != 200:
        print("Request did not succeed — not saving a file.")
        print("First 500 chars of response body for debugging:")
        print(response.text[:500])
        return

    # Save the response body completely unmodified — raw layer, no parsing.
    OUTPUT_PATH.write_bytes(response.content)

    line_count = response.text.count("\n") + 1
    print(f"Saved raw response to: {OUTPUT_PATH}")
    print(f"Line count in downloaded file: {line_count}")

    # Quick, non-destructive peek — first and last line only, for sanity.
    lines = response.text.splitlines()
    if lines:
        print(f"First line: {lines[0]}")
        print(f"Last line:  {lines[-1]}")


if __name__ == "__main__":
    main()
    