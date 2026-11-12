import requests
import os

API_URL = "https://ageofempires.fandom.com/api.php"
CARPETA_DESTINO = "frontend/public/buildings"

# Los edificios que fallaron por la nomenclatura de la Wiki
EDIFICIOS_FALTANTES = [
    "Town Center", "Mill", "Lumber Camp", "Mining Camp", 
    "Monastery", "University", "Farm", "Fish Trap",
    "Outpost", "Watch Tower", "Guard Tower", "Keep",
    "Palisade Wall", "Stone Wall", "Gate",
    "Krepost", "Donjon", "Folwark", "Caravanserai", 
    "Fortified Church", "Mule Cart", "Wonder", "Feitoria"
]

def buscar_y_descargar():
    os.makedirs(CARPETA_DESTINO, exist_ok=True)
    
    for edificio in EDIFICIOS_FALTANTES:
        print(f"Buscando: {edificio}...")
        
        # Probamos varias combinaciones comunes en el buscador de la Wiki
        terminos = [f"{edificio} aoe2DE", f"{edificio} aoe2", f"{edificio} icon"]
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
                    break # Encontrado, no buscamos más combinaciones
            except Exception:
                pass
                
        if not titulo_archivo:
            print(f"  ❌ No se encontró PNG válido para {edificio}")
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
                    nombre_limpio = titulo_archivo.replace("File:", "").replace(" ", "_")
                    ruta_completa = os.path.join(CARPETA_DESTINO, nombre_limpio)
                    
                    if not os.path.exists(ruta_completa):
                        img_data = requests.get(url_imagen).content
                        with open(ruta_completa, 'wb') as handler:
                            handler.write(img_data)
                        print(f"  ✅ Descargado: {nombre_limpio}")
                    else:
                        print(f"  ✅ Ya existe: {nombre_limpio}")
        except Exception as e:
            print(f"  ❌ Error descargando {titulo_archivo}: {e}")

if __name__ == "__main__":
    buscar_y_descargar()
    print("\n¡Búsqueda y descarga completada!")