"""
Split the parsed state-wise register (all_companies_raw.csv) into the two
headerless CSVs the loaders COPY, in exact COPY column order.

  mca_lean.csv        -> mca_companies   (identifier,name,kind,klass,company_type,reg_date,core_norm)
  struck_off_lean_all.csv -> mca_struck_off  (identifier,name,kind,month,core_norm)

Rows are routed by the source CompanyStatus: anything struck off, dissolved or
vanished goes to the struck-off index (those names stay restricted for 20 years
under Companies Act s.252), everything else to the active register. Amalgamated
and Converted-to-LLP entities stay in the active index — the name is still taken.

`month` is left blank for struck-off rows: this dataset carries a registration
date, not a strike-off date, and inventing one would misreport it in the UI.

Usage: python project_lean_all.py [all_companies_raw.csv]
"""
import csv, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "all_companies_raw.csv")
OUT_LIVE = os.path.join(HERE, "mca_lean.csv")
OUT_STRUCK = os.path.join(HERE, "struck_off_lean_all.csv")

csv.field_size_limit(10_000_000)

# Substrings marking a status whose entity is off the register.
STRUCK_MARKERS = ("strike", "struck", "dissolv", "vanished")

def is_struck(status: str) -> bool:
    s = status.lower()
    return any(m in s for m in STRUCK_MARKERS)

# Repeated verbatim on ~89% of rows; stored as a 1-char code and expanded by
# mcaController.toMatch(). Anything unrecognised is stored as-is.
CTYPE_CODE = {
    "non-government company": "N",
    "union government company": "U",
    "state government company": "S",
    "subsidiary of company incorporated outside india": "F",
    "guarantee and association company": "G",
}

def main():
    live = struck = 0
    with open(SRC, newline="", encoding="utf-8") as fin, \
         open(OUT_LIVE, "w", newline="", encoding="utf-8") as flive, \
         open(OUT_STRUCK, "w", newline="", encoding="utf-8") as fstruck:
        wl, ws = csv.writer(flive), csv.writer(fstruck)
        for row in csv.reader(fin):
            if len(row) < 9:
                continue
            ident, name, kind, klass, ctype, reg_date, core, status, _state = row[:9]
            if not core:
                continue  # no brand key -> unsearchable, skip
            if is_struck(status):
                # mca_struck_off.kind is 'company' | 'llp', not the 3-way kind.
                ws.writerow([ident, name, "llp" if kind == "llp" else "company", "", core])
                struck += 1
            else:
                wl.writerow([ident, name, kind, klass,
                             CTYPE_CODE.get(ctype.strip().lower(), ctype), reg_date, core])
                live += 1
    print(f"active  -> {OUT_LIVE}      {live:,} rows  ({os.path.getsize(OUT_LIVE)/1e6:.1f} MB)")
    print(f"struck  -> {OUT_STRUCK}  {struck:,} rows  ({os.path.getsize(OUT_STRUCK)/1e6:.1f} MB)")

if __name__ == "__main__":
    main()
