import requests
import os

API_URL = "https://ageofempires.fandom.com/api.php"
CARPETA_DESTINO = "frontend/public/techs"

# Nombres base de las unidades para buscar su versión de "research"
MEJORAS_FALTANTES = [
    "Man-at-arms",
    "Long Swordsman",
    "Two-handed Swordsman",
    "Champion",
    "Pikeman",
    "Halberdier",
    "Elite Skirmisher",
    "Crossbowman",
    "Arbalester",
    "Light Cavalry",
    "Hussar",
    "Cavalier",
    "Paladin"
]

def buscar_y_descargar_mejoras():
    os.makedirs(CARPETA_DESTINO, exist_ok=True)
    
    for mejora in MEJORAS_FALTANTES:
        print(f"Buscando mejora: {mejora}...")
        
        # Probamos combinaciones en el buscador
        terminos = [f"{mejora} research", f"{mejora} upgrade"]
        titulo_archivo = None
        
        for termino in terminos:
            params_busqueda = {
                "action": "query",
                "list": "search",
                "srsearch": f"File:{termino}",
                "srnamespace": 6,  # 6 = Archivos
                "format": "json",
                "srlimit": 5
            }
            
            try:
                respuesta = requests.get(API_URL, params=params_busqueda).json()
                resultados = respuesta.get('query', {}).get('search', [])
                
                # Pillamos el primer resultado que sea PNG
                for res in resultados:
                    if res['title'].lower().endswith(".png"):
                        titulo_archivo = res['title']
                        break
                
                if titulo_archivo:
                    break
            except Exception:
                pass
                
        if not titulo_archivo:
            print(f"  ❌ No se encontró PNG válido para {mejora}")
            continue

        # Pedimos la URL directa de la imagen encontrada
        params_imagen = {
            "action": "query",
            "titles": titulo_archivo,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json"
        }
        
        try:
            resp_img = requests.get(API_URL, params=params_imagen).json()
            paginas = resp_img.get('query', {}).get('pages', {})
            
            for page_id, pagina in paginas.items():
                if 'imageinfo' in pagina:
                    url_imagen = pagina['imageinfo'][0]['url']
                    # Limpiamos el nombre para guardarlo
                    nombre_limpio = titulo_archivo.replace("File:", "").replace(" ", "_")
                    ruta_completa = os.path.join(CARPETA_DESTINO, nombre_limpio)
                    
                    if not os.path.exists(ruta_completa):
                        img_data = requests.get(url_imagen).content
                        with open(ruta_completa, 'wb') as handler:
                            handler.write(img_data)
                        print(f"  ✅ Descargado: {nombre_limpio}")
                    else:
                        print(f"  ⚡ Ya existe: {nombre_limpio}")
        except Exception as e:
            print(f"  ❌ Error descargando {titulo_archivo}: {e}")

if __name__ == "__main__":
    buscar_y_descargar_mejoras()