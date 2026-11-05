use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitCommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u128,
    pub command: String,
}

pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
pub fn run_git_command(
    repo_path: String,
    args: Vec<String>,
    stdin: Option<String>,
) -> Result<GitCommandResult, String> {
    let start = Instant::now();
    let cwd = if repo_path.trim().is_empty() {
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    } else {
        PathBuf::from(&repo_path)
    };

    let mut cmd = Command::new("git");
    cmd.current_dir(&cwd).args(&args);

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let command_str = format!("git {}", args.join(" "));

    if let Some(input_data) = stdin {
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| e.to_string())?;
        if let Some(mut child_stdin) = child.stdin.take() {
            let _ = child_stdin.write_all(input_data.as_bytes());
        }
        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        let duration_ms = start.elapsed().as_millis();
        return Ok(GitCommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(1),
            duration_ms,
            command: command_str,
        });
    }

    let output = cmd.output().map_err(|e| e.to_string())?;
    let duration_ms = start.elapsed().as_millis();

    Ok(GitCommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(1),
        duration_ms,
        command: command_str,
    })
}

#[tauri::command]
pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Open Git Repository")
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_conflict_file(repo_path: String, file_path: String) -> Result<String, String> {
    let full = PathBuf::from(repo_path).join(file_path);
    fs::read_to_string(full).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_conflict_file(
    repo_path: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let full = PathBuf::from(repo_path).join(file_path);
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_in_external_editor(
    repo_path: String,
    file_path: Option<String>,
    editor: String,
) -> Result<(), String> {
    let target = match file_path {
        Some(f) => PathBuf::from(&repo_path).join(f),
        None => PathBuf::from(&repo_path),
    };
    let bin = if editor == "cursor" { "cursor" } else { "code" };
    let mut cmd = Command::new(bin);
    cmd.arg(target);
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn watch_repository(
    app: AppHandle,
    state: State<'_, WatcherState>,
    repo_path: String,
) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None;

    let path = PathBuf::from(&repo_path);
    if !path.exists() {
        return Err("Repository path does not exist".into());
    }

    let app_clone = app.clone();
    let repo_clone = repo_path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(_event) = res {
                let _ = app_clone.emit("repo-fs-changed", repo_clone.clone());
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *guard = Some(watcher);
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState {
            watcher: Mutex::new(None),
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                    let _ = apply_vibrancy(
                        &window,
                        NSVisualEffectMaterial::UnderWindowBackground,
                        None,
                        None,
                    );
                }
                #[cfg(target_os = "windows")]
                {
                    use window_vibrancy::{apply_acrylic, apply_mica};
                    if apply_mica(&window, Some(true)).is_err() {
                        let _ = apply_acrylic(&window, Some((18, 20, 28, 195)));
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_git_command,
            pick_folder,
            read_conflict_file,
            write_conflict_file,
            open_in_external_editor,
            watch_repository
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
