"""Parse the Master Struck-Off companies + LLPs workbook into a lean CSV for the
`mca_struck_off` table. Columns (COPY order): identifier, name, kind, month, core_norm."""
import openpyxl, csv, re, os, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\komal\Downloads\Master_Struck_Off_Companies_and_LLPs_FRESH.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "struck_off_lean.csv")

# Brand key: normalize to alnum, then strip trailing legal-suffix tokens (longest
# first). MUST match coreKey() in controllers/mcaController.ts and project_lean.py.
SUFFIX_TOKENS = sorted([
    "limitedliabilitypartnership", "onepersoncompany", "producercompany",
    "privatelimited", "publiclimited", "companylimited", "nidhilimited",
    "privateltd", "pvtlimited", "pvtltd", "section8",
    "private", "public", "limited", "company", "nidhi",
    "llp", "opc", "llc", "ltd", "pvt",
], key=len, reverse=True)

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

def core(name: str) -> str:
    s = norm(name)
    changed = True
    while changed and len(s) >= 3:
        changed = False
        for tok in SUFFIX_TOKENS:
            if len(s) - len(tok) >= 3 and s.endswith(tok):
                s = s[: -len(tok)]
                changed = True
                break
    return s

def run():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    seen, n = set(), 0
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for sheet, kind, id_col, name_col in [
            ("Companies Struck Off", "company", 1, 2),
            ("LLPs Struck Off", "llp", 1, 2),
        ]:
            ws = wb[sheet]
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0:
                    continue  # header
                if not row or name_col >= len(row) or not row[name_col]:
                    continue
                name = str(row[name_col]).strip().rstrip(".")
                if len(name) < 2:
                    continue
                nn = norm(name)
                if not nn or nn in seen:
                    continue
                seen.add(nn)
                ident = str(row[id_col]).strip() if id_col < len(row) and row[id_col] else ""
                month = str(row[3]).strip() if len(row) > 3 and row[3] else ""
                w.writerow([ident, name, kind, month, core(name)])
                n += 1
            print(f"  {sheet}: running total {n}", flush=True)
    wb.close()
    print("TOTAL:", n, "->", OUT, "size(MB):", round(os.path.getsize(OUT) / 1e6, 2))

if __name__ == "__main__":
    run()
