# MCA company registry import

Builds the local `mca_companies` table that powers the home-page name-availability
check (`POST /api/mca/name-check`), replacing the old external RocketReach lookup.

## Source data

Year-wise MCA incorporation datasets — one `.xlsx` per financial year (e.g.
`FY 2016-17.xlsx` … `FY 2026-27.xlsx`), each with three sheets: Indian companies,
LLPs, and foreign companies. The sheet names, header rows and column names drift
between years; `parse_mca.py` detects the header row and maps columns per sheet.

> **Scope caveat:** this dataset lists companies *incorporated during* FY 2016-17
> through 2026-27 — it is **not** the full MCA register. A name registered before
> April 2016 (e.g. long-established companies) will read as "available". Add older
> datasets and re-run to widen coverage.

## Pipeline (3 steps)

```bash
# 1. Parse all *.xlsx in <data-dir> -> de-duplicated full CSV (~15 min).
python parse_mca.py "<data-dir>" mca_companies.csv

# 2. Project to the lean columns the DB loads, in COPY order (~1 min).
python project_lean.py            # reads mca_companies.csv -> mca_lean.csv

# 3. Bulk-load into Postgres via chunked COPY (~2 min).
node ../seed-mca-companies.mjs mca_lean.csv
```

Then sanity-check:

```bash
node ../test-mca-check.mjs "Some Company Private Limited" "Made Up Name LLP"
```

## Struck-off list (separate dataset)

The Master Struck-Off workbook (companies + LLPs removed from the register) loads
into its own `mca_struck_off` table. A name matching a struck-off entity is
reported **unavailable** by the check (the entity can be restored within 20 years,
so the name stays restricted).

```bash
python parse_struck_off.py "<path-to-Master_Struck_Off...xlsx>"   # -> struck_off_lean.csv
node ../seed-struck-off.mjs struck_off_lean.csv
```

## Notes

- The loader connects to the **direct** Neon endpoint (strips `-pooler`) and COPYs
  in 150k-row chunks so transient WAL never exceeds Neon's 512 MB cluster cap.
- Kept intentionally lean (no address/email/activity) to fit that cap — the full
  ~2.1M-row index lands at ~420 MB.
- `core_norm` (name minus legal suffix, alphanumerics only) is the search key and
  MUST stay in sync with `coreName()` in `controllers/mcaController.ts`.
