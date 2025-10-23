mod models;
mod services;

use models::validation::ValidationResult;
use services::json_parser;

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
    .invoke_handler(tauri::generate_handler![validate_json])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
