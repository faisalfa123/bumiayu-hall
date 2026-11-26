# Bumiayu Hall

**Bumiayu Hall** adalah *web app launcher* super ringan bergaya **Windows Mobile (Metro Tiles)** yang dibangun dengan **Rust (Axum)** dan **React + TypeScript + Tailwind CSS**. Dirancang khusus untuk berjalan mulus di perangkat ARM64 berdaya rendah seperti **Odroid C2** atau **STB HG680P**, serta menjaga pengalaman **PWA di iPhone (iOS Safari)** tetap *seamless* tanpa terlempar keluar ke browser saat membuka aplikasi di port berbeda.

---

## ✨ Fitur Utama

1. **Tampilan Windows Mobile / Metro Tiles**
   - Ikon kotak-kotak (*Small `1x1`*, *Medium `2x2`*, *Wide `4x2`*) dengan animasi responsif dan tema warna yang dapat dikustomisasi.
2. **Seamless Same-Origin Reverse Proxy (`/p/<slug>/`)**
   - Menyatukan berbagai web app yang berjalan di IP yang sama namun berbeda port (misal `:9000`, `:8096`, `:3000`) ke dalam **satu origin/domain**.
   - **Anti-keluar PWA iPhone:** Karena semua aplikasi diakses lewat `/p/<slug>/`, iOS Safari tidak menganggapnya sebagai domain/port berbeda.
3. **Auto-Port `1001` (+1 Increment)**
   - Secara default berjalan di port **`1001`**. Jika port `1001` sudah dipakai aplikasi lain, server otomatis mencari `1002`, `1003`, dst., dan **menampilkan port aktif langsung di UI**.
4. **Deteksi Jaringan, Tailscale & Web Server Sistem**
   - Otomatis mendeteksi **Tailscale IP (`100.x.y.z`) / MagicDNS**, IP LAN, dan `Host` aktif.
   - Mendeteksi web server sistem (**Apache / Nginx / Caddy**) dan menyediakan generator konfigurasi *VirtualHost / Reverse Proxy* siap pakai.
5. **Auto-Discovery Aplikasi Mastermind & Prompt Generator**
   - Memindai port lokal & service yang berjalan untuk mendeteksi aplikasi **Mastermind** yang sudah terinstall.
   - Dilengkapi **Prompt Generator** siap salin untuk diteruskan ke Antigravity IDE jika Mastermind memblokir *proxy/iframe/CORS*.
6. **Konfigurasi Fleksibel (`config.yaml`)**
   - **Klik-klik Preset** ala Heimdall (pilih aplikasi populer, isi port, klik simpan).
   - **Manual YAML Editor** langsung di dalam UI.
7. **Onboarding Ala Game (Panah SVG)**
   - Saat perangkat baru terdeteksi (`localStorage`), tutorial interaktif dengan panah penunjuk otomatis muncul. Dapat diulang kapan saja melalui menu **Pengaturan**.

---

## 🏷️ Sistem Versioning (`A.B.CC`)

Bumiayu Hall menggunakan skema versi **`A.B.CC`** (tercatat di file [`VERSION`](VERSION) dan GitHub Releases):

- **`A` (Major / Stable Release):** Dirilis saat fitur dan stabilitas sudah teruji dan siap digunakan secara penuh.
- **`B` (Beta / Unstable Release):** Dirilis saat ada penambahan banyak fitur baru dibandingkan perbaikan bug.
- **`CC` (Canary / Nightly Release):** Dirilis langsung setiap kali ada perbaikan bug (*bugfix*) cepat.

Contoh: `0.1.00` (Beta awal), `0.1.01` (Canary bugfix), `1.0.00` (Stable pertama).

---

## 🚀 Cara Menjalankan

### 1. Menggunakan Binary Release (Odroid C2 / STB HG680P / Linux / Windows)
Unduh binary sesuai arsitektur dari halaman [GitHub Releases](https://github.com/faisalfa123/bumiayu-hall/releases):
- `bumiayu-hall-aarch64-unknown-linux-gnu` (Odroid C2 / STB HG680P ARM64)
- `bumiayu-hall-x86_64-unknown-linux-gnu` (Linux x64)
- `bumiayu-hall-x86_64-pc-windows-msvc.exe` (Windows x64)

Jalankan langsung:
```bash
chmod +x bumiayu-hall-aarch64-unknown-linux-gnu
./bumiayu-hall-aarch64-unknown-linux-gnu
```
Server akan otomatis membuat `config.yaml` di direktori yang sama dan berjalan di `http://0.0.0.0:1001` (atau port kosong berikutnya).

### 2. Build dari Source
Pastikan **Rust** dan **Node.js** sudah terinstall:
```bash
# 1. Build Frontend
cd frontend
npm install
npm run build
cd ..

# 2. Build Rust Single Binary (frontend otomatis ter-embed)
cargo build --release
./target/release/bumiayu-hall
```

---

## 🔧 Kustomisasi
- **UI & Tema:** Buka menu **Pengaturan → Tampilan & Panduan** untuk mengganti warna aksen atau mengulang tutorial.
- **Menambah Aplikasi:** Buka **Pengaturan → Tambah / Preset** untuk memilih preset, atau gunakan **Manual YAML Editor** untuk kontrol penuh atas `config.yaml`.
