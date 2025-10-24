mod models;
mod services;

use models::formatting::{FormattingOptions, FormattingResult};
use models::validation::ValidationResult;
use services::{json_formatter, json_parser, file_io};
use serde::Serialize;

/// Tauri command: 验证 JSON 字符串
#[tauri::command]
async fn validate_json(input: String) -> Result<ValidationResult, String> {
    // 在异步任务中执行 JSON 解析，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        Ok(json_parser::validate_json(&input))
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

/// Tauri command: 格式化 JSON 字符串
#[tauri::command]
async fn format_json(input: String, options: FormattingOptions) -> Result<FormattingResult, String> {
    // 在异步任务中执行 JSON 格式化，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        Ok(json_formatter::format_json(&input, &options))
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

/// Tauri command: 压缩 JSON 字符串
#[tauri::command]
async fn minify_json(input: String) -> Result<FormattingResult, String> {
    // 在异步任务中执行 JSON 压缩，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        Ok(json_formatter::minify_json(&input))
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

/// 文件读取结果
#[derive(Debug, Serialize)]
pub struct FileReadResult {
    pub content: String,
    pub file_name: String,
}

/// Tauri command: 从文件导入 JSON
#[tauri::command]
async fn import_json_file(file_path: String) -> Result<FileReadResult, String> {
    // 在异步任务中执行文件读取，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        match file_io::read_json_file(&file_path) {
            Ok(result) => Ok(FileReadResult {
                content: result.content,
                file_name: result.file_name,
            }),
            Err(e) => Err(e),
        }
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

/// Tauri command: 导出 JSON 到文件
#[tauri::command]
async fn export_json_file(file_path: String, content: String) -> Result<String, String> {
    // 在异步任务中执行文件写入，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        file_io::write_json_file(&file_path, &content)
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      validate_json,
      format_json,
      minify_json,
      import_json_file,
      export_json_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
