import { useEffect, useState } from 'react';
import { RefreshCw, Search, Settings, Wifi, X } from 'lucide-react';
import { AppConfig, SystemInfo } from './types';
import { TileCard } from './components/TileCard';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const loadData = () => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/system-info').then((r) => r.json()),
    ])
      .then(([cfg, sys]) => {
        setConfig(cfg);
        setSystemInfo(sys);
        if (!localStorage.getItem('bumiayu_hall_onboarded')) {
          setGuideOpen(true);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (newCfg: AppConfig) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCfg),
    });
    if (res.ok) {
      setConfig(newCfg);
    }
  };

  const activeHost =
    systemInfo?.tailscale_dns ||
    systemInfo?.tailscale_ip ||
    systemInfo?.lan_ip ||
    window.location.hostname;

  const filteredTiles =
    config?.tiles.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase())
    ) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white px-4 pt-6 pb-28 sm:pb-10 sm:px-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
            {config?.title ?? 'Bumiayu Hall'}
          </h1>
          <div
            id="system-status-bar"
            className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-white/60"
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-emerald-400 font-mono">
              <Wifi className="w-3 h-3" /> Port {systemInfo?.active_port ?? 1001}
            </span>
            <span className="font-mono">{activeHost}</span>
            {systemInfo?.tailscale_ip && (
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                Tailscale
              </span>
            )}
            <span className="opacity-50 font-mono">v{systemInfo?.version ?? '0.2.00'}</span>
          </div>
        </div>

        <button
          id="settings-btn"
          onClick={() => setSettingsOpen(true)}
          className="hidden sm:flex p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
          aria-label="Pengaturan"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {searchOpen && (
        <div className="mb-4 flex items-center gap-2 bg-white/10 border border-white/15 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-white/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari aplikasi..."
            autoFocus
            className="bg-transparent text-sm w-full focus:outline-none placeholder:text-white/40"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <main id="tile-grid-area" className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {filteredTiles.map((tile) => (
          <TileCard key={tile.id} tile={tile} />
        ))}
      </main>

      {/* Mobile Bottom Bar (Thumb Zone) + iPhone Safe Area */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#121418]/90 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 px-4">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${searchOpen ? 'text-sky-400' : 'text-white/70'}`}
          >
            <Search className="w-5 h-5" />
            <span>Cari</span>
          </button>
          <button
            onClick={loadData}
            className="flex flex-col items-center gap-0.5 text-[11px] text-white/70 active:text-sky-400"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center gap-0.5 text-[11px] text-white/70"
          >
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </button>
        </div>
      </nav>

      <OnboardingGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      {config && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          systemInfo={systemInfo}
          onSaveConfig={handleSaveConfig}
          onReplayGuide={() => setGuideOpen(true)}
        />
      )}
    </div>
  );
}
