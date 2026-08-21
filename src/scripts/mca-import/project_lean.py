"""Project the full parsed CSV down to the lean columns we load into Neon,
in the exact column order the COPY statement expects. No header row (COPY data).

Recomputes core_norm (the brand key) from the NAME column with the normalize-then-
strip algorithm so glued suffixes ("PRIVATELIMITED", "COMPANYLIMITED", "ADVISORSLLP")
reduce to the same key as their spaced forms. This MUST match coreKey() in
controllers/mcaController.ts.
"""
import csv, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "mca_companies.csv")
OUT = os.path.join(HERE, "mca_lean.csv")

# COPY column order: identifier,name,kind,klass,reg_date,core_norm
csv.field_size_limit(10_000_000)

# Suffix tokens stripped from the END of the normalized (alnum-only) name, longest
# first. Short/ambiguous tokens (co, inc, corp) are deliberately excluded so brand
# words like "pepsico" aren't truncated.
SUFFIX_TOKENS = sorted([
    "limitedliabilitypartnership", "onepersoncompany", "producercompany",
    "privatelimited", "publiclimited", "companylimited", "nidhilimited",
    "privateltd", "pvtlimited", "pvtltd", "section8",
    "private", "public", "limited", "company", "nidhi",
    "llp", "opc", "llc", "ltd", "pvt",
], key=len, reverse=True)

def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())

def core_key(name: str) -> str:
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

def clean_date(d: str) -> str:
    d = d.strip()
    return d.split(" ")[0] if len(d) > 10 and " " in d else d

with open(SRC, newline="", encoding="utf-8") as fin, open(OUT, "w", newline="", encoding="utf-8") as fout:
    r = csv.DictReader(fin)
    w = csv.writer(fout)
    n = 0
    for row in r:
        w.writerow([
            row["identifier"], row["name"], row["kind"], row["klass"],
            clean_date(row["reg_date"]), core_key(row["name"]),
        ])
        n += 1
print("projected rows:", n, "->", OUT, "size(MB):", round(os.path.getsize(OUT) / 1e6, 1))
