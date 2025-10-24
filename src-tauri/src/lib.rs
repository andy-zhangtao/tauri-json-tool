mod models;
mod services;

use models::formatting::{FormattingOptions, FormattingResult};
use models::validation::ValidationResult;
use models::log_entry::{LogEntry, LogStatistics, OperationType, OperationResult};
use services::{json_formatter, json_parser, file_io, logger};
use serde::Serialize;
use std::sync::OnceLock;
use std::path::PathBuf;
use tauri::Manager;

/// 全局日志管理器
static LOGGER: OnceLock<logger::Logger> = OnceLock::new();

/// 获取日志管理器实例
fn get_logger() -> &'static logger::Logger {
    LOGGER.get().expect("Logger not initialized")
}

/// 初始化日志管理器
fn init_logger(app_data_dir: PathBuf) -> Result<(), String> {
    let log_dir = app_data_dir.join("logs");
    let logger_instance = logger::Logger::new(log_dir)?;
    LOGGER
        .set(logger_instance)
        .map_err(|_| "Logger already initialized".to_string())?;
    Ok(())
}

/// Tauri command: 验证 JSON 字符串
#[tauri::command]
async fn validate_json(input: String) -> Result<ValidationResult, String> {
    let input_size = input.len();
    let start = std::time::Instant::now();

    // 在异步任务中执行 JSON 解析，避免阻塞 UI
    let result = tokio::task::spawn_blocking(move || json_parser::validate_json(&input))
        .await
        .map_err(|e| format!("Task execution error: {}", e))?;

    let processing_time = start.elapsed().as_millis() as u64;

    // 记录日志
    let (op_result, error_msg) = match &result {
        ValidationResult::Success { .. } => (OperationResult::Success, None),
        ValidationResult::Error { message, .. } => {
            (OperationResult::Error, Some(message.clone()))
        }
    };

    if let Err(e) = get_logger().log_operation(
        OperationType::Validate,
        op_result,
        input_size,
        processing_time,
        error_msg,
    ) {
        eprintln!("记录日志失败: {}", e);
    }

    Ok(result)
}

/// Tauri command: 格式化 JSON 字符串
#[tauri::command]
async fn format_json(
    input: String,
    options: FormattingOptions,
) -> Result<FormattingResult, String> {
    let input_size = input.len();
    let start = std::time::Instant::now();

    // 在异步任务中执行 JSON 格式化，避免阻塞 UI
    let result = tokio::task::spawn_blocking(move || json_formatter::format_json(&input, &options))
        .await
        .map_err(|e| format!("Task execution error: {}", e))?;

    let processing_time = start.elapsed().as_millis() as u64;

    // 记录日志
    let (op_result, error_msg) = match &result {
        FormattingResult::Success { .. } => (OperationResult::Success, None),
        FormattingResult::Error { message, .. } => {
            (OperationResult::Error, Some(message.clone()))
        }
    };

    if let Err(e) = get_logger().log_operation(
        OperationType::Format,
        op_result,
        input_size,
        processing_time,
        error_msg,
    ) {
        eprintln!("记录日志失败: {}", e);
    }

    Ok(result)
}

/// Tauri command: 压缩 JSON 字符串
#[tauri::command]
async fn minify_json(input: String) -> Result<FormattingResult, String> {
    let input_size = input.len();
    let start = std::time::Instant::now();

    // 在异步任务中执行 JSON 压缩，避免阻塞 UI
    let result = tokio::task::spawn_blocking(move || json_formatter::minify_json(&input))
        .await
        .map_err(|e| format!("Task execution error: {}", e))?;

    let processing_time = start.elapsed().as_millis() as u64;

    // 记录日志
    let (op_result, error_msg) = match &result {
        FormattingResult::Success { .. } => (OperationResult::Success, None),
        FormattingResult::Error { message, .. } => {
            (OperationResult::Error, Some(message.clone()))
        }
    };

    if let Err(e) = get_logger().log_operation(
        OperationType::Minify,
        op_result,
        input_size,
        processing_time,
        error_msg,
    ) {
        eprintln!("记录日志失败: {}", e);
    }

    Ok(result)
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
    tokio::task::spawn_blocking(move || file_io::write_json_file(&file_path, &content))
        .await
        .map_err(|e| format!("Task execution error: {}", e))?
}

/// Tauri command: 获取日志统计
#[tauri::command]
async fn get_log_statistics() -> Result<LogStatistics, String> {
    get_logger().get_statistics()
}

/// Tauri command: 读取最近的日志
#[tauri::command]
async fn get_recent_logs(limit: usize) -> Result<Vec<LogEntry>, String> {
    get_logger().read_logs(Some(limit))
}

/// Tauri command: 清除所有日志
#[tauri::command]
async fn clear_logs() -> Result<(), String> {
    get_logger().clear_logs()
}

/// Tauri command: 获取日志文件路径
#[tauri::command]
async fn get_log_file_path() -> Result<String, String> {
    Ok(get_logger()
        .get_log_path()
        .to_string_lossy()
        .to_string())
}

/// Tauri command: 启用/禁用日志
#[tauri::command]
async fn set_logging_enabled(enabled: bool) -> Result<(), String> {
    get_logger().set_enabled(enabled);
    Ok(())
}

/// Tauri command: 检查日志是否启用
#[tauri::command]
async fn is_logging_enabled() -> Result<bool, String> {
    Ok(get_logger().is_enabled())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 获取应用数据目录
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

            // 初始化日志管理器
            init_logger(app_data_dir)?;

            // 开发模式下启用调试日志
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
            export_json_file,
            get_log_statistics,
            get_recent_logs,
            clear_logs,
            get_log_file_path,
            set_logging_enabled,
            is_logging_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
