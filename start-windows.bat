@echo off
title WMS Inventory Tool
echo Khoi dong WMS Inventory Tool...

:: Kiem tra xem Node.js co duoc cai dat hay khong
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tim thay Node.js. Khoi dong Proxy bang Node.js...
    start "WMS Proxy (Node.js)" node start-proxy.cjs
) else (
    echo [Info] Khong tim thay Node.js. Khoi dong Proxy bang PowerShell...
    start "WMS Proxy (PowerShell)" powershell -NoProfile -ExecutionPolicy Bypass -File proxy.ps1
)

echo Dang cho Proxy khoi dong (2 giay)...
timeout /t 2 >nul

echo Mo ung dung tren trinh duyet...
start "" "index.html"

echo Da khoi dong xong!
exit
