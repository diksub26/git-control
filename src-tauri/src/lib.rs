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
async fn run_git_command(
    repo_path: String,
    args: Vec<String>,
    stdin: Option<String>,
) -> Result<GitCommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn pick_folder() -> Option<String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Open Git Repository")
            .pick_folder()
            .map(|p| p.to_string_lossy().to_string())
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
async fn read_conflict_file(repo_path: String, file_path: String) -> Result<String, String> {
    let full = PathBuf::from(repo_path).join(file_path);
    fs::read_to_string(full).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_conflict_file(
    repo_path: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let full = PathBuf::from(repo_path).join(file_path);
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn resolve_git_credential_token(repo_path: String, host: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_host = host
            .trim()
            .trim_start_matches("https://")
            .trim_start_matches("http://")
            .split('/')
            .next()
            .unwrap_or("github.com")
            .to_string();

        // 1. Try GitHub CLI (`gh auth token`) if host is GitHub
        if clean_host.contains("github") {
            let mut gh_cmd = Command::new("gh");
            gh_cmd.args(["auth", "token", "--hostname", &clean_host]);
            #[cfg(target_os = "windows")]
            {
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                gh_cmd.creation_flags(CREATE_NO_WINDOW);
            }
            if let Ok(output) = gh_cmd.output() {
                if output.status.success() {
                    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !token.is_empty() {
                        return Some(token);
                    }
                }
            }
        }

        // 2. Try Git Credential Manager (`git -c credential.interactive=never credential fill`)
        let mut git_cmd = Command::new("git");
        if !repo_path.trim().is_empty() && PathBuf::from(&repo_path).exists() {
            git_cmd.current_dir(&repo_path);
        }
        git_cmd
            .args(["-c", "credential.interactive=never", "credential", "fill"])
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GCM_INTERACTIVE", "never")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            git_cmd.creation_flags(CREATE_NO_WINDOW);
        }

        if let Ok(mut child) = git_cmd.spawn() {
            if let Some(mut stdin_pipe) = child.stdin.take() {
                let query = format!("protocol=https\nhost={}\n\n", clean_host);
                let _ = stdin_pipe.write_all(query.as_bytes());
            }
            if let Ok(output) = child.wait_with_output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    for line in stdout.lines() {
                        if let Some(pw) = line.strip_prefix("password=") {
                            let trimmed = pw.trim();
                            if !trimmed.is_empty() {
                                return Some(trimmed.to_string());
                            }
                        }
                    }
                }
            }
        }

        None
    })
    .await
    .ok()
    .flatten()
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DetectedIde {
    pub id: String,
    pub name: String,
    pub category: String,   // "ide" | "ai-harness"
    pub launch_mode: String, // "gui" | "terminal-cli"
    pub command: String,
    pub executable_path: String,
    pub installed: bool,
}

fn find_ide_executable(id: &str, cli_cmd: &str, win_rel_paths: &[&str], mac_app: &str) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let _ = mac_app;
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let program_files = std::env::var("ProgramFiles").unwrap_or_default();
        let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_default();
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();

        for rel in win_rel_paths {
            for base in [&local_app_data, &program_files, &program_files_x86, &user_profile] {
                if base.is_empty() {
                    continue;
                }
                let candidate = PathBuf::from(base).join(rel);
                if candidate.exists() {
                    return Some(candidate.to_string_lossy().to_string());
                }
            }
        }

        let cli_bin = cli_cmd.split_whitespace().next().unwrap_or("");
        if !cli_bin.is_empty() {
            let mut where_cmd = Command::new("where");
            where_cmd.arg(cli_bin);
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            where_cmd.creation_flags(CREATE_NO_WINDOW);
            if let Ok(output) = where_cmd.output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(first_line) = stdout.lines().next() {
                        let trimmed = first_line.trim();
                        if !trimmed.is_empty() {
                            return Some(trimmed.to_string());
                        }
                    }
                }
            }
        }

        if id == "explorer" {
            return Some("explorer.exe".to_string());
        }
        None
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = win_rel_paths;
        if !mac_app.is_empty() {
            let app_path = PathBuf::from(format!("/Applications/{}", mac_app));
            if app_path.exists() {
                return Some(app_path.to_string_lossy().to_string());
            }
        }
        let cli_bin = cli_cmd.split_whitespace().next().unwrap_or("");
        if !cli_bin.is_empty() {
            if let Ok(output) = Command::new("which").arg(cli_bin).output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !stdout.is_empty() {
                        return Some(stdout);
                    }
                }
            }
        }
        if id == "explorer" {
            return Some("open".to_string());
        }
        None
    }
}

