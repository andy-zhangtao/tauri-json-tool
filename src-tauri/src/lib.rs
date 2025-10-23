mod models;
mod services;

use models::formatting::{FormattingOptions, FormattingResult};
use models::validation::ValidationResult;
use services::{json_formatter, json_parser};

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
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![validate_json, format_json, minify_json])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
