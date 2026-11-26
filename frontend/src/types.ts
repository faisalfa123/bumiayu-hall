export type TileSize = 'small' | 'medium' | 'wide';

export interface TileItem {
  id: string;
  name: string;
  slug: string;
  target_url: string;
  icon: string;
  color: string;
  size: TileSize;
  category: string;
}

export interface AppConfig {
  title: string;
  accent_color: string;
  tiles: TileItem[];
}

export interface SystemInfo {
  version: string;
  active_port: number;
  lan_ip: string | null;
  tailscale_ip: string | null;
  tailscale_dns: string | null;
  detected_web_servers: string[];
}

export interface DiscoveredApp {
  name: string;
  slug: string;
  port: number;
  target_url: string;
  icon: string;
  source: string;
}
