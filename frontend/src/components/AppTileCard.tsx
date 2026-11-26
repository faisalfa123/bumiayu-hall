import { memo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TileItem } from '../types';
import { AppIcon } from './IconPicker';

interface AppTileCardProps {
  tile: TileItem;
  isAdmin: boolean;
  isEnabled: boolean;
  cardClass: string;
  onToggleService: (slug: string, next: boolean) => void;
}

export const AppTileCard = memo(function AppTileCard({
  tile,
  isAdmin,
  isEnabled,
  cardClass,
  onToggleService,
}: AppTileCardProps) {
  const [launching, setLaunching] = useState(false);

  const prefetch = () => {
    fetch(`/p/${tile.slug}/`, { method: 'HEAD' }).catch(() => {});
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    setLaunching(true);
    window.location.href = `/p/${tile.slug}/`;
  };

  return (
    <div
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      className={`animate-fade-up transition-all duration-200 ease-in-out active:scale-95 p-4 rounded-2xl border ${cardClass} flex flex-col justify-between gap-3`}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: tile.color || '#0078D7' }}
        >
          <AppIcon name={tile.icon} className="w-5 h-5" />
        </div>
        {isAdmin && (
          <button
            onClick={() => onToggleService(tile.slug, !isEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              isEnabled ? 'bg-emerald-500' : 'bg-white/20'
            }`}
            title="On/Off Service"
            aria-label="Toggle Service"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        )}
      </div>

      <div>
        <div className="text-sm font-semibold truncate">{tile.name}</div>
        <div className="text-[11px] opacity-55 truncate">{tile.category}</div>
      </div>

      <a
        href={`/p/${tile.slug}/`}
        onClick={handleLaunch}
        className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold text-center transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        {launching ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Membuka...
          </>
        ) : (
          'Launch'
        )}
      </a>
    </div>
  );
});
