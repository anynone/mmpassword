use axum::{
    http::{header, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "web/dist/"]
struct Assets;

pub async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    // Try exact path first
    if let Some(file) = Assets::get(path) {
        let mime = mime_guess_from_path(path);
        return (
            StatusCode::OK,
            [(header::CONTENT_TYPE, mime)],
            file.data.to_vec(),
        )
            .into_response();
    }

    // SPA fallback: serve index.html
    match Assets::get("index.html") {
        Some(file) => Html(String::from_utf8_lossy(&file.data).to_string()).into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

fn mime_guess_from_path(path: &str) -> String {
    if path.ends_with(".js") {
        "application/javascript".to_string()
    } else if path.ends_with(".css") {
        "text/css".to_string()
    } else if path.ends_with(".html") {
        "text/html".to_string()
    } else if path.ends_with(".json") {
        "application/json".to_string()
    } else if path.ends_with(".svg") {
        "image/svg+xml".to_string()
    } else if path.ends_with(".png") {
        "image/png".to_string()
    } else if path.ends_with(".ico") {
        "image/x-icon".to_string()
    } else if path.ends_with(".woff2") {
        "font/woff2".to_string()
    } else if path.ends_with(".woff") {
        "font/woff".to_string()
    } else {
        "application/octet-stream".to_string()
    }
}
