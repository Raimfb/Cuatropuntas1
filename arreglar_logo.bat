@echo off
cd public
if exist "Logo.jpg.png" ren "Logo.jpg.png" "logo.png"
if exist "logo.jpg" ren "logo.jpg" "logo.png"
echo Nombre arreglado!
pause
