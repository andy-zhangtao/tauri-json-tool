use serde::{Deserialize, Serialize};

/// JSON 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ValidationResult {
    Success {
        /// 解析后的 JSON 值
        data: serde_json::Value,
        /// 输入大小（字节）
        size: usize,
        /// 处理时间（毫秒）
        processing_time_ms: u64,
    },
    Error {
        /// 错误消息
        message: String,
        /// 错误行号（从 1 开始）
        line: Option<usize>,
        /// 错误列号（从 1 开始）
        column: Option<usize>,
    },
}
