//! Application update check against GitHub Releases.
//!
//! Implements a soft update reminder: the frontend calls
//! `check_latest_version` once on startup and, if a newer release exists,
//! shows a dismissible banner linking to the release page. All network
//! failures surface as plain errors that the frontend silently ignores.

use serde::Serialize;

const RELEASES_API: &str = "https://api.github.com/repos/anynone/mmpassword/releases/latest";
const RELEASES_PAGE: &str = "https://github.com/anynone/mmpassword/releases/latest";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_url: String,
}

#[tauri::command]
pub async fn check_latest_version() -> Result<UpdateCheckResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .user_agent(concat!(
            "mmpassword/",
            env!("CARGO_PKG_VERSION"),
            " (update check)"
        ))
        .build()
        .map_err(|e| e.to_string())?;

    let response: serde_json::Value = client
        .get(RELEASES_API)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let tag = response["tag_name"]
        .as_str()
        .unwrap_or_default()
        .trim_start_matches('v')
        .to_string();
    if tag.is_empty() {
        return Err("Malformed release response".into());
    }

    let current = env!("CARGO_PKG_VERSION").to_string();
    let release_url = response["html_url"]
        .as_str()
        .filter(|u| u.starts_with(RELEASES_PAGE))
        .unwrap_or(RELEASES_PAGE)
        .to_string();

    Ok(UpdateCheckResult {
        has_update: is_newer(&tag, &current),
        current_version: current,
        latest_version: tag,
        release_url,
    })
}

/// Open the release page in the system browser. Only URLs inside the
/// project's own GitHub space are accepted.
#[tauri::command]
pub async fn open_release_page(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/anynone/mmpassword/") {
        return Err("Unsupported URL".into());
    }
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Compare dotted numeric versions (x.y.z); non-numeric parts count as 0.
fn is_newer(latest: &str, current: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> {
        s.split('.')
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect()
    };
    parse(latest) > parse(current)
}

#[cfg(test)]
mod tests {
    use super::is_newer;

    #[test]
    fn compares_versions() {
        assert!(is_newer("0.1.21", "0.1.20"));
        assert!(is_newer("0.2.0", "0.1.99"));
        assert!(is_newer("1.0.0", "0.9.9"));
        assert!(!is_newer("0.1.20", "0.1.20"));
        assert!(!is_newer("0.1.19", "0.1.20"));
    }
}
