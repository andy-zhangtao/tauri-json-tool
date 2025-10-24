use crate::models::log_entry::{LogEntry, LogStatistics, OperationResult, OperationType};
use chrono::Utc;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter, Write};
use std::path::PathBuf;
use std::sync::Mutex;

/// 日志文件最大大小: 5 MB
const MAX_LOG_FILE_SIZE: u64 = 5 * 1024 * 1024;

/// 日志管理器 (线程安全单例)
pub struct Logger {
    log_file_path: PathBuf,
    enabled: Mutex<bool>,
}

impl Logger {
    /// 创建日志管理器
    pub fn new(log_dir: PathBuf) -> Result<Self, String> {
        // 确保日志目录存在
        if !log_dir.exists() {
            std::fs::create_dir_all(&log_dir)
                .map_err(|e| format!("无法创建日志目录: {}", e))?;
        }

        let log_file_path = log_dir.join("operations.log");

        Ok(Self {
            log_file_path,
            enabled: Mutex::new(true),
        })
    }

    /// 记录操作日志
    pub fn log_operation(
        &self,
        operation: OperationType,
        result: OperationResult,
        input_size: usize,
        processing_time_ms: u64,
        error_message: Option<String>,
    ) -> Result<(), String> {
        // 检查是否启用日志
        let enabled = *self.enabled.lock().unwrap();
        if !enabled {
            return Ok(());
        }

        // 检查日志文件大小，如果超过限制则滚动
        if let Ok(metadata) = std::fs::metadata(&self.log_file_path) {
            if metadata.len() > MAX_LOG_FILE_SIZE {
                self.rotate_log_file()?;
            }
        }

        // 构建日志条目
        let entry = LogEntry {
            timestamp: Utc::now(),
            operation,
            result,
            input_size,
            processing_time_ms,
            error_message,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
        };

        // 写入日志文件 (追加模式，JSON Lines 格式)
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
            .map_err(|e| format!("无法打开日志文件: {}", e))?;

        let mut writer = BufWriter::new(file);
        let json = serde_json::to_string(&entry)
            .map_err(|e| format!("无法序列化日志: {}", e))?;

        writeln!(writer, "{}", json).map_err(|e| format!("无法写入日志: {}", e))?;

        writer
            .flush()
            .map_err(|e| format!("无法刷新日志缓冲区: {}", e))?;

        Ok(())
    }

    /// 读取所有日志 (最新的在前)
    pub fn read_logs(&self, limit: Option<usize>) -> Result<Vec<LogEntry>, String> {
        if !self.log_file_path.exists() {
            return Ok(Vec::new());
        }

        let file =
            File::open(&self.log_file_path).map_err(|e| format!("无法打开日志文件: {}", e))?;

        let reader = BufReader::new(file);
        let mut entries: Vec<LogEntry> = Vec::new();

        for line in std::io::BufRead::lines(reader) {
            let line = line.map_err(|e| format!("读取日志行失败: {}", e))?;
            if line.trim().is_empty() {
                continue;
            }

            match serde_json::from_str::<LogEntry>(&line) {
                Ok(entry) => entries.push(entry),
                Err(e) => {
                    eprintln!("跳过无效的日志行: {}", e);
                    continue;
                }
            }
        }

        // 反转顺序 (最新的在前)
        entries.reverse();

        // 应用限制
        if let Some(limit) = limit {
            entries.truncate(limit);
        }

        Ok(entries)
    }

    /// 计算日志统计
    pub fn get_statistics(&self) -> Result<LogStatistics, String> {
        let entries = self.read_logs(None)?;

        if entries.is_empty() {
            return Ok(LogStatistics {
                total_operations: 0,
                success_count: 0,
                error_count: 0,
                success_rate: 0.0,
                validate_count: 0,
                format_count: 0,
                minify_count: 0,
                avg_processing_time_ms: 0.0,
                earliest_log: None,
                latest_log: None,
            });
        }

        let total = entries.len();
        let success = entries
            .iter()
            .filter(|e| e.result == OperationResult::Success)
            .count();
        let error = entries
            .iter()
            .filter(|e| e.result == OperationResult::Error)
            .count();
        let validate = entries
            .iter()
            .filter(|e| e.operation == OperationType::Validate)
            .count();
        let format = entries
            .iter()
            .filter(|e| e.operation == OperationType::Format)
            .count();
        let minify = entries
            .iter()
            .filter(|e| e.operation == OperationType::Minify)
            .count();

        let avg_time = entries
            .iter()
            .map(|e| e.processing_time_ms as f64)
            .sum::<f64>()
            / total as f64;

        let earliest = entries.last().map(|e| e.timestamp);
        let latest = entries.first().map(|e| e.timestamp);

        Ok(LogStatistics {
            total_operations: total,
            success_count: success,
            error_count: error,
            success_rate: if total > 0 {
                (success as f64 / total as f64) * 100.0
            } else {
                0.0
            },
            validate_count: validate,
            format_count: format,
            minify_count: minify,
            avg_processing_time_ms: avg_time,
            earliest_log: earliest,
            latest_log: latest,
        })
    }

