import os
import json
import glob

# Rutas de las carpetas según la estructura de tu proyecto
RAW_DIR = "data_raw"
OUTPUT_FILE = "db_3v3.json"

def generate_3v3_db():
    db = { "maps": {} }
    
    # Busca todos los JSON generados por el bookmarklet
    json_files = glob.glob(os.path.join(RAW_DIR, "*.json"))
    
    if not json_files:
        print(f"No se han encontrado archivos JSON en la carpeta '{RAW_DIR}'.")
        return
        
    total_matches = 0
    for file in json_files:
        with open(file, 'r', encoding='utf-8') as f:
            matches = json.load(f)
            
        for match in matches:
            map_name = match.get("map", "Unknown")
            winner = match.get("winner", 0)
            has_vod = match.get("hasVod", False)
            
            if map_name not in db["maps"]:
                db["maps"][map_name] = { "civs": {}, "combos": {} }
                
            map_data = db["maps"][map_name]
            
            t1 = match.get("team1", {}).get("civs", [])
            t2 = match.get("team2", {}).get("civs", [])
            
            # Solo procesar partidas que tengan exactamente 3 civis por equipo (Anti-errores)
            if len(t1) == 3 and len(t2) == 3:
                process_team(t1, map_data, winner == 1, has_vod, map_name.lower() == "nomad")
                process_team(t2, map_data, winner == 2, has_vod, map_name.lower() == "nomad")
                total_matches += 1
                
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
        
    print(f"¡Éxito! Base de datos 3v3 generada en '{OUTPUT_FILE}'.")
    print(f"Partidas totales procesadas: {total_matches}")

def process_team(civs, map_data, is_winner, has_vod, is_nomad):
    # 1. Cálculos Individuales por Rol
    for idx, civ in enumerate(civs):
        if civ not in map_data["civs"]:
            map_data["civs"][civ] = {
                "picks": 0, "wins": 0,
                "flank_picks": 0, "flank_wins": 0, "cdps_flank": 0,
                "pocket_picks": 0, "pocket_wins": 0, "cdps_pocket": 0,
                "flex_picks": 0, "flex_wins": 0, "cdps_flex": 0
            }
        
        stats = map_data["civs"][civ]
        stats["picks"] += 1
        if is_winner: stats["wins"] += 1
        
        # NOMAD: No hay roles fijos de inicio
        if is_nomad:
            stats["flex_picks"] += 1
            if is_winner: stats["flex_wins"] += 1
            if has_vod: stats["cdps_flex"] += 1
        else:
            # MAPAS NORMALES: Índice 1 es Pocket, 0 y 2 son Flancos
            if idx == 1: 
                stats["pocket_picks"] += 1
                if is_winner: stats["pocket_wins"] += 1
                if has_vod: stats["cdps_pocket"] += 1
            else: 
                stats["flank_picks"] += 1
                if is_winner: stats["flank_wins"] += 1
                if has_vod: stats["cdps_flank"] += 1

    # 2. Análisis de Combos (Sinergia de equipo)
    # Ordenamos alfabéticamente para agrupar combos idénticos independientemente del orden de pick
    combo_key = " + ".join(sorted(civs))
    if combo_key not in map_data["combos"]:
        map_data["combos"][combo_key] = {"picks": 0, "wins": 0, "cdps": 0}
        
    combo = map_data["combos"][combo_key]
    combo["picks"] += 1
    if is_winner: combo["wins"] += 1
    if has_vod: combo["cdps"] += 1

if __name__ == "__main__":
    generate_3v3_db()