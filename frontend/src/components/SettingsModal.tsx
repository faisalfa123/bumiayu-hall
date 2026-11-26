import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { AppConfig, DiscoveredApp, SystemInfo, TileItem, TileSize } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  systemInfo: SystemInfo | null;
  onSaveConfig: (cfg: AppConfig) => Promise<void>;
  onReplayGuide: () => void;
}

const PRESETS: Omit<TileItem, 'id'>[] = [
  { name: 'Mastermind', slug: 'mastermind', target_url: 'http://127.0.0.1:3000', icon: 'brain', color: '#0078D7', size: 'wide', category: 'Core' },
  { name: 'Portainer', slug: 'portainer', target_url: 'http://127.0.0.1:9000', icon: 'box', color: '#107C10', size: 'medium', category: 'System' },
  { name: 'AdGuard Home', slug: 'adguard', target_url: 'http://127.0.0.1:3001', icon: 'shield', color: '#68217A', size: 'small', category: 'Network' },
  { name: 'Jellyfin', slug: 'jellyfin', target_url: 'http://127.0.0.1:8096', icon: 'film', color: '#D83B01', size: 'small', category: 'Media' },
  { name: 'Home Assistant', slug: 'homeassistant', target_url: 'http://127.0.0.1:8123', icon: 'home', color: '#038387', size: 'medium', category: 'IoT' },
];

