@echo off
chcp 65001 >nul
echo.
echo ================================================
echo   BIG BURGER - QZ SEM AVISO / AUTO ACCEPT
echo ================================================
echo.
echo 1) Fechando QZ Tray se estiver aberto...
taskkill /IM qz-tray.exe /F >nul 2>&1
taskkill /IM qz-tray-console.exe /F >nul 2>&1
ping 127.0.0.1 -n 2 >nul

set "QZDIR=%APPDATA%\qz"
set "QZFILE=%QZDIR%\qz-tray.properties"
if not exist "%QZDIR%" mkdir "%QZDIR%"
if not exist "%QZFILE%" type nul > "%QZFILE%"

echo 2) Gravando configuração local do QZ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:QZFILE; $c=Get-Content $p -Raw; $pairs=[ordered]@{'security.allowUntrusted'='true';'security.autoAccept'='true';'security.autoAcceptLocal'='true';'security.autoAcceptSite'='true';'wss.host'='localhost';'wss.port'='8181'}; foreach($k in $pairs.Keys){ if($c -match ('(?m)^'+[regex]::Escape($k)+'=')){ $c=[regex]::Replace($c, '(?m)^'+[regex]::Escape($k)+'=.*$', $k+'='+$pairs[$k]) } else { $c += "`r`n$k=$($pairs[$k])" } }; Set-Content -Path $p -Value $c -Encoding UTF8"

echo.
echo 3) Pronto.
echo Agora abra o QZ Tray manualmente como ADMINISTRADOR.
echo Se aparecer uma vez, marque Remember this decision e Allow.
echo.
pause
