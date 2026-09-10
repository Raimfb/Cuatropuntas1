@echo off
echo ==========================================
echo    CONFIGURACION DE IDENTIDAD (NECESARIO UNA VEZ)
echo ==========================================
echo.
echo Git necesita saber quien eres para marcar tus cambios.
echo Introduce los datos que usas en GitHub (o tu nombre real).
echo.

set /p nombre="Escribe tu Nombre (ej. Juan Perez): "
set /p email="Escribe tu Email (ej. juan@gmail.com): "

git config --global user.name "%nombre%"
git config --global user.email "%email%"

echo.
echo ==========================================
echo    ¡LISTO! Identidad guardada.
echo    Ahora vuelve a ejecutar "subir_a_github.bat"
echo ==========================================
pause
