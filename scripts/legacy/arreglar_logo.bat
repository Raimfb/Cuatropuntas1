@echo off
cd public
echo ============================================
echo   ARCHIVOS ANTES DEL CAMBIO:
echo ============================================
dir /b L*

echo.
echo Intentando arreglar el nombre...
echo.

:: Intento 1: Caso exacto detectado
if exist "Logo.jpg.png" ren "Logo.jpg.png" "logo.png"

:: Intento 2: Minusculas
if exist "logo.jpg.png" ren "logo.jpg.png" "logo.png"

:: Intento 3: Nombre simple
if exist "Logo.jpg" ren "Logo.jpg" "logo.png"

echo.
echo ============================================
echo   ARCHIVOS DESPUES (Deberia verse 'logo.png'):
echo ============================================
dir /b l*

echo.
echo Si ves 'logo.png' arriba, dale doble clic a 'subir_a_github.bat'
echo Si NO lo ves, avísame.
pause
