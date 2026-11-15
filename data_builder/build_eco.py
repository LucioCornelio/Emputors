"""Generates frontend/src/eco/econData.json for the eco module (Eco Calculator and build order variants).

Sources:
- Survivalist's AoE2:DE Tools (https://aoe2-de-tools.herokuapp.com/, code at
  https://github.com/PeterWhiteJavascript/aoe2-de-tools): gather rates, unit costs and train times,
  tech costs, research times and gather effects, civ eco bonuses. Survivalist regenerates these from the
  game files after every patch.
- aoe2techtree (https://github.com/SiegeEngineers/aoe2techtree): only what Survivalist does not have,
  age up costs and times and building costs and build times.

Run after a game patch: python build_eco.py (from data_builder/). Review the git diff of econData.json.
"""
import json, os, re, subprocess, urllib.request
from datetime import date

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src", "eco", "econData.json")

SURV_REPO = "https://github.com/PeterWhiteJavascript/aoe2-de-tools"
TECHTREE_REPO = "https://github.com/SiegeEngineers/aoe2techtree"


def head_commit(repo):
    out = subprocess.run(["git", "ls-remote", repo, "HEAD"], capture_output=True, text=True, check=True).stdout
    return out.split()[0]


def raw(repo, commit, path):
    owner_name = repo.split("github.com/")[1]
    url = f"https://raw.githubusercontent.com/{owner_name}/{commit}/{path}"
    with urllib.request.urlopen(url) as r:
        return r.read().decode("utf-8")


surv_commit = head_commit(SURV_REPO)
tt_commit = head_commit(TECHTREE_REPO)

surv = json.loads(raw(SURV_REPO, surv_commit, "src/data.json"))
gather_js = raw(SURV_REPO, surv_commit, "src/_data/gatherRates.js")
eco_bonuses = json.loads(raw(SURV_REPO, surv_commit, "src/data/ecoBonuses.json"))
tt = json.loads(raw(TECHTREE_REPO, tt_commit, "data/data.json"))["data"]

# ---------- gather rates (resources per second) ----------
villager = next(u for u in surv["units"] if u["name"] == "villager")
gather = {k: {"res": v["res"], "rate": round(v["gatherRate"], 4)} for k, v in villager["gathering"].items()}

# Rates written by hand in gatherRates.js (fishing ships, farms with upgrades...): "X / 60" or "X"
pattern = re.compile(r"gatherRates\['([^']+)'\]\s*=\s*\{\s*res:\s*'(\w+)',\s*gatherRate:\s*([\d.]+)\s*(?:/\s*(\d+))?\s*,?\s*\}")
for name, res, num, div in pattern.findall(gather_js):
    rate = float(num) / (float(div) if div else 1)
    gather[name] = {"res": res, "rate": round(rate, 4)}

for needed in ["fishing ship deep", "fishing ship shore", "farmer", "lumberjack", "gold miner", "shepherd"]:
    if needed not in gather:
        raise SystemExit(f"Survivalist data changed: gather rate '{needed}' not found")

# ---------- techs ----------
techs = {}
for t in surv["upgrades"]:
    entry = {"cost": t.get("cost", {}), "time": t.get("time")}
    eff = (t.get("effects") or {}).get("gatherRate")
    if eff and isinstance(eff, list) and len(eff) == 2 and str(eff[1]).startswith("*"):
        entry["gather"] = {"target": eff[0], "mult": float(eff[1][1:])}
    techs[t["name"]] = entry

# Age ups from aoe2techtree (ids 101 Feudal, 102 Castle, 103 Imperial)
lower = lambda c: {k.lower(): v for k, v in c.items()}
for tid, name in [("101", "feudal age"), ("102", "castle age"), ("103", "imperial age")]:
    t = tt["Tech"][tid]
    techs[name] = {"cost": lower(t["Cost"]), "time": t["ResearchTime"], "source": "aoe2techtree"}

# ---------- units ----------
units = {u["name"]: {"cost": u.get("cost", {}), "time": u.get("trainTime")}
         for u in surv["units"] if u.get("trainTime")}

# ---------- buildings (aoe2techtree) ----------
BUILDINGS = {"house": 70, "dock": 45, "mill": 68, "lumber camp": 562, "mining camp": 584, "farm": 50,
             "barracks": 12, "archery range": 87, "stable": 101, "blacksmith": 103, "market": 84,
             "town center": 109, "outpost": 598, "palisade wall": 72, "watch tower": 79, "monastery": 104,
             "university": 209, "siege workshop": 49, "castle": 82, "fish trap": 199}
buildings = {}
for name, bid in BUILDINGS.items():
    b = tt["Building"].get(str(bid))
    if b:
        buildings[name] = {"cost": lower(b["Cost"]), "time": b["TrainTime"]}

data = {
    "source": {
        "survivalist": {"repo": SURV_REPO, "commit": surv_commit, "site": "https://aoe2-de-tools.herokuapp.com/villagers-required/"},
        "aoe2techtree": {"repo": TECHTREE_REPO, "commit": tt_commit, "used_for": "age ups and buildings"},
        "generated": date.today().isoformat(),
    },
    "gather": dict(sorted(gather.items())),
    "techs": dict(sorted(techs.items())),
    "units": dict(sorted(units.items())),
    "buildings": buildings,
    "civBonuses": eco_bonuses.get("civ", eco_bonuses),
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1, ensure_ascii=False)
    f.write("\n")
print(f"econData.json: {len(gather)} gather rates, {len(techs)} techs, {len(units)} units, {len(buildings)} buildings")
print(f"Survivalist {surv_commit[:7]}, aoe2techtree {tt_commit[:7]}")
