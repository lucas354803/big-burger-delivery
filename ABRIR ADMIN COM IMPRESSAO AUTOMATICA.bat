@echo off
set URL=http://localhost:3000/admin.html

echo Abrindo Big Burger Admin SEM QZ com impressao automatica...
echo IMPORTANTE: deixe sua impressora termica como impressora padrao do Windows.
echo Se seu sistema estiver no Vercel, edite este arquivo e troque a URL.
echo.

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --kiosk-printing --disable-popup-blocking
  exit
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --kiosk-printing --disable-popup-blocking
  exit
)

start msedge --app=%URL% --kiosk-printing --disable-popup-blocking
