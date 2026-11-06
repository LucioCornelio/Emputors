"""Genera techtree.json y civtags.json a partir de los datos oficiales de aoe2techtree.net
(repositorio SiegeEngineers/aoe2techtree). Uso: python build_data.py (desde data_builder/)"""
import json, os, re, urllib.request

# Se ejecuta desde data_builder/ y escribe en frontend/public/
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public")

BASE = "https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/master/data/"
def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.load(r)

data = get("data.json")
strings = get("locales/en/strings.json")
name = lambda sid: strings.get(str(sid), "")
# los nombres de unidades/tecnologias estan en LanguageNameId + 9000
obj_name_raw = lambda o: strings.get(str(o["LanguageNameId"] + 9000)) or strings.get(str(o["LanguageNameId"]), "") or o.get("internal_name", "")
obj_name = lambda o: " ".join(re.sub(r"<[^>]+>", " ", obj_name_raw(o)).split())

# ---------- techtree.json (mismo formato que usa AdvancedSearch.jsx) ----------
units = {str(i): obj_name(u) for i, u in data["data"]["Unit"].items()}
techs = {str(i): obj_name(t) for i, t in data["data"]["Tech"].items()}
civs = {c: {"units": v["Unit"], "techs": v["Tech"]} for c, v in data["civs"].items()}
json.dump({"civs": civs, "units": units, "techs": techs}, open(os.path.join(OUT, "techtree.json"), "w"), indent=1)

# ---------- civtags.json ----------
NAVAL = re.compile(r"\b(ship|ships|galley|galleys|galleon|dock|docks|fishing|fish|fishermen|navy|naval|"
                   r"warship|warships|dromon|longship|longships|longboat|caravel|turtle|lou chuan|hulk|"
                   r"carrack|cog|cogs|whale|shipwright|careening|dry dock)\b", re.I)
# Ramas de bonus. Un bonus generico de "archers" o de la Archery Range suma en Foot Archer y en Cavalry Archer.
FOOT = re.compile(r"foot archer|archer-line|crossbow|arbalest|skirmisher", re.I)
CAVARCH = re.compile(r"cavalry archer|mounted archer|horse archer|mounted ranged", re.I)
ARCH_GENERIC = re.compile(r"\barchers?\b(?!-line)|archery range|ranged units", re.I)
def archer_branches(line):
    out = set()
    if FOOT.search(line): out.add("Foot Archer")
    if CAVARCH.search(line): out.add("Cavalry Archer")
    stripped = CAVARCH.sub("", FOOT.sub("", line))
    if ARCH_GENERIC.search(stripped): out |= {"Foot Archer", "Cavalry Archer"}
    return out
BRANCH = {
    "Infantry": re.compile(r"infantry|militia|man-at-arms|men-at-arms|foot soldiers|barracks|spearm|swordsm|champion|halberd", re.I),
    "Cavalry": re.compile(r"cavalry(?! archer)|mounted units|knight|scout|stable|steppe lancer|hussar|paladin", re.I),
    "Camel": re.compile(r"camel", re.I),
}
FAMILY = {"Foot Archer": ["Foot Archer"], "Cavalry Archer": ["Cavalry Archer"],
          "Archer": ["Foot Archer", "Cavalry Archer"], "Camel": ["Camel"], "Cavalry": ["Cavalry"]}

# ---------- arbol completo por rama (segun disponibilidad real en techtree) ----------
def ids(dic, n): return {int(k) for k, v in dic.items() if v == n}
def has_unit(civ, n): return bool(ids(units, n) & set(civs[civ]["units"]))
def has_tech(civ, n): return bool(ids(techs, n) & set(civs[civ]["techs"]))
HP_EQUIV = re.compile(r"(mounted units|cavalry|knight)[^.]*\+\d+% hp", re.I)

