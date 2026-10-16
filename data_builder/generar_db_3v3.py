import os
import json
import glob

RAW_DIR = "data_raw"
OUTPUT_FILE = "db_3v3.json"

def generate_3v3_db():
    db = { "maps": {} }
    
    json_files = glob.glob(os.path.join(RAW_DIR, "*.json"))
    if not json_files:
        print(f"No se han encontrado archivos JSON en la carpeta '{RAW_DIR}'.")
        return
        
    for file in json_files:
        with open(file, 'r', encoding='utf-8') as f:
            matches = json.load(f)
            
        for match in matches:
            map_name = match.get("map", "Unknown")
            winner = match.get("winner", 0)
            has_vod = match.get("hasVod", False)
            vod_url = match.get("vodUrl", None)
            game_num = match.get("game", "")
            date = match.get("date", "")
            
            if map_name not in db["maps"]:
                db["maps"][map_name] = { "civs": {}, "combos": {}, "total_matches": 0 }
                
            map_data = db["maps"][map_name]
            map_data["total_matches"] += 1
            
            t1 = match.get("team1", {}).get("civs", [])
            t2 = match.get("team2", {}).get("civs", [])
            
            if len(t1) == 3 and len(t2) == 3:
                process_team(t1, t2, map_data, winner == 1, has_vod, map_name.lower() == "nomad", vod_url, game_num, date)
                process_team(t2, t1, map_data, winner == 2, has_vod, map_name.lower() == "nomad", vod_url, game_num, date)
                
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
        
    print(f"¡Éxito! Base de datos 3v3 actualizada en '{OUTPUT_FILE}'.")

def process_team(civs, opp_civs, map_data, is_winner, has_vod, is_nomad, vod_url, game_num, date):
    # Identificar aliados (las otras 2 civs del equipo) y enemigos
    for idx, civ in enumerate(civs):
        if civ not in map_data["civs"]:
            map_data["civs"][civ] = {
                "picks": 0, "wins": 0,
                "flank_picks": 0, "flank_wins": 0, "cdps_flank": 0,
                "pocket_picks": 0, "pocket_wins": 0, "cdps_pocket": 0,
                "flex_picks": 0, "flex_wins": 0, "cdps_flex": 0,
                "history": []
            }
        
        stats = map_data["civs"][civ]
        stats["picks"] += 1
        if is_winner: stats["wins"] += 1
        
        if is_nomad:
            stats["flex_picks"] += 1
            if is_winner: stats["flex_wins"] += 1
            if has_vod: stats["cdps_flex"] += 1
        else:
            if idx == 1: 
                stats["pocket_picks"] += 1
                if is_winner: stats["pocket_wins"] += 1
                if has_vod: stats["cdps_pocket"] += 1
            else: 
                stats["flank_picks"] += 1
                if is_winner: stats["flank_wins"] += 1
                if has_vod: stats["cdps_flank"] += 1
        
        allies = [c for i, c in enumerate(civs) if i != idx]
        stats["history"].append({
            "allies": " + ".join(allies),
            "opponents": " + ".join(opp_civs),
            "won": is_winner,
            "vod_url": vod_url,
            "game": game_num,
            "date": date
        })

    combo_key = " + ".join(sorted(civs))
    if combo_key not in map_data["combos"]:
        map_data["combos"][combo_key] = {"picks": 0, "wins": 0, "cdps": 0, "history": []}
        
    combo = map_data["combos"][combo_key]
    combo["picks"] += 1
    if is_winner: combo["wins"] += 1
    if has_vod: combo["cdps"] += 1
    combo["history"].append({
        "opponents": " + ".join(opp_civs),
        "won": is_winner,
        "vod_url": vod_url,
        "game": game_num,
        "date": date
    })

if __name__ == "__main__":
    generate_3v3_db()