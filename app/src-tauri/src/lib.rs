use std::process::{Command, Child};
use std::sync::Mutex;

static BACKEND: Mutex<Option<Child>> = Mutex::new(None);

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

      // Spawn the Bun backend sidecar
      let app_dir = std::env::current_dir().unwrap_or_default();
      let server_path = app_dir.join("src").join("backend").join("server.ts");

      // Try bun first, fallback to node
      let child = Command::new("bun")
        .arg("run")
        .arg(&server_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .or_else(|_| {
          Command::new("node")
            .arg("--loader")
            .arg("tsx")
            .arg(&server_path)
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

      Ok(())
    })
    .on_window_event(|_window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        // Kill the backend when the window closes
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
