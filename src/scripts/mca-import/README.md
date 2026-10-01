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

## Monthly top-ups (additive, live-safe)

The MCA portal also publishes a **monthly** incorporation report and a separate
monthly **struck-off report**, in a different layout from the datasets above:

- Incorporations: one `.xlsx` per month, sheets "Indian Companies" / "LLP
  Companies" / "Foreign Companies" — same shape `parse_mca.py` already handles.
- Struck-off: one `.xlsx` per month **per kind** (a companies file and an LLP
  file are separate), single sheet, title row reading "Company/LLP Struck Off
  Report … Date: …", header row of `S.NO | CIN|LLPIN | Company/LLP Name`. This
  is a different layout from the Master Struck-Off workbook above, so it has
  its own parser: `parse_struck_off_monthly.py`.

These files overlap heavily with what's already loaded (the same incorporation
can appear in more than one monthly export), and `seed-mca-companies.mjs` /
`seed-struck-off.mjs` **drop and rebuild the whole table** — never run them
with just a monthly file, or the rest of the index is lost. Use the additive
loader instead, which dedupes by identifier against the live table and only
inserts what's actually new:

```bash
# Incorporations — parse_mca.py's normal output works as-is.
python parse_mca.py "<dir-of-monthly-xlsx>" monthly_companies.csv
node append_monthly.mjs companies monthly_companies.csv

# Struck-off — one call, multiple monthly files at once.
python parse_struck_off_monthly.py june.xlsx july.xlsx aug.xlsx monthly_struckoff.csv
node append_monthly.mjs struckoff monthly_struckoff.csv
```

Both print how many rows were already present vs. newly inserted, and the
database size afterwards — check that against the 512 MB cap before running
a large batch.

## Notes

- The loader connects to the **direct** Neon endpoint (strips `-pooler`) and COPYs
  in 150k-row chunks so transient WAL never exceeds Neon's 512 MB cluster cap.
- Kept intentionally lean (no address/email/activity) to fit that cap — the full
  ~2.1M-row index lands at ~420 MB.
- `core_norm` (name minus legal suffix, alphanumerics only) is the search key and
  MUST stay in sync with `coreName()` in `controllers/mcaController.ts`.
