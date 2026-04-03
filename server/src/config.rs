use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub base_url: Option<String>,
    pub database_path: PathBuf,
    pub shared_password: String,
    pub admin_token: String,
}

impl Config {
    pub fn load() -> Self {
        let config_path = std::env::args()
            .skip(1)
            .find(|a| a.ends_with(".toml"))
            .unwrap_or_else(|| "config.toml".to_string());

        let file_config = if std::path::Path::new(&config_path).exists() {
            let content = std::fs::read_to_string(&config_path).unwrap_or_default();
            toml::from_str::<FileConfig>(&content).unwrap_or_default()
        } else {
            FileConfig::default()
        };

        let host = std::env::var("MMP_HOST")
            .unwrap_or_else(|_| file_config.server.host.clone());

        let port: u16 = std::env::var("MMP_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(file_config.server.port);

        let database_path = std::env::var("MMP_DATABASE_PATH")
            .map(PathBuf::from)
            .unwrap_or(file_config.database.path.clone());

        let shared_password = std::env::var("MMP_SUBSCRIPTION_PASSWORD")
            .or_else(|_| std::env::var("MMP_SHARED_PASSWORD"))
            .unwrap_or_else(|_| {
                file_config
                    .security
                    .shared_password
                    .clone()
                    .unwrap_or_else(|| {
                        "mmpassword-subscription-shared-key-2024".to_string()
                    })
            });

        let admin_token = std::env::var("MMP_ADMIN_TOKEN")
            .unwrap_or_else(|_| {
                file_config
                    .security
                    .admin_token
                    .clone()
                    .unwrap_or_else(|| "admin-api-secret-token".to_string())
            });

        let base_url = std::env::var("MMP_BASE_URL")
            .ok()
            .or_else(|| file_config.server.base_url.clone());

        tracing::info!("Config loaded: host={}, port={}", host, port);

        Self {
            host,
            port,
            base_url,
            database_path,
            shared_password,
            admin_token,
        }
    }

    /// Get the base URL for generating subscription URLs.
    /// Returns configured base_url if set, otherwise falls back to http://{host}:{port}.
    pub fn get_base_url(&self) -> String {
        match &self.base_url {
            Some(url) => url.trim_end_matches('/').to_string(),
            None => format!("http://{}:{}", self.host, self.port),
        }
    }
}

#[derive(Debug, serde::Deserialize)]
struct FileConfig {
    #[serde(default)]
    server: ServerConfig,
    #[serde(default)]
    security: SecurityConfig,
    #[serde(default)]
    database: DatabaseConfig,
}

impl Default for FileConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig::default(),
            security: SecurityConfig::default(),
            database: DatabaseConfig::default(),
        }
    }
}

#[derive(Debug, serde::Deserialize)]
struct ServerConfig {
    #[serde(default = "default_host")]
    host: String,
    #[serde(default = "default_port")]
    port: u16,
    base_url: Option<String>,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            base_url: None,
        }
    }
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    3000
}

#[derive(Debug, serde::Deserialize, Default)]
struct SecurityConfig {
    shared_password: Option<String>,
    admin_token: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct DatabaseConfig {
    #[serde(default = "default_db_path")]
    path: PathBuf,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            path: default_db_path(),
        }
    }
}

fn default_db_path() -> PathBuf {
    PathBuf::from("./data/subscriptions.db")
}
