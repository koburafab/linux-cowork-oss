use std::process::{Command, Child};
use std::sync::Mutex;

static BACKEND: Mutex<Option<Child>> = Mutex::new(None);

fn find_server_script() -> Option<String> {
    let candidates = [
        // Development: relative to project
        "src/backend/server.ts".to_string(),
        // Installed via .deb: check common locations
        format!("{}/Documents/linux-cowork-oss/app/src/backend/server.ts",
            std::env::var("HOME").unwrap_or_default()),
        // Fallback: /opt
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Find and spawn the Bun backend sidecar
            if let Some(script_path) = find_server_script() {
                let bun_path = find_bun();
                log::info!("Starting backend: {} run {}", bun_path, script_path);
                let child = Command::new(&bun_path)
                    .arg("run")
                    .arg(&script_path)
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn()
                    .or_else(|_| {
                        Command::new("node")
                            .arg("--loader")
                            .arg("tsx")
                            .arg(&script_path)
                            .stdout(std::process::Stdio::piped())
                            .stderr(std::process::Stdio::piped())
                            .spawn()
                    });

                match child {
                    Ok(c) => {
                        log::info!("Backend sidecar started (PID: {})", c.id());
                        *BACKEND.lock().unwrap() = Some(c);
                    }
                    Err(e) => {
                        log::error!("Failed to start backend sidecar: {}", e);
                    }
                }
            } else {
                log::warn!("Backend server.ts not found — start it manually: bun run src/backend/server.ts");
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
