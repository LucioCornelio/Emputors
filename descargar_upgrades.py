import requests
import os

API_URL = "https://ageofempires.fandom.com/api.php"

ARCHIVOS = {
    "File:LongSwordmanUpgDE.png": "frontend/public/techs",
    "File:Monastery_aoe2DE.png": "frontend/public/buildings"
}

def descargar_exactos():
    for titulo, carpeta in ARCHIVOS.items():
        os.makedirs(carpeta, exist_ok=True)
        params = {
            "action": "query",
            "titles": titulo,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json"
        }
        try:
            resp = requests.get(API_URL, params=params).json()
            paginas = resp.get('query', {}).get('pages', {})
            for page_id, pagina in paginas.items():
                if 'imageinfo' in pagina:
                    url = pagina['imageinfo'][0]['url']
                    nombre_limpio = titulo.replace("File:", "").replace(" ", "_")
                    ruta = os.path.join(carpeta, nombre_limpio)
                    if not os.path.exists(ruta):
                        img_data = requests.get(url).content
                        with open(ruta, 'wb') as handler:
                            handler.write(img_data)
                        print(f"✅ Descargado: {nombre_limpio}")
                    else:
                        print(f"⚡ Ya existe: {nombre_limpio}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    descargar_exactos()