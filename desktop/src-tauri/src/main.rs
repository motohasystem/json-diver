#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct AppState {
    // window label -> file path to load initially for that window
    files: Mutex<HashMap<String, PathBuf>>,
}

static NEXT_WINDOW_ID: AtomicUsize = AtomicUsize::new(1);

fn pick_json_file_from_args(args: &[String]) -> Option<PathBuf> {
    // skip argv[0] (executable path)
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let p = PathBuf::from(arg);
        let is_json = p
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("json"))
            .unwrap_or(false);
        if is_json && p.exists() && p.is_file() {
            return Some(p);
        }
    }
    None
}

/// Open a new window in this process. If `path` is given, it is registered so the
/// window's frontend can fetch it via `get_initial_file`.
/// Create a new window. MUST be called from a non-main thread (an async command or the
/// single-instance callback). `build()` then dispatches the actual creation onto the main
/// event loop while keeping it free to pump WebView2 init — building it directly on the main
/// thread instead leaves the window blank and unresponsive (close button does nothing).
fn spawn_window(app: &AppHandle, path: Option<PathBuf>) {
    let label = format!("win-{}", NEXT_WINDOW_ID.fetch_add(1, Ordering::Relaxed));
    if let Some(p) = path {
        if let Ok(mut map) = app.state::<AppState>().files.lock() {
            map.insert(label.clone(), p);
        }
    }
    let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("JSON Diver")
        .inner_size(1280.0, 820.0)
        .min_inner_size(720.0, 480.0)
        .resizable(true)
        .build();
}

#[tauri::command]
fn get_initial_file(window: WebviewWindow, state: State<'_, AppState>) -> Option<String> {
    let guard = state.files.lock().ok()?;
    guard
        .get(window.label())
        .map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn set_current_file(window: WebviewWindow, path: String, state: State<'_, AppState>) {
    if let Ok(mut map) = state.files.lock() {
        map.insert(window.label().to_string(), PathBuf::from(path));
    }
}

// `async` is required: it makes Tauri run this off the main thread so window creation
// dispatches correctly. A sync command would build on the main thread and hang the webview.
#[tauri::command]
async fn open_new_window(app: AppHandle) {
    spawn_window(&app, None);
}

#[tauri::command]
fn open_external(url: String) {
    // Open http(s) links in the user's default browser (no console window flash).
    if url.starts_with("https://") || url.starts_with("http://") {
        let _ = std::process::Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn();
    }
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    std::fs::read_to_string(p).map_err(|e| format!("read failed: {e}"))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let p = Path::new(&path);
    std::fs::write(p, contents).map_err(|e| format!("write failed: {e}"))
}

#[tauri::command]
fn save_as_dialog(app: AppHandle) -> Option<String> {
    let result = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("untitled.json")
        .blocking_save_file();
    result.and_then(|fp| fp.into_path().ok().map(|p| p.to_string_lossy().into_owned()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // A second instance was launched — typically by double-clicking another .json.
            // Open it in a NEW window within this process instead of replacing the existing one.
            spawn_window(app, pick_json_file_from_args(&argv));
        }))
        .manage(AppState::default())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if let Some(p) = pick_json_file_from_args(&args) {
                // The statically-configured startup window has label "main".
                if let Ok(mut map) = app.state::<AppState>().files.lock() {
                    map.insert("main".to_string(), p);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_file,
            set_current_file,
            open_new_window,
            open_external,
            read_text_file,
            write_text_file,
            save_as_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JSON Diver");
}
