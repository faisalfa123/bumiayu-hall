use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub title: String,
    pub accent_color: String,
    pub tiles: Vec<TileItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileItem {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub target_url: String,
    pub icon: String,
    pub color: String,
    pub size: TileSize,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TileSize {
    Small,
    Medium,
    Wide,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            title: "Bumiayu Hall".to_string(),
            accent_color: "#0078D7".to_string(),
            tiles: vec![
                TileItem {
                    id: "mastermind-core".to_string(),
                    name: "Mastermind".to_string(),
                    slug: "mastermind".to_string(),
                    target_url: "http://127.0.0.1:3000".to_string(),
                    icon: "brain".to_string(),
                    color: "#0078D7".to_string(),
                    size: TileSize::Wide,
                    category: "Core".to_string(),
                },
                TileItem {
                    id: "portainer".to_string(),
                    name: "Portainer".to_string(),
                    slug: "portainer".to_string(),
                    target_url: "http://127.0.0.1:9000".to_string(),
                    icon: "box".to_string(),
                    color: "#107C10".to_string(),
                    size: TileSize::Medium,
                    category: "System".to_string(),
                },
                TileItem {
                    id: "adguard".to_string(),
                    name: "AdGuard Home".to_string(),
                    slug: "adguard".to_string(),
                    target_url: "http://127.0.0.1:3001".to_string(),
                    icon: "shield".to_string(),
                    color: "#68217A".to_string(),
                    size: TileSize::Small,
                    category: "Network".to_string(),
                },
                TileItem {
                    id: "jellyfin".to_string(),
                    name: "Jellyfin".to_string(),
                    slug: "jellyfin".to_string(),
                    target_url: "http://127.0.0.1:8096".to_string(),
                    icon: "film".to_string(),
                    color: "#D83B01".to_string(),
                    size: TileSize::Small,
                    category: "Media".to_string(),
                },
            ],
        }
    }
}

pub fn load_or_create_config(path: &str) -> AppConfig {
    if Path::new(path).exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(cfg) = serde_yaml::from_str::<AppConfig>(&content) {
                return cfg;
            }
        }
    }
    let default_cfg = AppConfig::default();
    if let Ok(yaml) = serde_yaml::to_string(&default_cfg) {
        let _ = fs::write(path, yaml);
    }
    default_cfg
}

pub fn save_config(path: &str, cfg: &AppConfig) -> Result<(), String> {
    let yaml = serde_yaml::to_string(cfg).map_err(|e| e.to_string())?;
    fs::write(path, yaml).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_roundtrip() {
        let cfg = AppConfig::default();
        let yaml = serde_yaml::to_string(&cfg).expect("serialize");
        let parsed: AppConfig = serde_yaml::from_str(&yaml).expect("deserialize");
        assert_eq!(parsed.title, "Bumiayu Hall");
        assert!(!parsed.tiles.is_empty());
    }
}
