import { memo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TileItem } from '../types';
import { AppIcon } from './IconPicker';

interface AppTileCardProps {
  tile: TileItem;
  isAdmin: boolean;
  isEnabled: boolean;
  onToggleService: (slug: string, next: boolean) => void;
}

export const AppTileCard = memo(function AppTileCard({
  tile,
  isAdmin,
  isEnabled,
  onToggleService,
}: AppTileCardProps) {
  const [launching, setLaunching] = useState(false);

  const prefetch = () => {
    fetch(`/p/${tile.slug}/`, { method: 'HEAD' }).catch(() => {});
  };

  const handleLaunch = () => {
    setLaunching(true);
    window.location.href = `/p/${tile.slug}/`;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleLaunch}
      onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
      onTouchStart={prefetch}
      style={{ backgroundColor: tile.color || '#0078D7' }}
      className="relative w-full aspect-square rounded-2xl cursor-pointer select-none active:bg-opacity-80 active:scale-95 transition-all duration-100 overflow-hidden shadow-md flex items-center justify-center"
    >
      {/* Category badge top-left */}
      <span className="absolute top-2.5 left-3 text-[10px] uppercase tracking-wider text-white/75 font-semibold">
        {tile.category}
      </span>

      {/* Admin Toggle Switch top-right */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleService(tile.slug, !isEnabled);
          }}
          className={`absolute top-2.5 right-2.5 w-10 h-5 rounded-full transition-colors duration-200 ${
            isEnabled ? 'bg-emerald-400' : 'bg-black/35'
          }`}
          title="On/Off Service"
          aria-label="Toggle Service"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      )}

      {/* Center Icon or Loading Spinner */}
      {launching ? (
        <Loader2 className="w-9 h-9 text-white animate-spin" />
      ) : (
        <AppIcon name={tile.icon} className="w-10 h-10 text-white drop-shadow" />
      )}

      {/* App Name bottom-left */}
      <span className="absolute bottom-2.5 left-3 right-3 text-xs font-semibold text-white truncate drop-shadow">
        {tile.name}
      </span>
    </div>
  );
});
