use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretsConfig {
    pub admin_hash: String,
    pub root_hash: String,
    pub admin_session_token: String,
}

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

pub fn generate_token() -> String {
    let bytes: [u8; 24] = rand::thread_rng().gen();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn load_or_create_secrets(path: &str) -> SecretsConfig {
    if Path::new(path).exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(sec) = serde_json::from_str::<SecretsConfig>(&content) {
                return sec;
            }
        }
    }
    let default_sec = SecretsConfig {
        admin_hash: hash_password("admin123").unwrap_or_default(),
        root_hash: hash_password("root123").unwrap_or_default(),
        admin_session_token: generate_token(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&default_sec) {
        let _ = fs::write(path, json);
    }
    default_sec
}
