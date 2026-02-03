@echo off
echo ==========================================
echo    CONFIGURANDO GITHUB PARA CUATROPUNTAS
echo ==========================================
echo.

echo 1. Iniciando repositorio...
git init

echo.
echo 2. Agregando archivos (ignorando secretos)...
git add .

echo.
echo 3. Guardando version inicial...
git commit -m "Sitio Seguro v1"

echo.
echo 4. Conectando con GitHub...
git branch -M main
git remote add origin https://github.com/Raimfb/Cuatropuntas1.git

echo.
echo 5. Subiendo archivos...
echo (Si te pide usuario/clave, usa tu cuenta de GitHub)
echo.
git push -u origin main

echo.
echo ==========================================
echo    LISTO! SI NO HUBO ERRORES ROJOS
echo ==========================================
pause
