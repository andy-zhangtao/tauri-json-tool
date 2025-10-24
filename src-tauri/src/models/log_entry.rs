use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    /// 时间戳 (ISO 8601)
    pub timestamp: DateTime<Utc>,

    /// 操作类型
    pub operation: OperationType,

    /// 操作结果
    pub result: OperationResult,

    /// 输入大小 (字节)
    pub input_size: usize,

    /// 处理时间 (毫秒)
    pub processing_time_ms: u64,

    /// 错误消息 (如果失败)
    pub error_message: Option<String>,

    /// 应用版本
    pub app_version: String,
}

/// 操作类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OperationType {
    Validate, // 验证
    Format,   // 格式化
    Minify,   // 压缩
}

impl OperationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationType::Validate => "验证",
            OperationType::Format => "格式化",
            OperationType::Minify => "压缩",
        }
    }
}

/// 操作结果
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OperationResult {
    Success, // 成功
    Error,   // 失败
}

impl OperationResult {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationResult::Success => "成功",
            OperationResult::Error => "失败",
        }
    }
}

/// 日志统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStatistics {
    /// 总操作数
    pub total_operations: usize,

    /// 成功数
    pub success_count: usize,

    /// 失败数
    pub error_count: usize,

    /// 成功率 (0-100)
    pub success_rate: f64,

    /// 验证操作数
    pub validate_count: usize,

    /// 格式化操作数
    pub format_count: usize,

    /// 压缩操作数
    pub minify_count: usize,

    /// 平均处理时间 (毫秒)
    pub avg_processing_time_ms: f64,

    /// 最早日志时间戳
    pub earliest_log: Option<DateTime<Utc>>,

    /// 最新日志时间戳
    pub latest_log: Option<DateTime<Utc>>,
}