    /// 清除所有日志
    pub fn clear_logs(&self) -> Result<(), String> {
        if self.log_file_path.exists() {
            std::fs::remove_file(&self.log_file_path)
                .map_err(|e| format!("无法删除日志文件: {}", e))?;
        }
        Ok(())
    }

    /// 获取日志文件路径
    pub fn get_log_path(&self) -> PathBuf {
        self.log_file_path.clone()
    }

    /// 启用/禁用日志记录
    pub fn set_enabled(&self, enabled: bool) {
        *self.enabled.lock().unwrap() = enabled;
    }

    /// 检查日志是否启用
    pub fn is_enabled(&self) -> bool {
        *self.enabled.lock().unwrap()
    }

    /// 滚动日志文件 (重命名为 .old，创建新文件)
    fn rotate_log_file(&self) -> Result<(), String> {
        let old_path = self.log_file_path.with_extension("log.old");

        // 删除旧的备份文件
        if old_path.exists() {
            std::fs::remove_file(&old_path).map_err(|e| format!("无法删除旧日志备份: {}", e))?;
        }

        // 重命名当前日志文件
        std::fs::rename(&self.log_file_path, &old_path)
            .map_err(|e| format!("无法滚动日志文件: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_logger_creation() {
        let temp_dir = env::temp_dir().join("json-tool-test-logs");
        let logger = Logger::new(temp_dir.clone()).unwrap();
        assert!(temp_dir.exists());
        assert!(logger.is_enabled());
    }

    #[test]
    fn test_log_operation() {
        let temp_dir = env::temp_dir().join("json-tool-test-logs-2");
        let logger = Logger::new(temp_dir).unwrap();

        let result = logger.log_operation(
            OperationType::Validate,
            OperationResult::Success,
            1024,
            5,
            None,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_read_logs() {
        let temp_dir = env::temp_dir().join("json-tool-test-logs-3");
        let logger = Logger::new(temp_dir).unwrap();

        // 记录几条日志
        logger
            .log_operation(OperationType::Validate, OperationResult::Success, 1024, 5, None)
            .unwrap();
        logger
            .log_operation(
                OperationType::Format,
                OperationResult::Error,
                2048,
                10,
                Some("Test error".to_string()),
            )
            .unwrap();

        let logs = logger.read_logs(None).unwrap();
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[0].operation, OperationType::Format); // 最新的在前
        assert_eq!(logs[1].operation, OperationType::Validate);
    }

    #[test]
    fn test_statistics() {
        let temp_dir = env::temp_dir().join("json-tool-test-logs-4");
        let logger = Logger::new(temp_dir).unwrap();

        logger
            .log_operation(OperationType::Validate, OperationResult::Success, 1024, 5, None)
            .unwrap();
        logger
            .log_operation(OperationType::Validate, OperationResult::Error, 2048, 10, None)
            .unwrap();
        logger
            .log_operation(OperationType::Format, OperationResult::Success, 512, 3, None)
            .unwrap();

        let stats = logger.get_statistics().unwrap();
        assert_eq!(stats.total_operations, 3);
        assert_eq!(stats.success_count, 2);
        assert_eq!(stats.error_count, 1);
        assert_eq!(stats.validate_count, 2);
        assert_eq!(stats.format_count, 1);
        assert!((stats.success_rate - 66.666).abs() < 0.1);
    }

    #[test]
    fn test_clear_logs() {
        let temp_dir = env::temp_dir().join("json-tool-test-logs-5");
        let logger = Logger::new(temp_dir).unwrap();

        logger
            .log_operation(OperationType::Validate, OperationResult::Success, 1024, 5, None)
            .unwrap();
        assert_eq!(logger.read_logs(None).unwrap().len(), 1);

        logger.clear_logs().unwrap();
        assert_eq!(logger.read_logs(None).unwrap().len(), 0);
    }
}
