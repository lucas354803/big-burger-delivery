@echo off
chcp 65001 >nul
echo.
echo ================================================
echo   BIG BURGER - CONFIGURAR QZ TRAY SEM AVISO
echo ================================================
echo.
echo Feche o QZ Tray antes de continuar.
pause
set "QZDIR=%APPDATA%\qz"
set "QZFILE=%QZDIR%\qz-tray.properties"
if not exist "%QZDIR%" mkdir "%QZDIR%"
if not exist "%QZFILE%" type nul > "%QZFILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:QZFILE; $c=Get-Content $p -Raw; $pairs=@{'security.allowUntrusted'='true';'security.autoAccept'='true'}; foreach($k in $pairs.Keys){ if($c -match ('(?m)^'+[regex]::Escape($k)+'=')){ $c=[regex]::Replace($c, '(?m)^'+[regex]::Escape($k)+'=.*$', $k+'='+$pairs[$k]) } else { $c += \"`r`n$k=$($pairs[$k])\" } }; Set-Content -Path $p -Value $c -Encoding UTF8"
echo.
echo Pronto. Agora abra o QZ Tray de novo.
echo Se ainda pedir permissao uma vez, marque Remember this decision e Allow.
echo.
pause
