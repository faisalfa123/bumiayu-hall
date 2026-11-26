#!/usr/bin/env bash
set -euo pipefail

ARCH=$(uname -m)
case "$ARCH" in
  aarch64|arm64) BIN_NAME="bumiayu-hall-linux-arm64" ;;
  x86_64|amd64)  BIN_NAME="bumiayu-hall-linux-amd64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Downloading $BIN_NAME..."
sudo curl -fsSL "https://github.com/faisalfa123/bumiayu-hall/releases/latest/download/$BIN_NAME" -o /usr/local/bin/bumiayu-hall
sudo chmod +x /usr/local/bin/bumiayu-hall

sudo mkdir -p /etc/bumiayu-hall

if [ ! -f /etc/bumiayu-hall/secrets.json ]; then
  echo "=== Konfigurasi Keamanan Awal Bumiayu Hall ==="
  echo "Password akan dienkripsi menggunakan Argon2 saat server pertama kali berjalan."
  echo "Default awal jika belum diubah: Admin = admin123 | Root = root123"
else
  echo "secrets.json sudah ada — mempertahankan password Admin & Root yang tersimpan."
fi

sudo curl -fsSL "https://raw.githubusercontent.com/faisalfa123/bumiayu-hall/main/deploy/bumiayu-hall.service" -o /etc/systemd/system/bumiayu-hall.service
sudo systemctl daemon-reload
sudo systemctl enable --now bumiayu-hall
echo "Bumiayu Hall is now running on systemd!"
sudo systemctl status bumiayu-hall --no-pager
