import { TileItem } from '../types';
import { AppIcon } from './IconPicker';

interface TileCardProps {
  tile: TileItem;
}

export function TileCard({ tile }: TileCardProps) {
  const sizeClasses =
    tile.size === 'wide'
      ? 'col-span-4 sm:col-span-2 aspect-[2/1]'
      : tile.size === 'medium'
      ? 'col-span-2 sm:col-span-1 aspect-square'
      : 'col-span-1 aspect-square';

  const iconSize = tile.size === 'small' ? 'w-7 h-7' : 'w-10 h-10';

  return (
    <a
      href={`/p/${tile.slug}/`}
      className={`metro-tile relative flex flex-col justify-between p-3.5 text-white shadow-md select-none overflow-hidden ${sizeClasses}`}
      style={{ backgroundColor: tile.color || '#0078D7' }}
      title={`${tile.name} (${tile.target_url})`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-wider opacity-75 font-semibold">
          {tile.category}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 my-1">
        <AppIcon name={tile.icon} className={`${iconSize} drop-shadow`} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold truncate drop-shadow-sm">
          {tile.name}
        </span>
      </div>
    </a>
  );
}
