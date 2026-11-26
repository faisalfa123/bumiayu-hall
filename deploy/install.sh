#!/usr/bin/env bash
set -euo pipefail

ARCH=$(uname -m)
case "$ARCH" in
  aarch64|arm64) BIN_NAME="bumiayu-hall-linux-arm64" ;;
  x86_64|amd64)  BIN_NAME="bumiayu-hall-linux-amd64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo -e "\033[1;36m╔══════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;36m║       Bumiayu Hall — Installer TUI           ║\033[0m"
echo -e "\033[1;36m╚══════════════════════════════════════════════╝\033[0m"

echo "[1/3] Menghentikan service lama & mengunduh $BIN_NAME..."
sudo systemctl stop bumiayu-hall 2>/dev/null || true
sudo curl -fsSL "https://github.com/faisalfa123/bumiayu-hall/releases/latest/download/$BIN_NAME" -o /usr/local/bin/bumiayu-hall
sudo chmod +x /usr/local/bin/bumiayu-hall
sudo mkdir -p /etc/bumiayu-hall

echo "[2/3] Konfigurasi Keamanan..."
if [ ! -f /etc/bumiayu-hall/secrets.json ]; then
  if command -v whiptail >/dev/null 2>&1; then
    whiptail --title "Bumiayu Hall Setup" --msgbox "Instalasi pertama terdeteksi.\n\nDefault sandi awal:\n- Admin: admin123\n- Root: root123\n\nAnda dapat langsung mengubah sandi ini di Pengaturan -> Sistem setelah login Admin." 12 60 || true
  else
    echo "  -> Instalasi pertama: Default Admin = admin123 | Root = root123"
    echo "  -> Ubah sandi kapan saja di Pengaturan Admin."
  fi
else
  echo "  -> secrets.json ditemukan, sandi lama tetap dipertahankan."
fi

echo "[3/3] Mengaktifkan systemd service..."
sudo curl -fsSL "https://raw.githubusercontent.com/faisalfa123/bumiayu-hall/main/deploy/bumiayu-hall.service" -o /etc/systemd/system/bumiayu-hall.service
sudo systemctl daemon-reload
sudo systemctl enable --now bumiayu-hall
echo -e "\033[1;32m✓ Bumiayu Hall aktif di systemd!\033[0m"
sudo systemctl status bumiayu-hall --no-pager
