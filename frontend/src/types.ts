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
  mastermind_api_url?: string;
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

export interface DiskInfo {
  mount: string;
  used_gb: number;
  total_gb: number;
}

export interface ProcessInfo {
  name: string;
  cpu_percent: number;
  memory_mb: number;
}

export interface SystemStats {
  cpu_percent: number;
  cpu_temp_c?: number | null;
  ram_used_mb: number;
  ram_total_mb: number;
  ram_percent: number;
  uptime_hours: number;
  hostname?: string;
  os_name?: string;
  disks?: DiskInfo[];
  interfaces?: string[];
  top_processes?: ProcessInfo[];
}
