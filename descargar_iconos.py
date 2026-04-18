import requests
import os

API_URL = "https://ageofempires.fandom.com/api.php"

# Diccionario relacionando la categoría EXACTA de la wiki con tu carpeta de destino
CATEGORIAS = {
    "Category:Unit_icons_(Age_of_Empires_II)": "public/units",
    "Category:Technology_icons_(Age_of_Empires_II)": "public/techs"
}

def obtener_lista_archivos(categoria):
    archivos = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": categoria,
        "cmnamespace": 6,  # 6 es el namespace para 'File'
        "cmlimit": "max",
        "format": "json"
    }
    
    while True:
        respuesta = requests.get(API_URL, params=params).json()
        if 'query' in respuesta:
            for miembro in respuesta['query']['categorymembers']:
                archivos.append(miembro['title'])
                
        if 'continue' in respuesta:
            params['cmcontinue'] = respuesta['continue']['cmcontinue']
        else:
            break
            
    return archivos

def descargar_imagenes(lista_titulos, carpeta_destino):
    os.makedirs(carpeta_destino, exist_ok=True)
    
    for i in range(0, len(lista_titulos), 50):
        lote = lista_titulos[i:i+50]
        params = {
            "action": "query",
            "titles": "|".join(lote),
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json"
        }
        
        respuesta = requests.get(API_URL, params=params).json()
        paginas = respuesta.get('query', {}).get('pages', {})
        
        for page_id in paginas:
            pagina = paginas[page_id]
            if 'imageinfo' in pagina:
                url_imagen = pagina['imageinfo'][0]['url']
                # Limpiar el nombre del archivo eliminando "File:"
                nombre_limpio = pagina['title'].replace("File:", "").replace(" ", "_")
                ruta_completa = os.path.join(carpeta_destino, nombre_limpio)
                
                if not os.path.exists(ruta_completa):
                    print(f"Descargando en {carpeta_destino}: {nombre_limpio}")
                    try:
                        img_data = requests.get(url_imagen).content
                        with open(ruta_completa, 'wb') as handler:
                            handler.write(img_data)
                    except Exception as e:
                        print(f"Error descargando {nombre_limpio}: {e}")

if __name__ == "__main__":
    for categoria, ruta_destino in CATEGORIAS.items():
        print(f"\nObteniendo lista de {categoria}...")
        archivos = obtener_lista_archivos(categoria)
        print(f"Se encontraron {len(archivos)} iconos. Guardando en /{ruta_destino}...")
        descargar_imagenes(archivos, ruta_destino)
        
    print("\n¡Descarga completada!")