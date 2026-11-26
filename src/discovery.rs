use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::process::Command;
use std::time::Duration;
use sysinfo::{Disks, Networks, System};

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub mount: String,
    pub used_gb: f64,
    pub total_gb: f64,
}

#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub ram_used_mb: u64,
    pub ram_total_mb: u64,
    pub ram_percent: f32,
    pub uptime_hours: u64,
    pub hostname: String,
    pub os_name: String,
    pub disks: Vec<DiskInfo>,
    pub interfaces: Vec<String>,
}

pub fn gather_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();
    let cpu_percent = sys.global_cpu_usage();
    let ram_used_mb = sys.used_memory() / (1024 * 1024);
    let ram_total_mb = (sys.total_memory() / (1024 * 1024)).max(1);
    let ram_percent = (ram_used_mb as f32 / ram_total_mb as f32) * 100.0;
    let uptime_hours = System::uptime() / 3600;
    let hostname = System::host_name().unwrap_or_else(|| "Server".to_string());
    let os_name = System::name().unwrap_or_else(|| "Linux".to_string());

    let disks = Disks::new_with_refreshed_list()
        .iter()
        .map(|d| DiskInfo {
            mount: d.mount_point().to_string_lossy().to_string(),
            used_gb: ((d.total_space() - d.available_space()) as f64) / 1_073_741_824.0,
            total_gb: (d.total_space() as f64) / 1_073_741_824.0,
        })
        .collect();

    let interfaces = Networks::new_with_refreshed_list()
        .iter()
        .map(|(name, _)| name.clone())
        .collect();

    SystemStats {
        cpu_percent,
        ram_used_mb,
        ram_total_mb,
        ram_percent,
        uptime_hours,
        hostname,
        os_name,
        disks,
        interfaces,
    }
}

#[derive(Debug, Deserialize)]
struct MastermindAppItem {
    name: String,
    slug: Option<String>,
    port: u16,
    icon: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub version: String,
    pub active_port: u16,
    pub lan_ip: Option<String>,
    pub tailscale_ip: Option<String>,
    pub tailscale_dns: Option<String>,
    pub detected_web_servers: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DiscoveredApp {
    pub name: String,
    pub slug: String,
    pub port: u16,
    pub target_url: String,
    pub icon: String,
    pub source: String,
}

pub fn gather_system_info(active_port: u16, version: &str) -> SystemInfo {
    let lan_ip = local_ip_address::local_ip().ok().map(|ip| ip.to_string());
    let (tailscale_ip, tailscale_dns) = detect_tailscale();
    let detected_web_servers = detect_web_servers();

    SystemInfo {
        version: version.to_string(),
        active_port,
        lan_ip,
        tailscale_ip,
        tailscale_dns,
        detected_web_servers,
    }
}

fn detect_tailscale() -> (Option<String>, Option<String>) {
    let ip = Command::new("tailscale")
        .args(["ip", "-4"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.lines().next().unwrap_or("").trim().to_string())
                    .filter(|s| !s.is_empty())
            } else {
                None
            }
        });

    let dns = Command::new("tailscale")
        .args(["status", "--json"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                serde_json::from_slice::<serde_json::Value>(&o.stdout)
                    .ok()
                    .and_then(|v| {
                        v.get("Self")
                            .and_then(|s| s.get("DNSName"))
                            .and_then(|d| d.as_str())
                            .map(|s| s.trim_end_matches('.').to_string())
                    })
            } else {
                None
            }
        });

    (ip, dns)
}

fn detect_web_servers() -> Vec<String> {
    let candidates = ["apache2", "httpd", "nginx", "caddy"];
    let mut found = Vec::new();
    for bin in candidates {
        let ok = Command::new(bin)
            .arg("-v")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if ok {
            found.push(bin.to_string());
        }
    }
    found
}

pub async fn discover_all_apps(
    client: &Client,
    mastermind_api_url: &str,
    active_port: u16,
) -> Vec<DiscoveredApp> {
    let mut apps = Vec::new();

    if let Ok(resp) = client
        .get(mastermind_api_url)
        .timeout(Duration::from_millis(800))
        .send()
        .await
    {
        if let Ok(items) = resp.json::<Vec<MastermindAppItem>>().await {
            for item in items {
                let slug = item
                    .slug
                    .unwrap_or_else(|| item.name.to_lowercase().replace(' ', "-"));
                apps.push(DiscoveredApp {
                    name: item.name,
                    slug,
                    port: item.port,
                    target_url: format!("http://127.0.0.1:{}", item.port),
                    icon: item.icon.unwrap_or_else(|| "brain".to_string()),
                    source: "Mastermind API".to_string(),
                });
            }
        }
    }

    let local = discover_local_apps(active_port);
    for l in local {
        if !apps.iter().any(|a| a.port == l.port) {
            apps.push(l);
        }
    }
    apps
}

pub fn discover_local_apps(active_port: u16) -> Vec<DiscoveredApp> {
    let known_ports: Vec<(u16, &str, &str, &str)> = vec![
        (3000, "Mastermind / Grafana", "mastermind", "brain"),
        (3001, "AdGuard Home", "adguard", "shield"),
        (5000, "Mastermind API / Flask", "mastermind-api", "cpu"),
        (8000, "Mastermind / Portainer Agent", "mastermind-8000", "terminal"),
        (8080, "Mastermind / Web Service", "app-8080", "globe"),
        (8096, "Jellyfin", "jellyfin", "film"),
        (8123, "Home Assistant", "homeassistant", "home"),
        (9000, "Portainer", "portainer", "box"),
        (9090, "Cockpit / Prometheus", "cockpit", "activity"),
    ];

    let mut apps = Vec::new();
    for (port, name, slug, icon) in known_ports {
        if port == active_port {
            continue;
        }
        let addr = format!("127.0.0.1:{}", port);
        if let Ok(sock) = addr.parse() {
            if TcpStream::connect_timeout(&sock, Duration::from_millis(80)).is_ok() {
                apps.push(DiscoveredApp {
                    name: name.to_string(),
                    slug: slug.to_string(),
                    port,
                    target_url: format!("http://127.0.0.1:{}", port),
                    icon: icon.to_string(),
                    source: "Local Port Scan".to_string(),
                });
            }
        }
    }
    apps
}