#[tauri::command]
async fn detect_installed_ides() -> Vec<DetectedIde> {
    tauri::async_runtime::spawn_blocking(|| {
        let specs: Vec<(&str, &str, &str, &str, &str, &[&str], &str)> = vec![
            // Standard IDEs & Editors
            (
                "vscode",
                "Visual Studio Code",
                "ide",
                "gui",
                "code",
                &[
                    "Programs\\Microsoft VS Code\\Code.exe",
                    "Microsoft VS Code\\Code.exe",
                ],
                "Visual Studio Code.app",
            ),
            (
                "cursor-ide",
                "Cursor (Classic Code IDE)",
                "ide",
                "gui",
                "cursor --classic",
                &[
                    "Programs\\cursor\\Cursor.exe",
                    "cursor\\Cursor.exe",
                ],
                "Cursor.app",
            ),
            (
                "zed",
                "Zed",
                "ide",
                "gui",
                "zed",
                &[
                    "Programs\\Zed\\Zed.exe",
                    "Zed\\Zed.exe",
                ],
                "Zed.app",
            ),
            (
                "sublime",
                "Sublime Text",
                "ide",
                "gui",
                "subl",
                &[
                    "Sublime Text\\subl.exe",
                    "Sublime Text\\sublime_text.exe",
                ],
                "Sublime Text.app",
            ),
            (
                "webstorm",
                "JetBrains WebStorm",
                "ide",
                "gui",
                "webstorm",
                &[
                    "Programs\\WebStorm\\bin\\webstorm64.exe",
                    "JetBrains\\WebStorm\\bin\\webstorm64.exe",
                ],
                "WebStorm.app",
            ),
            (
                "intellij",
                "IntelliJ IDEA",
                "ide",
                "gui",
                "idea",
                &[
                    "Programs\\IntelliJ IDEA Ultimate\\bin\\idea64.exe",
                    "Programs\\IntelliJ IDEA Community Edition\\bin\\idea64.exe",
                ],
                "IntelliJ IDEA.app",
            ),
            (
                "explorer",
                "System File Explorer",
                "ide",
                "gui",
                "explorer",
                &[],
                "",
            ),
            // AI Harnesses (Agentic GUI & Terminal CLI Harnesses)
            (
                "antigravity",
                "Antigravity (AI Harness)",
                "ai-harness",
                "gui",
                "agy",
                &[
                    "Programs\\Antigravity\\Antigravity.exe",
                    "Antigravity\\Antigravity.exe",
                ],
                "Antigravity.app",
            ),
            (
                "cursor",
                "Cursor Agents Window",
                "ai-harness",
                "gui",
                "cursor --glass",
                &[
                    "Programs\\cursor\\Cursor.exe",
                    "cursor\\Cursor.exe",
                ],
                "Cursor.app",
            ),
            (
                "cursor-agent-cli",
                "Cursor Agent CLI",
                "ai-harness",
                "terminal-cli",
                "cursor agent",
                &[
                    "Programs\\cursor\\Cursor.exe",
                    "cursor\\Cursor.exe",
                ],
                "Cursor.app",
            ),
            (
                "windsurf",
                "Windsurf (AI IDE)",
                "ai-harness",
                "gui",
                "windsurf",
                &[
                    "Programs\\Windsurf\\Windsurf.exe",
                    "Windsurf\\Windsurf.exe",
                ],
                "Windsurf.app",
            ),
            (
                "claude-code",
                "Claude Code CLI",
                "ai-harness",
                "terminal-cli",
                "claude",
                &[
                    "Programs\\claude\\claude.exe",
                    "AnthropicClaude\\claude.exe",
                ],
                "",
            ),
            (
                "codex",
                "OpenAI Codex CLI",
                "ai-harness",
                "terminal-cli",
                "codex",
                &[],
                "",
            ),
            (
                "gemini-cli",
                "Gemini CLI",
                "ai-harness",
                "terminal-cli",
                "gemini",
                &[],
                "",
            ),
            (
                "opencode",
                "OpenCode CLI",
                "ai-harness",
                "terminal-cli",
                "opencode",
                &[],
                "",
            ),
            (
                "aider",
                "Aider AI Pair Programmer",
                "ai-harness",
                "terminal-cli",
                "aider",
                &[],
                "",
            ),
            (
                "goose",
                "Goose AI Agent CLI",
                "ai-harness",
                "terminal-cli",
                "goose",
                &[],
                "",
            ),
        ];

        specs
            .into_iter()
            .map(|(id, name, category, launch_mode, cli, win_paths, mac_app)| {
                let found = find_ide_executable(id, cli, win_paths, mac_app);
                let display_exec = if launch_mode == "terminal-cli" {
                    cli.to_string()
                } else {
                    found.clone().unwrap_or_default()
                };
                DetectedIde {
                    id: id.to_string(),
                    name: name.to_string(),
                    category: category.to_string(),
                    launch_mode: launch_mode.to_string(),
                    command: cli.to_string(),
                    executable_path: display_exec,
                    installed: found.is_some(),
                }
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
async fn pick_executable() -> Option<String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select IDE or Editor Executable")
            .pick_file()
            .map(|p| p.to_string_lossy().to_string())
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
async fn open_in_external_editor(
    repo_path: String,
    file_path: Option<String>,
    editor: String,
    custom_executable: Option<String>,
    launch_mode: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target = match file_path {
            Some(ref f) if !f.trim().is_empty() => PathBuf::from(&repo_path).join(f),
            _ => PathBuf::from(&repo_path),
        };
        let target_str = target.to_string_lossy().to_string();

        let is_terminal_cli = launch_mode.as_deref() == Some("terminal-cli")
            || matches!(
                editor.as_str(),
                "claude-code"
                    | "cursor-agent-cli"
                    | "codex"
                    | "gemini-cli"
                    | "opencode"
                    | "aider"
                    | "goose"
            );

        // If launching a Terminal CLI AI Harness (e.g. Claude Code, Cursor Agent CLI, Codex, Gemini CLI, OpenCode, Aider)
        if is_terminal_cli {
            let cli_command = custom_executable
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty() && !s.to_lowercase().ends_with("cursor.exe"))
                .unwrap_or_else(|| match editor.as_str() {
                    "claude-code" => "claude".to_string(),
                    "cursor-agent-cli" => "cursor agent".to_string(),
                    "codex" => "codex".to_string(),
                    "gemini-cli" => "gemini".to_string(),
                    "opencode" => "opencode".to_string(),
                    "aider" => "aider".to_string(),
                    "goose" => "goose".to_string(),
                    other => other.to_string(),
                });

            #[cfg(target_os = "windows")]
            {
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                // Check if Windows Terminal (wt.exe) is available
                let mut wt_check = Command::new("where");
                wt_check.arg("wt.exe");
                wt_check.creation_flags(CREATE_NO_WINDOW);
                let has_wt = wt_check
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);

                if has_wt {
                    let mut wt_cmd = Command::new("wt.exe");
                    wt_cmd.args(["-d", &repo_path, "cmd", "/k", &cli_command]);
                    wt_cmd
                        .spawn()
                        .map_err(|e| format!("Failed to open Windows Terminal for AI Harness '{}': {}", cli_command, e))?;
                    return Ok(());
                }

                // Fallback: open interactive cmd.exe window in the repository directory running the AI Harness CLI
                let mut cmd = Command::new("cmd");
                cmd.current_dir(&repo_path);
                cmd.args(["/C", "start", "AI Harness", "/D", &repo_path, "cmd", "/K", &cli_command]);
                cmd.creation_flags(CREATE_NO_WINDOW);
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch AI Harness '{}': {}", cli_command, e))?;
                return Ok(());
            }

            #[cfg(not(target_os = "windows"))]
            {
                let script = format!(
                    "tell application \"Terminal\" to do script \"cd '{}' && {}\"",
                    repo_path.replace('\'', "'\\''"),
                    cli_command.replace('"', "\\\"")
                );
                Command::new("osascript")
                    .args(["-e", &script, "-e", "tell application \"Terminal\" to activate"])
                    .spawn()
                    .map_err(|e| format!("Failed to launch Terminal for AI Harness '{}': {}", cli_command, e))?;
                return Ok(());
            }
        }

        // 1. Resolve custom executable if provided, otherwise auto-resolve by IDE id
        let resolved_bin = if let Some(custom) = custom_executable {
            let trimmed = custom.trim().to_string();
            if !trimmed.is_empty() {
                Some(trimmed)
            } else {
                None
            }
        } else {
            None
        }
        .or_else(|| match editor.as_str() {
            "vscode" => find_ide_executable(
                "vscode",
                "code",
                &[
                    "Programs\\Microsoft VS Code\\Code.exe",
                    "Microsoft VS Code\\Code.exe",
                ],
                "Visual Studio Code.app",
            ),
            "cursor" | "cursor-ide" => find_ide_executable(
                "cursor",
                "cursor",
                &["Programs\\cursor\\Cursor.exe", "cursor\\Cursor.exe"],
                "Cursor.app",
            ),
            "antigravity" => find_ide_executable(
                "antigravity",
                "agy",
                &[
                    "Programs\\Antigravity\\Antigravity.exe",
                    "Antigravity\\Antigravity.exe",
                ],
                "Antigravity.app",
            ),
            "windsurf" => find_ide_executable(
                "windsurf",
                "windsurf",
                &["Programs\\Windsurf\\Windsurf.exe", "Windsurf\\Windsurf.exe"],
                "Windsurf.app",
            ),
            "zed" => find_ide_executable(
                "zed",
                "zed",
                &["Programs\\Zed\\Zed.exe", "Zed\\Zed.exe"],
                "Zed.app",
            ),
            "sublime" => find_ide_executable(
                "sublime",
                "subl",
                &[
                    "Sublime Text\\subl.exe",
                    "Sublime Text\\sublime_text.exe",
                ],
                "Sublime Text.app",
            ),
            "webstorm" => find_ide_executable(
                "webstorm",
                "webstorm",
                &[
                    "Programs\\WebStorm\\bin\\webstorm64.exe",
                    "JetBrains\\WebStorm\\bin\\webstorm64.exe",
                ],
                "WebStorm.app",
            ),
            "intellij" => find_ide_executable(
                "intellij",
                "idea",
                &[
                    "Programs\\IntelliJ IDEA Ultimate\\bin\\idea64.exe",
                    "Programs\\IntelliJ IDEA Community Edition\\bin\\idea64.exe",
                ],
                "IntelliJ IDEA.app",
            ),
            "explorer" => find_ide_executable("explorer", "explorer", &[], ""),
            other => Some(other.to_string()),
        })
        .unwrap_or_else(|| {
            match editor.as_str() {
                "cursor" | "cursor-ide" => "cursor".to_string(),
                "antigravity" => "agy".to_string(),
                "windsurf" => "windsurf".to_string(),
                "zed" => "zed".to_string(),
                "sublime" => "subl".to_string(),
                "webstorm" => "webstorm".to_string(),
                "intellij" => "idea".to_string(),
                "explorer" => "explorer".to_string(),
                _ => "code".to_string(),
            }
        });

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let lower = resolved_bin.to_lowercase();

            if editor == "explorer" || lower.ends_with("explorer.exe") {
                Command::new("explorer.exe")
                    .arg(&target_str)
                    .spawn()
                    .map_err(|e| format!("Failed to open File Explorer: {}", e))?;
                return Ok(());
            }

            let is_direct_exe = lower.ends_with(".exe") && PathBuf::from(&resolved_bin).exists();

            // Cursor Agents Window (`--glass`):
            // 1. Open/focus Cursor Agents Window (`--glass`) so `isLastActiveWindowGlass` is true
            // 2. Route repository folder (`target_str`) into the Agents Window composer
            if editor == "cursor" {
                if is_direct_exe {
                    let mut glass_cmd = Command::new(&resolved_bin);
                    glass_cmd.arg("--glass");
                    glass_cmd.creation_flags(CREATE_NO_WINDOW);
                    glass_cmd
                        .spawn()
                        .map_err(|e| format!("Failed to open Cursor Agents Window: {}", e))?;

                    let bin_clone = resolved_bin.clone();
                    let target_clone = target_str.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(550));
                        let mut route_cmd = Command::new(&bin_clone);
                        route_cmd.arg(&target_clone);
                        route_cmd.creation_flags(CREATE_NO_WINDOW);
                        let _ = route_cmd.spawn();
                    });
                    return Ok(());
                } else {
                    let mut glass_cmd = Command::new("cmd");
                    glass_cmd.args(["/C", &resolved_bin, "--glass"]);
                    glass_cmd.creation_flags(CREATE_NO_WINDOW);
                    glass_cmd
                        .spawn()
                        .map_err(|e| format!("Failed to open Cursor Agents Window: {}", e))?;

                    let bin_clone = resolved_bin.clone();
                    let target_clone = target_str.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(550));
                        let mut route_cmd = Command::new("cmd");
                        route_cmd.args(["/C", &bin_clone, &target_clone]);
                        route_cmd.creation_flags(CREATE_NO_WINDOW);
                        let _ = route_cmd.spawn();
                    });
                    return Ok(());
                }
            }

            // Cursor Classic Code IDE (`--classic`): forces full editor window
            if editor == "cursor-ide" {
                if is_direct_exe {
                    let mut cmd = Command::new(&resolved_bin);
                    cmd.args(["--classic", &target_str]);
                    cmd.creation_flags(CREATE_NO_WINDOW);
                    cmd.spawn()
                        .map_err(|e| format!("Failed to launch Cursor Classic IDE: {}", e))?;
                    return Ok(());
                } else {
                    let mut cmd = Command::new("cmd");
                    cmd.args(["/C", &resolved_bin, "--classic", &target_str]);
                    cmd.creation_flags(CREATE_NO_WINDOW);
                    cmd.spawn()
                        .map_err(|e| format!("Failed to launch Cursor Classic IDE: {}", e))?;
                    return Ok(());
                }
            }

            // If resolved_bin is a direct .exe file, launch it directly without cmd.exe
            if is_direct_exe {
                let mut cmd = Command::new(&resolved_bin);
                cmd.arg(&target_str);
                cmd.creation_flags(CREATE_NO_WINDOW);
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch '{}': {}", resolved_bin, e))?;
                return Ok(());
            }

            // For .cmd/.bat CLI wrappers (like code.cmd, cursor.cmd, agy.cmd) or PATH commands
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", &resolved_bin, &target_str]);
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.spawn()
                .map_err(|e| format!("Failed to launch IDE '{}': {}", resolved_bin, e))?;
            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        {
            if editor == "cursor" {
                if resolved_bin.ends_with(".app") {
                    Command::new("open")
                        .args(["-a", &resolved_bin, "--args", "--glass"])
                        .spawn()
                        .map_err(|e| format!("Failed to open Cursor Agents Window: {}", e))?;
                    let bin_clone = resolved_bin.clone();
                    let target_clone = target_str.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(550));
                        let _ = Command::new("open")
                            .args(["-a", &bin_clone, &target_clone])
                            .spawn();
                    });
                    return Ok(());
                }
                Command::new(&resolved_bin)
                    .arg("--glass")
                    .spawn()
                    .map_err(|e| format!("Failed to launch Cursor Agents Window: {}", e))?;
                let bin_clone = resolved_bin.clone();
                let target_clone = target_str.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(550));
                    let _ = Command::new(&bin_clone).arg(&target_clone).spawn();
                });
                return Ok(());
            }
            if editor == "cursor-ide" {
                if resolved_bin.ends_with(".app") {
                    Command::new("open")
                        .args(["-a", &resolved_bin, "--args", "--classic", &target_str])
                        .spawn()
                        .map_err(|e| format!("Failed to open Cursor Classic IDE: {}", e))?;
                    return Ok(());
                }
                Command::new(&resolved_bin)
                    .args(["--classic", &target_str])
                    .spawn()
                    .map_err(|e| format!("Failed to launch Cursor Classic IDE: {}", e))?;
                return Ok(());
            }
            if resolved_bin.ends_with(".app") {
                Command::new("open")
                    .args(["-a", &resolved_bin, &target_str])
                    .spawn()
                    .map_err(|e| format!("Failed to open '{}': {}", resolved_bin, e))?;
                return Ok(());
            }
            Command::new(&resolved_bin)
                .arg(&target_str)
                .spawn()
                .map_err(|e| format!("Failed to launch '{}': {}", resolved_bin, e))?;
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn watch_repository(
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
    let last_emit = std::sync::Arc::new(Mutex::new(Instant::now()));

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Ignore .lock files, target/, and node_modules/
                let should_ignore = event.paths.iter().any(|p| {
                    let s = p.to_string_lossy();
                    s.ends_with(".lock")
                        || s.contains("node_modules")
                        || s.contains("target")
                        || s.contains(".git\\objects")
                        || s.contains(".git/objects")
                });
                if should_ignore {
                    return;
                }
                if let Ok(mut last) = last_emit.lock() {
                    if last.elapsed().as_millis() > 1500 {
                        *last = Instant::now();
                        let _ = app_clone.emit("repo-fs-changed", repo_clone.clone());
                    }
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    let git_refs = path.join(".git").join("refs");
    if git_refs.exists() {
        let _ = watcher.watch(&git_refs, RecursiveMode::Recursive);
    }

    *guard = Some(watcher);
    Ok(())
}

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let trimmed = url.trim();
        if !trimmed.starts_with("https://") && !trimmed.starts_with("http://") {
            return Err("Only http/https URLs are allowed".to_string());
        }

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let mut cmd = Command::new("rundll32");
            cmd.args(["url.dll,FileProtocolHandler", trimmed]);
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?;
            Ok(())
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .arg(trimmed)
                .spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?;
            Ok(())
        }

        #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
        {
            Command::new("xdg-open")
                .arg(trimmed)
                .spawn()
                .map_err(|e| format!("Failed to open browser: {}", e))?;
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState {
            watcher: Mutex::new(None),
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon().cloned() {
                    let _ = window.set_icon(icon);
                }
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
            pick_executable,
            detect_installed_ides,
            resolve_git_credential_token,
            read_conflict_file,
            write_conflict_file,
            open_in_external_editor,
            open_external_url,
            watch_repository
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
