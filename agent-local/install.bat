@echo off
title EMDC Copilote - Agent Local
echo ====================================
echo   EMDC Copilote - Installation
echo ====================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
  echo.
  echo 1. Allez sur https://nodejs.org
  echo 2. Telechargez et installez la version "LTS" ^(recommandee^)
  echo 3. Relancez ensuite ce fichier ^(install.bat^)
  echo.
  pause
  exit /b 1
)

echo [OK] Node.js detecte.
echo.
echo Telechargement du tunnel securise...
node scripts\download-cloudflared.js
if %errorlevel% neq 0 (
  pause
  exit /b 1
)

echo.
echo Installation du module de navigation (une seule fois, quelques Mo)...
call npm install --no-audit --no-fund --omit=dev
if %errorlevel% neq 0 (
  echo [ATTENTION] L'installation du module de navigation a echoue.
  echo L'agent fonctionnera quand meme pour vos documents ; la navigation
  echo pilotee sur votre PC ne sera pas disponible tant que ce n'est pas corrige.
)

echo.
echo Installation terminee !
echo Demarrage de l'agent...
echo.
call start.bat
