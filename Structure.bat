@echo off
echo Generando mapa limpio del proyecto...
powershell -Command "Get-ChildItem -Path . -Recurse | Where-Object { $_.FullName -notmatch '\\node_modules|\\venv|\\.git|\\__pycache__|\\dist|\\build' } | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') } > estructura_proyecto.txt"
echo ¡Listo! Se ha creado el archivo estructura_proyecto.txt
pause