export function SettingsModal({
  open,
  onClose,
  config,
  systemInfo,
  onSaveConfig,
  onReplayGuide,
}: SettingsModalProps) {
  const [tab, setTab] = useState<'presets' | 'yaml' | 'system'>('presets');
  const [yamlText, setYamlText] = useState('');
  const [discovered, setDiscovered] = useState<DiscoveredApp[]>([]);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/config/yaml')
      .then((r) => r.text())
      .then(setYamlText)
      .catch(() => {});
  }, [open, config]);

  if (!open) return null;

  const scanApps = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/discover');
      const data = await res.json();
      setDiscovered(data);
    } finally {
      setScanning(false);
    }
  };

  const addTile = async (item: Omit<TileItem, 'id'>) => {
    const newTile: TileItem = { ...item, id: `${item.slug}-${Date.now()}` };
    const updated: AppConfig = { ...config, tiles: [...config.tiles, newTile] };
    await onSaveConfig(updated);
    setStatusMsg(`"${item.name}" ditambahkan!`);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const removeTile = async (id: string) => {
    const updated: AppConfig = {
      ...config,
      tiles: config.tiles.filter((t) => t.id !== id),
    };
    await onSaveConfig(updated);
  };

  const cycleSize = async (id: string) => {
    const order: TileSize[] = ['small', 'medium', 'wide'];
    const updated: AppConfig = {
      ...config,
      tiles: config.tiles.map((t) => {
        if (t.id !== id) return t;
        const next = order[(order.indexOf(t.size) + 1) % order.length];
        return { ...t, size: next };
      }),
    };
    await onSaveConfig(updated);
  };

  const saveYaml = async () => {
    const res = await fetch('/api/config/yaml', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: yamlText }),
    });
    if (res.ok) {
      setStatusMsg('YAML berhasil disimpan!');
      window.location.reload();
    } else {
      setStatusMsg(await res.text());
    }
  };

  const mastermindPrompt = `Tolong periksa project Mastermind agar bisa dibuka dengan lancar melalui reverse proxy Bumiayu Hall (path /p/mastermind/ di port ${systemInfo?.active_port ?? 1001}):
1. Pastikan aplikasi tidak memblokir embedding/proxy dengan menghapus atau melonggarkan header X-Frame-Options dan Content-Security-Policy frame-ancestors.
2. Gunakan relative path (atau base path dinamis) untuk aset JS/CSS dan API call agar tidak rusak saat diakses melalui subpath /p/mastermind/.
3. Aktifkan CORS untuk origin ${window.location.origin} jika diperlukan.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(mastermindPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#14161a] border border-white/15 sm:rounded-xl flex flex-col overflow-hidden text-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold">Pengaturan Bumiayu Hall</h2>
          <button onClick={onClose} className="p-1 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-white/10 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setTab('presets')}
            className={`flex-1 py-3 ${tab === 'presets' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-white/60'}`}
          >
            Klik-Klik Preset & Scan
          </button>
          <button
            onClick={() => setTab('yaml')}
            className={`flex-1 py-3 ${tab === 'yaml' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-white/60'}`}
          >
            Manual YAML
          </button>
          <button
            onClick={() => setTab('system')}
            className={`flex-1 py-3 ${tab === 'system' ? 'border-b-2 border-sky-500 text-sky-400' : 'text-white/60'}`}
          >
            Sistem, Tailscale & Mastermind
          </button>
        </div>

        {statusMsg && (
          <div className="bg-sky-600/20 border-b border-sky-500/30 px-5 py-2 text-xs text-sky-300">
            {statusMsg}
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {tab === 'presets' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/90">Deteksi Otomatis (Mastermind & Port Lokal)</h3>
                  <button
                    onClick={scanApps}
                    disabled={scanning}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Memindai...' : 'Scan Port Lokal'}
                  </button>
                </div>
                {discovered.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {discovered.map((app) => (
                      <div key={app.port} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/10">
                        <div>
                          <div className="text-xs font-semibold">{app.name}</div>
                          <div className="text-[11px] text-white/50">:{app.port} ({app.source})</div>
                        </div>
                        <button
                          onClick={() =>
                            addTile({
                              name: app.name,
                              slug: app.slug,
                              target_url: app.target_url,
                              icon: app.icon,
                              color: '#0078D7',
                              size: 'medium',
                              category: 'Discovered',
                            })
                          }
                          className="p-1.5 rounded bg-sky-600 hover:bg-sky-500"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Preset Populer (Tinggal Klik)</h3>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.slug}
                      onClick={() => addTile(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white/10 hover:bg-white/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Tile Aktif ({config.tiles.length})</h3>
                <div className="space-y-2">
                  {config.tiles.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/10">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{t.name}</div>
                        <div className="text-xs text-white/50 truncate">/p/{t.slug}/ → {t.target_url}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => cycleSize(t.id)}
                          className="px-2 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 uppercase"
                        >
                          {t.size}
                        </button>
                        <button
                          onClick={() => removeTile(t.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'yaml' && (
            <div className="space-y-3">
              <p className="text-xs text-white/60">
                Edit langsung isi <code>config.yaml</code> di bawah ini untuk kustomisasi penuh.
              </p>
              <textarea
                value={yamlText}
                onChange={(e) => setYamlText(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs bg-black/50 border border-white/15 rounded p-3 text-emerald-300 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={saveYaml}
                className="flex items-center gap-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
              >
                <Save className="w-4 h-4" /> Simpan YAML
              </button>
            </div>
          )}

          {tab === 'system' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-semibold text-sm text-white mb-1">Informasi Server & Jaringan</div>
                <div>Versi: <span className="text-sky-400 font-mono">v{systemInfo?.version ?? '-'}</span></div>
                <div>Port Aktif: <span className="text-emerald-400 font-mono">{systemInfo?.active_port ?? 1001}</span></div>
                <div>IP LAN: <span className="font-mono">{systemInfo?.lan_ip ?? 'Tidak terdeteksi'}</span></div>
                <div>Tailscale IP: <span className="font-mono text-sky-300">{systemInfo?.tailscale_ip ?? 'Tidak aktif'}</span></div>
                <div>Tailscale DNS: <span className="font-mono text-sky-300">{systemInfo?.tailscale_dns ?? '-'}</span></div>
                <div>
                  Web Server Sistem:{' '}
                  <span className="font-mono">
                    {systemInfo?.detected_web_servers.length
                      ? systemInfo.detected_web_servers.join(', ')
                      : 'Tidak ada (menggunakan built-in Rust server)'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded bg-white/5 border border-white/10 space-y-2">
                <div className="font-semibold text-sm text-white">Panduan Perangkat Baru</div>
                <p className="text-white/60">Tampilkan ulang tutorial panah interaktif seperti saat perangkat pertama kali login.</p>
                <button
                  onClick={() => {
                    onClose();
                    onReplayGuide();
                  }}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 font-medium"
                >
                  Ulangi Panduan (Tutorial)
                </button>
              </div>

              <div className="p-3.5 rounded bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-white">Prompt untuk Mastermind (Antigravity IDE)</div>
                  <button
                    onClick={copyPrompt}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold"
                  >
                    <Copy className="w-3 h-3" /> {copied ? 'Tersalin!' : 'Salin Prompt'}
                  </button>
                </div>
                <p className="text-white/60">
                  Jika Mastermind menolak dibuka melalui proxy Bumiayu Hall, salin prompt ini dan kirimkan ke Antigravity IDE yang mengerjakan Mastermind:
                </p>
                <pre className="p-2.5 rounded bg-black/50 border border-white/10 text-[11px] text-white/80 whitespace-pre-wrap font-mono">
                  {mastermindPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
