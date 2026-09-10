@echo off
echo ==========================================
echo    ORGANIZANDO ARCHIVOS PARA VERCEL
echo ==========================================
echo.

if not exist public mkdir public

echo Moviendo archivos al folder public...
move index.html public/
move style.css public/
move *.png public/

echo.
echo Eliminando config vieja...
if exist vercel.json del vercel.json

echo.
echo ==========================================
echo    ARCHIVOS ORGANIZADOS!
echo ==========================================
pause
