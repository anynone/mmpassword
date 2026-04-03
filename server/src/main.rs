mod config;
mod crypto;
mod db;
mod error;
mod handlers;
mod middleware;
mod models;
mod static_files;

use std::sync::{Arc, Mutex};

use axum::Router;
use rusqlite::Connection;
use tower_http::cors::CorsLayer;
use tracing_subscriber::EnvFilter;

use crate::config::Config;

/// Shared application state
pub struct AppState {
    pub conn: Mutex<Connection>,
    pub config: Config,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env()
                .add_directive("info".parse().unwrap()),
        )
        .init();

    let config = Config::load();
    let conn = db::init(&config.database_path).expect("Failed to initialize database");

    let state = Arc::new(AppState {
        conn: Mutex::new(conn),
        config,
    });

    let addr = format!("{}:{}", state.config.host, state.config.port);
    tracing::info!("Server listening on {}", addr);

    let app = create_app(state);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_app(state: Arc<AppState>) -> Router {
    let admin_routes = Router::new()
        // Entries
        .route("/api/admin/entries", axum::routing::post(handlers::admin_entry::create_entry))
        .route("/api/admin/entries", axum::routing::get(handlers::admin_entry::list_entries))
        .route("/api/admin/entries/:id", axum::routing::get(handlers::admin_entry::get_entry))
        .route("/api/admin/entries/:id", axum::routing::put(handlers::admin_entry::update_entry))
        .route("/api/admin/entries/:id", axum::routing::delete(handlers::admin_entry::delete_entry))
        // Groups
        .route("/api/admin/groups", axum::routing::post(handlers::admin_group::create_group))
        .route("/api/admin/groups", axum::routing::get(handlers::admin_group::list_groups))
        .route("/api/admin/groups/:id", axum::routing::put(handlers::admin_group::update_group))
        .route("/api/admin/groups/:id", axum::routing::delete(handlers::admin_group::delete_group))
        // Subscriptions
        .route("/api/admin/subscriptions", axum::routing::post(handlers::admin_subscription::create_subscription))
        .route("/api/admin/subscriptions", axum::routing::get(handlers::admin_subscription::list_subscriptions))
        .route("/api/admin/subscriptions/:token", axum::routing::get(handlers::admin_subscription::get_subscription))
        .route("/api/admin/subscriptions/:token", axum::routing::put(handlers::admin_subscription::update_subscription))
        .route("/api/admin/subscriptions/:token", axum::routing::delete(handlers::admin_subscription::delete_subscription))
        .route("/api/admin/subscriptions/:token/refresh", axum::routing::post(handlers::admin_subscription::refresh_token))
        .route("/api/admin/subscriptions/:token/entries", axum::routing::put(handlers::admin_subscription::set_entries))
        .route("/api/admin/subscriptions/:token/entries", axum::routing::get(handlers::admin_subscription::get_entries))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::require_auth,
        ));

    let public_routes = Router::new()
        .route("/api/sub/:token", axum::routing::get(handlers::subscription::get_subscription));

    Router::new()
        .merge(admin_routes)
        .merge(public_routes)
        .fallback(static_files::static_handler)
        .layer(CorsLayer::permissive())
        .with_state(state)
}
