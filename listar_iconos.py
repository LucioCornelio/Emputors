import os

carpetas = ["frontend/public/units", "frontend/public/techs", "frontend/public/buildings"]
archivo_salida = "lista_iconos.txt"

with open(archivo_salida, "w", encoding="utf-8") as f:
    for carpeta in carpetas:
        if os.path.exists(carpeta):
            archivos = sorted(os.listdir(carpeta))
            for archivo in archivos:
                if archivo.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                    ruta_relativa = f"/{carpeta}/{archivo}".replace("frontend/public", "").replace("//", "/")
                    f.write(f"{ruta_relativa}\n")

print(f"Lista guardada en {archivo_salida}")