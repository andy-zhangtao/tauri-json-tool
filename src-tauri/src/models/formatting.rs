use serde::{Deserialize, Serialize};

/// JSON 格式化选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingOptions {
    /// 缩进大小（2 或 4 个空格）
    #[serde(default = "default_indent")]
    pub indent: u8,

    /// 是否在输出末尾添加换行符
    #[serde(default = "default_trailing_newline")]
    pub trailing_newline: bool,
}

impl Default for FormattingOptions {
    fn default() -> Self {
        Self {
            indent: default_indent(),
            trailing_newline: default_trailing_newline(),
        }
    }
}

fn default_indent() -> u8 {
    2
}

fn default_trailing_newline() -> bool {
    true
}

/// JSON 格式化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum FormattingResult {
    /// 格式化成功
    Success {
        /// 格式化后的 JSON 字符串
        formatted: String,
        /// 输出大小（字节）
        size: usize,
        /// 处理时间（毫秒）
        processing_time_ms: u64,
    },
    /// 格式化失败
    Error {
        /// 错误消息
        message: String,
    },
}
