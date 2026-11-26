# Changelog

## [0.3.00] - 2026-11-26
### Added
- **Smart-Hub Mobile UI**: Greeting + User Avatar di kanan atas, kartu **Cuaca Hari Ini** & **Load Sistem (%)**, serta 4-ikon Bottom Bar (`Home`, `Performa`, `3D` / `App Mgr`, `Pengaturan`).
- **Role System (Admin & User)**:
  - Password **Admin** dan **Root** terenkripsi menggunakan **Argon2** di `secrets.json` (dipertahankan saat update).
  - Admin: Quick Access server, kontrol **ON/OFF** aplikasi (Mastermind / `systemd`), dan tombol **Masuk ke User Mode**.
  - User: Tampilan bersih dengan Search Bar, tombol **Launch**, Detail Performa Server, dan akses login Admin tersembunyi di **Pengaturan → Tentang Aplikasi Bumiayu Hall**.
- **2.5D Isometric Office (`Office3DView`)**: Visualisasi server poligon client-side yang di-*lazy-load* (`0.89 kB` gzip).
- **First-Launch Device Token**: Registrasi token perangkat otomatis saat menekan tombol **Mulai** di akhir tutorial.

## [0.2.00] - 2026-11-26
### Added
- Penamaan binary rilis bersih (`bumiayu-hall-linux-arm64`, `bumiayu-hall-linux-amd64`, `bumiayu-hall-windows-amd64.exe`).
- Dukungan `systemd` (`deploy/bumiayu-hall.service` dan `deploy/install.sh`).
- Deteksi aplikasi via **Mastermind API** (`GET /api/apps`) + fallback local port scan.
- Mobile Bottom Bar (Thumb Zone) + iPhone `safe-area-inset-bottom`.

## [0.1.00] - 2026-11-26
### Added
- Rilis awal Bumiayu Hall (Rust Axum + React Vite TypeScript + Tailwind CSS).
- Auto-port `1001` (+1 increment), same-origin reverse proxy (`/p/<slug>/`), deteksi Tailscale, dan konfigurasi `config.yaml`.
