use std::process::{Command, Child};
use std::sync::Mutex;

static BACKEND: Mutex<Option<Child>> = Mutex::new(None);

fn find_server_script() -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        // Development: when binary runs from src-tauri/
        "../src/backend/server.ts".to_string(),
        // Development: when binary runs from app/
        "src/backend/server.ts".to_string(),
        // Installed locations
        format!("{}/linux-cowork-oss/app/src/backend/server.ts", home),
        format!("{}/Documents/linux-cowork-oss/app/src/backend/server.ts", home),
        "/opt/linux-cowork/server.ts".to_string(),
    ];

    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.clone());
        }
    }
    None
}

fn find_bun() -> String {
    // Check common bun locations — desktop launchers often miss ~/.bun/bin in PATH
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        format!("{}/.bun/bin/bun", home),
        "/usr/local/bin/bun".to_string(),
        "/usr/bin/bun".to_string(),
        "bun".to_string(), // fallback to PATH
    ];

    for path in &candidates {
        if path == "bun" || std::path::Path::new(path).exists() {
            return path.clone();
        }
    }
    "bun".to_string()
}

/// Locate the standalone compiled backend binary embedded in the package.
/// Returns None in dev (then we fall back to `bun run server.ts`).
fn find_backend_binary() -> Option<String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let cand = dir.join("cowork-backend");
            if cand.exists() {
                return Some(cand.to_string_lossy().into_owned());
            }
        }
    }
    for p in [
        "/usr/lib/linux-cowork/cowork-backend",
        "/usr/bin/cowork-backend",
    ] {
        if std::path::Path::new(p).exists() {
            return Some(p.to_string());
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Intel/Wayland + WebKitGTK renders a black screen with the DMABUF renderer.
    // Disabling DMABUF fixes the black screen at startup; disabling accelerated
    // compositing additionally prevents the webview from going black when a
    // screen capture triggers a compositor redraw (Intel UHD 630 + Wayland).
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri::Builder::default()
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            // Start the backend. Prefer the embedded standalone binary (so the app
            // is self-contained on any machine); fall back to `bun run server.ts` in dev.
            let home = std::env::var("HOME").unwrap_or_default();
            // Desktop launchers strip ~/.local/bin and ~/.bun/bin from PATH; re-add them
            // so the backend can spawn the claude/codex CLIs.
            let path_env = format!(
                "{}/.local/bin:{}/.bun/bin:{}",
                home,
                home,
                std::env::var("PATH").unwrap_or_default()
            );

            let child = if let Some(backend_bin) = find_backend_binary() {
                log::info!("Starting embedded backend: {}", backend_bin);
                Command::new(&backend_bin)
                    .env("PATH", &path_env)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .spawn()
            } else if let Some(script_path) = find_server_script() {
                let bun_path = find_bun();
                let work_dir = std::path::Path::new(&script_path)
                    .ancestors()
                    .nth(3)
                    .map(|p| p.to_path_buf());
                log::info!("Starting dev backend: {} run {} (cwd={:?})", bun_path, script_path, work_dir);
                let mut cmd = Command::new(&bun_path);
                cmd.arg("run")
                    .arg(&script_path)
                    .env("PATH", &path_env)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null());
                if let Some(ref dir) = work_dir {
                    cmd.current_dir(dir);
                }
                cmd.spawn()
            } else {
                log::warn!("No backend found (neither embedded binary nor server.ts)");
                Err(std::io::Error::new(std::io::ErrorKind::NotFound, "no backend"))
            };

            match child {
                Ok(c) => {
                    log::info!("Backend started (PID: {})", c.id());
                    *BACKEND.lock().unwrap() = Some(c);
                }
                Err(e) => {
                    log::error!("Failed to start backend: {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = BACKEND.lock() {
                    if let Some(ref mut child) = *guard {
                        log::info!("Killing backend sidecar");
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
