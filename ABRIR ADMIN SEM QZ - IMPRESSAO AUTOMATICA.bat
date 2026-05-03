@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Big Burger - Impressao automatica SEM QZ

echo =====================================================
echo  BIG BURGER - ADMIN LOCAL SEM QZ
echo =====================================================
echo.
echo Este modo abre o painel local em: http://127.0.0.1:3000/admin.html
echo Deixe sua impressora termica como PADRAO do Windows.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado.
  echo Instale o Node.js LTS em https://nodejs.org e abra este arquivo de novo.
  pause
  exit /b 1
)

start "Big Burger Servidor Local" cmd /k "cd /d "%~dp0" && node servidor-local.js"

echo Aguardando servidor local abrir...
timeout /t 3 /nobreak >nul

set URL=http://127.0.0.1:3000/admin.html

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --kiosk-printing --disable-popup-blocking --disable-features=Translate
  exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --kiosk-printing --disable-popup-blocking --disable-features=Translate
  exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%URL% --kiosk-printing --disable-popup-blocking
  exit /b 0
)

start "" %URL%
