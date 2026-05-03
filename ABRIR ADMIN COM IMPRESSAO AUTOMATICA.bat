@echo off
set URL=https://big-burger-delivery.vercel.app/admin.html

echo Abrindo Big Burger Admin com impressao automatica...
echo IMPORTANTE: deixe sua impressora termica como impressora padrao do Windows.
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
