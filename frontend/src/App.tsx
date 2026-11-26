import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Activity,
  Box,
  Cpu,
  Gauge,
  LayoutGrid,
  Moon,
  MoreHorizontal,
  Power,
  Rocket,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  Wifi,
} from 'lucide-react';
import { AppConfig, SystemInfo, SystemStats } from './types';
import { AppTileCard } from './components/AppTileCard';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SettingsModal } from './components/SettingsModal';

const Office3DView = lazy(() =>
  import('./components/Office3DView').then((m) => ({ default: m.Office3DView }))
);

type BottomTab = 'home' | 'perf' | 'space3d' | 'appmgr';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);

  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem('bumiayu_admin_token')
  );
  const [userName, setUserName] = useState(() => localStorage.getItem('bumiayu_user_name') || 'Pengguna');
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('bumiayu_avatar') || '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('bumiayu_theme') !== 'light');

  const [activeTab, setActiveTab] = useState<BottomTab>('home');
  const [serviceStates, setServiceStates] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Hidden Admin Login inside "Tentang Aplikasi"
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [authError, setAuthError] = useState('');

  const isAdmin = Boolean(adminToken);

  const loadData = () => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/system-info').then((r) => r.json()),
      fetch('/api/system-stats').then((r) => r.json()),
    ])
      .then(([cfg, sys, st]) => {
        setConfig(cfg);
        setSystemInfo(sys);
        setStats(st);
        if (!localStorage.getItem('bumiayu_hall_onboarded')) {
          setGuideOpen(true);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      fetch('/api/system-stats')
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
      fetch('/api/config')
        .then((r) => r.json())
        .then(setConfig)
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveConfig = async (newCfg: AppConfig) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCfg),
    });
    if (res.ok) setConfig(newCfg);
  };

  const handleAdminLogin = async () => {
    setAuthError('');
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassInput }),
    });
    const data = await res.json();
    if (res.ok && data.admin_token) {
      localStorage.setItem('bumiayu_admin_token', data.admin_token);
      setAdminToken(data.admin_token);
      setAdminPassInput('');
      setShowAdminLogin(false);
      setUserSettingsOpen(false);
    } else {
      setAuthError(data.error || 'Sandi Admin salah');
    }
  };

  const switchToUserMode = () => {
    localStorage.removeItem('bumiayu_admin_token');
    setAdminToken(null);
    setSettingsOpen(false);
  };

  const toggleService = async (slug: string, enable: boolean) => {
    if (!adminToken) return;
    await fetch('/api/service/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, enable, admin_token: adminToken }),
    });
  };

  const handleServerAction = async (action: string) => {
    const rootPassword = window.prompt(`Masukkan Sandi Root untuk aksi "${action}":`);
    if (!rootPassword) return;
    const res = await fetch('/api/server/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, root_password: rootPassword }),
    });
    if (res.ok) {
      alert(`Aksi ${action} berhasil dikirim.`);
    } else {
      alert('Sandi Root salah!');
    }
  };

  const filteredTiles =
    config?.tiles.filter(
      (t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
    ) ?? [];

  const bgClass = darkMode ? 'bg-[#0a0a0c] text-white' : 'bg-slate-100 text-slate-900';
  const cardClass = darkMode ? 'bg-[#16181d] border-white/10' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`min-h-screen ${bgClass} px-4 pt-5 pb-24 max-w-md mx-auto transition-colors`}>
      {/* Header: Greeting + User Avatar (Top Right) */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs opacity-60">Selamat Datang!</p>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            {isAdmin ? 'Admin Mode' : userName}
            {isAdmin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono">
                ADMIN
              </span>
            )}
          </h1>
          <div id="system-status-bar" className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-60 font-mono">
            <span className="text-emerald-400">Port {systemInfo?.active_port ?? 1001}</span>
            <span>·</span>
            <span>{systemInfo?.tailscale_ip || systemInfo?.lan_ip || window.location.hostname}</span>
          </div>
        </div>

        <button
          onClick={() => (isAdmin ? setSettingsOpen(true) : setUserSettingsOpen(true))}
          className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400/80 bg-white/10 flex items-center justify-center shrink-0"
          aria-label="Profil Pengguna"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 opacity-80" />
          )}
        </button>
      </header>

      {activeTab === 'home' && (
        <>
          {/* Top 2 Cards: Weather & System Load % */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className={`p-3.5 rounded-2xl border ${cardClass} flex items-center justify-between`}>
              <div>
                <div className="text-xl font-bold">30°C</div>
                <div className="text-[11px] opacity-60">Cuaca Hari Ini</div>
              </div>
              <Sun className="w-8 h-8 text-amber-400" />
            </div>

            <div className={`p-3.5 rounded-2xl border ${cardClass} flex items-center justify-between`}>
              <div>
                <div className="text-xl font-bold">{stats ? `${stats.cpu_percent.toFixed(0)}%` : '--%'}</div>
                <div className="text-[11px] opacity-60">Load Sistem</div>
              </div>
              <Cpu className="w-8 h-8 text-sky-400" />
            </div>
          </div>

          {/* Quick Access (Admin Only) OR Search Bar (User) */}
          {isAdmin ? (
            <div className="mb-5">
              <div className="text-xs font-semibold opacity-70 mb-2.5">Quick Access (Server)</div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Wi-Fi', icon: Wifi, action: 'network-restart' },
                  { label: 'Usage', icon: Activity, action: 'usage-check' },
                  { label: 'Reboot', icon: Power, action: 'reboot' },
                  { label: 'Proxy', icon: Shield, action: 'proxy-reload' },
                  { label: 'More', icon: MoreHorizontal, action: 'more' },
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={() => (q.action === 'more' ? setSettingsOpen(true) : handleServerAction(q.action))}
                    className={`p-2.5 rounded-xl border ${cardClass} flex flex-col items-center gap-1 hover:border-sky-500/50 transition`}
                  >
                    <q.icon className="w-4 h-4 opacity-85" />
                    <span className="text-[10px] opacity-70">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={`mb-5 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${cardClass}`}>
              <Search className="w-4 h-4 opacity-50" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari aplikasi..."
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
          )}

          {/* App Grid (2 Columns) */}
          <div id="tile-grid-area" className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold opacity-70">
              <span>Aplikasi ({filteredTiles.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTiles.map((tile) => (
                <AppTileCard
                  key={tile.id}
                  tile={tile}
                  isAdmin={isAdmin}
                  isEnabled={serviceStates[tile.slug] ?? true}
                  cardClass={cardClass}
                  onToggleService={(slug, next) => {
                    setServiceStates((prev) => ({ ...prev, [slug]: next }));
                    toggleService(slug, next);
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'perf' && (
        <div className="space-y-3 animate-fade-up">
          <h2 className="text-base font-bold">Performa & Kondisi Server</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-2xl border ${cardClass}`}>
              <div className="text-[11px] opacity-60">HW Info & Kondisi</div>
              <div className="text-sm font-bold mt-1">{stats?.hostname ?? 'Server'}</div>
              <div className="text-[11px] opacity-70">{stats?.os_name ?? 'Linux'} · Up {stats?.uptime_hours ?? 0}j</div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${cardClass}`}>
              <div className="text-[11px] opacity-60">CPU & RAM</div>
              <div className="text-sm font-bold mt-1">{stats ? `${stats.cpu_percent.toFixed(1)}% CPU` : '-'}</div>
              <div className="text-[11px] opacity-70">
                {stats ? `${stats.ram_used_mb}/${stats.ram_total_mb} MB (${stats.ram_percent.toFixed(0)}%)` : '-'}
              </div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${cardClass}`}>
              <div className="text-[11px] opacity-60">WiFi / Ethernet</div>
              <div className="text-xs font-mono mt-1 truncate">
                {stats?.interfaces?.length ? stats.interfaces.join(', ') : 'eth0 / wlan0'}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">
                {systemInfo?.tailscale_ip || systemInfo?.lan_ip || 'Connected'}
              </div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${cardClass}`}>
              <div className="text-[11px] opacity-60">Mounting / Disk</div>
              {stats?.disks?.slice(0, 2).map((d) => (
                <div key={d.mount} className="text-[11px] font-mono mt-0.5 truncate">
                  {d.mount}: {d.used_gb.toFixed(1)}/{d.total_gb.toFixed(0)} GB
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className={`p-3.5 rounded-2xl border ${cardClass} space-y-2`}>
              <div className="text-xs font-semibold opacity-75">Kontrol Power Server (Sandi Root)</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleServerAction('start-services')}
                  className="py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Start
                </button>
                <button
                  onClick={() => handleServerAction('reboot')}
                  className="py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold"
                >
                  Restart
                </button>
                <button
                  onClick={() => handleServerAction('poweroff')}
                  className="py-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Poweroff
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'appmgr' && isAdmin && (
        <div className={`p-4 rounded-2xl border ${cardClass} space-y-3 animate-fade-up`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">App Manager (Inline)</h2>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              + Scan / Tambah
            </button>
          </div>
          <p className="text-xs opacity-60">
            Kelola aplikasi yang terdeteksi di server Anda langsung dari tab ini.
          </p>
          <div className="space-y-2">
            {config?.tiles.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/10">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{t.name}</div>
                  <div className="text-[11px] opacity-50 truncate">/p/{t.slug}/ → {t.target_url}</div>
                </div>
                <a href={`/p/${t.slug}/`} className="px-2.5 py-1 rounded bg-sky-600 text-white text-xs font-semibold">
                  Buka
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'space3d' && (
        <Suspense fallback={<div className="p-6 text-center text-xs opacity-60">Memuat Kantor 3D...</div>}>
          <Office3DView
            tiles={config?.tiles ?? []}
            cpuPercent={stats?.cpu_percent ?? 0}
            ramPercent={stats?.ram_percent ?? 0}
          />
        </Suspense>
      )}

      {/* Bottom Bar (4 Icons, No Center Plus) */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-30 border-t ${
          darkMode ? 'bg-[#121418]/95 border-white/10' : 'bg-white/95 border-slate-200'
        } backdrop-blur-md pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="max-w-md mx-auto flex items-center justify-around h-14 px-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 text-[10px] ${activeTab === 'home' ? 'text-sky-400' : 'opacity-60'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('perf')}
            className={`flex flex-col items-center gap-0.5 text-[10px] ${activeTab === 'perf' ? 'text-sky-400' : 'opacity-60'}`}
          >
            <Gauge className="w-5 h-5" />
            <span>Performa</span>
          </button>

          {isAdmin ? (
            <button
              onClick={() => setActiveTab('appmgr')}
              className={`flex flex-col items-center gap-0.5 text-[10px] ${activeTab === 'appmgr' ? 'text-sky-400' : 'opacity-60'}`}
            >
              <Rocket className="w-5 h-5" />
              <span>App Mgr</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('space3d')}
              className={`flex flex-col items-center gap-0.5 text-[10px] ${activeTab === 'space3d' ? 'text-sky-400' : 'opacity-60'}`}
            >
              <Box className="w-5 h-5" />
              <span>3D</span>
            </button>
          )}

          <button
            id="settings-btn"
            onClick={() => (isAdmin ? setSettingsOpen(true) : setUserSettingsOpen(true))}
            className="flex flex-col items-center gap-0.5 text-[10px] opacity-60"
          >
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </button>
        </div>
      </nav>

      {/* User Safe Settings Modal + Hidden Admin Login in "Tentang Aplikasi" */}
      {userSettingsOpen && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full max-w-md rounded-t-2xl sm:rounded-2xl border p-5 space-y-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Pengaturan Pengguna</h2>
              <button onClick={() => setUserSettingsOpen(false)} className="text-xs opacity-60">Tutup</button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-sm">Mode Tampilan</span>
              <button
                onClick={() => {
                  const next = !darkMode;
                  setDarkMode(next);
                  localStorage.setItem('bumiayu_theme', next ? 'dark' : 'light');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs"
              >
                {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs opacity-70">Nama Tampilan</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  localStorage.setItem('bumiayu_user_name', e.target.value);
                }}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs opacity-70">URL Foto Profil (Kanan Atas)</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  localStorage.setItem('bumiayu_avatar', e.target.value);
                }}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setUserSettingsOpen(false);
                  setGuideOpen(true);
                }}
                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Ulangi Panduan (Tutorial)
              </button>
            </div>

            {/* Hidden Admin Access inside About Section */}
            <div className="pt-3 border-t border-white/10">
              <button
                onClick={() => setShowAdminLogin((s) => !s)}
                className="text-xs opacity-50 hover:opacity-100 underline"
              >
                Tentang Aplikasi Bumiayu Hall v{systemInfo?.version ?? '0.3.00'}
              </button>

              {showAdminLogin && (
                <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                  <div className="text-xs font-semibold">Masuk Panel Admin</div>
                  <input
                    type="password"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Masukkan Sandi Admin..."
                    className="w-full px-3 py-1.5 rounded bg-black/40 border border-white/15 text-xs"
                  />
                  {authError && <div className="text-[11px] text-red-400">{authError}</div>}
                  <button
                    onClick={handleAdminLogin}
                    className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                  >
                    Login Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <OnboardingGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      {config && isAdmin && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          systemInfo={systemInfo}
          onSaveConfig={handleSaveConfig}
          onReplayGuide={() => setGuideOpen(true)}
          onSwitchToUserMode={switchToUserMode}
        />
      )}
    </div>
  );
}
