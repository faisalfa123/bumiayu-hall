import { useEffect, useState } from 'react';
import { Settings, Wifi } from 'lucide-react';
import { AppConfig, SystemInfo } from './types';
import { TileCard } from './components/TileCard';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white px-4 py-6 sm:px-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-6">
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
            <span className="opacity-50 font-mono">v{systemInfo?.version ?? '0.1.00'}</span>
          </div>
        </div>

        <button
          id="settings-btn"
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
          aria-label="Pengaturan"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main id="tile-grid-area" className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {config?.tiles.map((tile) => (
          <TileCard key={tile.id} tile={tile} />
        ))}
      </main>

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
