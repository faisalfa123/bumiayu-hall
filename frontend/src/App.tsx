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
import { AppIcon } from './components/IconPicker';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SettingsModal } from './components/SettingsModal';

const Office3DView = lazy(() =>
  import('./components/Office3DView').then((m) => ({ default: m.Office3DView }))
);

type BottomTab = 'home' | 'perf' | 'space3d';

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
    }, 5000);
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
            <div className="grid grid-cols-2 gap-3">
              {filteredTiles.map((tile) => (
                <div
                  key={tile.id}
                  className={`p-3.5 rounded-2xl border ${cardClass} flex flex-col justify-between gap-3`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: tile.color || '#0078D7' }}
                    >
                      <AppIcon name={tile.icon} className="w-5 h-5" />
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => toggleService(tile.slug, true)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold"
                        title="On/Off Service"
                      >
                        ON/OFF
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold truncate">{tile.name}</div>
                    <div className="text-[11px] opacity-55 truncate">{tile.category}</div>
                  </div>

                  <a
                    href={`/p/${tile.slug}/`}
                    className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold text-center transition"
                  >
                    Launch
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'perf' && (
        <div className={`p-4 rounded-2xl border ${cardClass} space-y-3`}>
          <h2 className="text-base font-bold">Detail Performa Server</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">CPU Load</span>
              <span className="font-mono font-semibold">{stats ? `${stats.cpu_percent.toFixed(1)}%` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">RAM Terpakai</span>
              <span className="font-mono font-semibold">
                {stats ? `${stats.ram_used_mb} MB / ${stats.ram_total_mb} MB (${stats.ram_percent.toFixed(0)}%)` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Uptime</span>
              <span className="font-mono font-semibold">{stats ? `${stats.uptime_hours} jam` : '-'}</span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleServerAction('restart-services')}
              className="w-full mt-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              Atur Sistem (Butuh Sandi Root)
            </button>
          )}
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
              onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center gap-0.5 text-[10px] opacity-60 hover:text-sky-400"
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
