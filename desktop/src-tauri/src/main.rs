#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct AppState {
    initial_file: Mutex<Option<PathBuf>>,
    current_file: Mutex<Option<PathBuf>>,
}

#[derive(Clone, Serialize)]
struct FileOpenedPayload {
    path: String,
}

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

#[tauri::command]
fn get_initial_file(state: State<'_, AppState>) -> Option<String> {
    let guard = state.initial_file.lock().ok()?;
    guard.as_ref().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn set_current_file(path: String, state: State<'_, AppState>) {
    if let Ok(mut g) = state.current_file.lock() {
        *g = Some(PathBuf::from(path));
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

fn focus_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // A second instance was launched — typically by double-clicking another .json
            focus_main_window(app);
            if let Some(p) = pick_json_file_from_args(&argv) {
                let payload = FileOpenedPayload {
                    path: p.to_string_lossy().into_owned(),
                };
                let _ = app.emit("file-opened", payload);
            }
        }))
        .manage(AppState::default())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if let Some(p) = pick_json_file_from_args(&args) {
                let state: State<'_, AppState> = app.state();
                if let Ok(mut g) = state.initial_file.lock() {
                    *g = Some(p.clone());
                };
                if let Ok(mut g) = state.current_file.lock() {
                    *g = Some(p);
                };
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_file,
            set_current_file,
            read_text_file,
            write_text_file,
            save_as_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JSON Diver");
}
