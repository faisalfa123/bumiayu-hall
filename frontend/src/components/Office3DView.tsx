import { TileItem } from '../types';

interface Office3DViewProps {
  tiles: TileItem[];
  ramPercent: number;
  cpuPercent: number;
}

export function Office3DView({ tiles, ramPercent, cpuPercent }: Office3DViewProps) {
  return (
    <div className="bg-[#14161a] border border-white/10 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Kantor Server 2.5D</h2>
          <p className="text-xs text-white/50">Visualisasi poligon client-side (lazy-loaded)</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-1 rounded bg-sky-500/20 text-sky-300">
          CPU {cpuPercent.toFixed(0)}% · RAM {ramPercent.toFixed(0)}%
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-xl bg-[#0b0d10] border border-white/5 p-2">
        <svg viewBox="0 0 360 220" className="w-full h-auto">
          {/* Isometric Floor */}
          <polygon points="180,25 335,105 180,185 25,105" fill="#181b22" stroke="#2d3340" strokeWidth="1.5" />
          {/* Grid Lines */}
          <line x1="102" y1="65" x2="257" y2="145" stroke="#252a34" strokeWidth="1" />
          <line x1="257" y1="65" x2="102" y2="145" stroke="#252a34" strokeWidth="1" />

          {/* Isometric Server Racks / App Nodes */}
          {tiles.slice(0, 6).map((tile, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const cx = 130 + col * 50 - row * 35;
            const cy = 95 + col * 24 + row * 28;
            return (
              <g key={tile.id} className="cursor-pointer" onClick={() => (window.location.href = `/p/${tile.slug}/`)}>
                {/* Top face */}
                <polygon
                  points={`${cx},${cy - 26} ${cx + 20},${cy - 16} ${cx},${cy - 6} ${cx - 20},${cy - 16}`}
                  fill={tile.color || '#0078D7'}
                />
                {/* Left face */}
                <polygon
                  points={`${cx - 20},${cy - 16} ${cx},${cy - 6} ${cx},${cy + 14} ${cx - 20},${cy + 4}`}
                  fill={tile.color || '#0078D7'}
                  fillOpacity="0.7"
                />
                {/* Right face */}
                <polygon
                  points={`${cx},${cy - 6} ${cx + 20},${cy - 16} ${cx + 20},${cy + 4} ${cx},${cy + 14}`}
                  fill={tile.color || '#0078D7'}
                  fillOpacity="0.45"
                />
                <text x={cx} y={cy + 24} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="sans-serif">
                  {tile.name.slice(0, 10)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
