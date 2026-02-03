@echo off
cd public
echo Buscando archivo de logo...
if exist "Logo.jpg.png" (
    ren "Logo.jpg.png" "logo.png"
    echo [EXITO] Renombrado Logo.jpg.png a logo.png
) else (
    echo [INFO] No encontre Logo.jpg.png, quizas ya se llama logo.png?
)

if exist "logo.jpg" (
    ren "logo.jpg" "logo.png"
    echo [EXITO] Renombrado logo.jpg a logo.png
)

echo.
echo LISTO! Ahora ejecuta "subir_a_github.bat"
time /t
pause