def full_tree(civ, bonuses):
    res, notes = set(), []
    # Arquero a pie completo: Arbalester + Thumb Ring + Bracer
    if has_unit(civ, "Arbalester") and has_tech(civ, "Thumb Ring") and has_tech(civ, "Bracer"):
        res.add("Foot Archer")
    # Arquero a caballo completo: Heavy CA (o H. Mounted Crossbowman) + Thumb Ring + Parthian Tactics
    hca = has_unit(civ, "Heavy Cavalry Archer") or has_unit(civ, "H. Mounted Crossbowman")
    if hca and has_tech(civ, "Thumb Ring") and has_tech(civ, "Parthian Tactics"):
        res.add("Cavalry Archer")
        if not has_unit(civ, "Heavy Cavalry Archer"): notes.append("CA via Mounted Crossbowman")
    # Caballeria: Cavalier + Bloodlines (o bonus de HP equivalente) + Husbandry + Plate Barding Armor
    blood = has_tech(civ, "Bloodlines")
    blood_eq = not blood and any(HP_EQUIV.search(b) for b in bonuses)
    paladin = has_unit(civ, "Paladin") or has_unit(civ, "Savar")
    if has_unit(civ, "Cavalier") and (blood or blood_eq) and has_tech(civ, "Husbandry") and has_tech(civ, "Plate Barding Armor"):
        res.add("Cavalry (Paladin optional)")
        if paladin: res.add("Cavalry")
        else: notes.append("no Paladin")
        if blood_eq: notes.append("Bloodlines via civ bonus")
        if has_unit(civ, "Savar"): notes.append("Savar instead of Paladin")
    return res, notes

out = {}
for civ, v in data["civs"].items():
    raw = name(v["help_string_id"])
    parts = [p.strip() for p in raw.split("<br>")]
    focus_text = parts[0]
    official = [t.strip() for t in focus_text.replace(" civilization", "").split(" and ")]
    text = re.sub(r"<[^>]+>", "", raw)
    # bonus de la civ (lineas que empiezan por "•" antes de "Unique Unit")
    head = text.split("Unique Unit")[0]
    bonuses = [l.strip("• \n") for l in head.split("\n") if l.strip().startswith("•")]
    team = text.split("Team Bonus:")[-1].strip() if "Team Bonus:" in text else ""
    uts = text.split("Unique Techs:")[-1].split("Team Bonus:")[0] if "Unique Techs:" in text else ""
    uts = [l.strip("• \n") for l in uts.split("\n") if l.strip().startswith("•")]
    # unidades unicas: "Composite Bowman (Foot Archer), Warrior Priest (Infantry)"
    uu_line = re.search(r"Unique Units?:\s*(.+?)\n\s*\n", text + "\n\n", re.S)
    uus = []
    if uu_line:
        for m in re.finditer(r"([^,(]+?)\s*\(([^)]+)\)", uu_line.group(1).replace("\n", " ")):
            uus.append({"name": m.group(1).strip(), "class": m.group(2).strip()})
    naval_lines = [b for b in bonuses + [team] + uts if NAVAL.search(b)]
    tags = set(f"official:{t}" for t in official)
    for t in official:
        tags |= set(f"family:{f}" for f in FAMILY.get(t, [t]))
    tags |= set(f"uu:{u['class']}" for u in uus)
    if any("camel" in u["name"].lower() or u["name"] == "Mameluke" for u in uus):
        tags.add("uu:Camel")
    for branch, rx in BRANCH.items():
        if any(rx.search(b) for b in bonuses):
            tags.add(f"bonus:{branch}")
    for b in bonuses:
        tags |= set(f"bonus:{x}" for x in archer_branches(b))
    full, full_notes = full_tree(civ, bonuses)
    tags |= set(f"tree:{x}" for x in full)
    # Amplio: foco oficial o arbol completo
    for fam, tr in [("Foot Archer", "Foot Archer"), ("Cavalry Archer", "Cavalry Archer"), ("Cavalry", "Cavalry (Paladin optional)")]:
        if f"family:{fam}" in tags or tr in full:
            tags.add(f"broad:{fam}")
    water = "Naval" in official or bool(naval_lines)
    if water: tags.add("water:yes")
    out[civ] = {"focus_text": focus_text, "official": official,
                "unique_units": uus, "water": water,
                "full_tree": sorted(full), "full_tree_notes": full_notes,
                "water_official": "Naval" in official, "naval_bonuses": naval_lines,
                "bonuses": bonuses, "unique_techs": uts, "team_bonus": team,
                "tags": sorted(tags)}
json.dump(out, open(os.path.join(OUT, "civtags.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(civs), "civs | techtree.json y civtags.json generados")
