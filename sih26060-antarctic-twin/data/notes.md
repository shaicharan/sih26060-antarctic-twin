# NCPOR Endpoint Validation Results (Date: 2025-12-07)

## Endpoint Validation Summary

| Station | Parameter | Endpoint URL | Status | Content-Type | Header | Data Rows | First Data Row | Last Data Row | Result |
|---|---|---|---|---|---|---|---|---|---|
| **Maitri** | `temp` | `https://data.ncpor.res.in/maitri/temp_csv` | **200 OK** | `text/csv` | `date,temp` | 1,401 | `2025-12-07 23:59:00,-2.80` | `2025-12-07 00:00:00,-2.80` | **PASSED** |
| **Maitri** | `ap` | `https://data.ncpor.res.in/maitri/ap_csv` | **200 OK** | `text/csv` | `date,ap` | 1,401 | `2025-12-07 23:59:00,981.90` | `2025-12-07 00:00:00,980.00` | **PASSED** |
| **Maitri** | `rh` | `https://data.ncpor.res.in/maitri/rh_csv` | **200 OK** | `text/csv` | `date,rh` | 1,401 | `2025-12-07 23:59:00,41.30` | `2025-12-07 00:00:00,38.90` | **PASSED** |
| **Maitri** | `ws` | `https://data.ncpor.res.in/maitri/ws_csv` | **404** | `text/html` | N/A | 0 | N/A | N/A | **FAILED (HTTP 404)** |
| **Maitri** | `wd` | `https://data.ncpor.res.in/maitri/wd_csv` | **404** | `text/html` | N/A | 0 | N/A | N/A | **FAILED (HTTP 404)** |
| **Bharati** | `temp` | `https://data.ncpor.res.in/bharati/temp_csv` | **200 OK** | `text/csv` | `date,temp` | 1,429 | `2025-12-07 00:00:00,0.00` | `2025-12-07 23:59:00,-2.90` | **PASSED** |
| **Bharati** | `ws` | `https://data.ncpor.res.in/bharati/ws_csv` | **200 OK** | `text/csv` | `date,ws` | 1,429 | `2025-12-07 00:00:00,20.30` | `2025-12-07 23:59:00,18.50` | **PASSED** |
| **Bharati** | `wd` | `https://data.ncpor.res.in/bharati/wd_csv` | **200 OK** | `text/csv` | `date,ws,wd` | 1,429 | `2025-12-07 00:00:00,17.20,93.00` | `2025-12-07 23:59:00,18.50,91.00` | **PASSED** |
| **Bharati** | `ap` | `https://data.ncpor.res.in/bharati/ap_csv` | **200 OK** | `text/csv` | `date,ap` | 1,429 | `2025-12-07 00:00:00,992.00` | `2025-12-07 23:59:00,988.50` | **PASSED** |
| **Bharati** | `rh` | `https://data.ncpor.res.in/bharati/rh_csv` | **200 OK** | `text/csv` | `date,rh` | 1,441 | `2025-12-07 00:00:00,61.30` | `2025-12-07 23:59:00,50.60` | **PASSED** |

## Key Findings

1. **Successful Endpoints**: 8 of 10 endpoints returned HTTP 200 with valid CSV output.
2. **Special Bharati WD Behavior**: The Bharati wind direction endpoint (`wd_csv`) returns two measurement fields: `date,ws,wd`.
3. **Maitri 404 Responses**: `maitri/ws_csv` and `maitri/wd_csv` returned 404 Not Found on the portal server for date `2025-12-07`.
