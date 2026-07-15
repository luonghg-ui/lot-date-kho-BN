#!/bin/bash
# Tu dong chuyen den thu muc chua file script nay
cd "$(dirname "$0")"

echo "========================================="
echo "      KHOI DONG WMS INVENTORY TOOL       "
echo "========================================="

# Kiem tra xem Node.js co duoc cai dat hay khong
if command -v node >/dev/null 2>&1; then
    echo "[OK] Tim thay Node.js. Khoi dong Proxy bang Node.js..."
    # Chay proxy trong terminal hien tai
    node start-proxy.cjs &
    PROXY_PID=$!
else
    echo "[Loi] macOS can Node.js de chay Proxy Server."
    echo "Vui long tai va cai dat tai: https://nodejs.org/"
    echo "Nhan bat ky phim nao de thoat..."
    read -n 1
    exit 1
fi

echo "Dang cho Proxy khoi dong (2 giay)..."
sleep 2

echo "Dang mo index.html tren trinh duyet..."
open index.html

echo "-----------------------------------------"
echo "Proxy dang chay voi PID $PROXY_PID."
echo "Dong cua so Terminal nay de tat Proxy."
echo "-----------------------------------------"

# Giu terminal chay va theo doi tien trinh proxy
wait $PROXY_PID
