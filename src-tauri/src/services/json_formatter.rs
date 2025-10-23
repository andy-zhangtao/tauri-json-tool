use crate::models::formatting::{FormattingOptions, FormattingResult};

/// JSON 最大允许大小：5 MB
const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;

/// 格式化 JSON（美化输出）
///
/// # Arguments
/// * `input` - 待格式化的 JSON 字符串
/// * `options` - 格式化选项（缩进、尾部换行等）
///
/// # Returns
/// 格式化结果，包含格式化后的字符串或错误信息
pub fn format_json(input: &str, options: &FormattingOptions) -> FormattingResult {
    // 检查输入大小
    if input.len() > MAX_JSON_SIZE {
        return FormattingResult::Error {
            message: format!(
                "输入大小 ({:.2} MB) 超过最大限制 5 MB",
                input.len() as f64 / (1024.0 * 1024.0)
            ),
        };
    }

    // 检查空输入
    if input.trim().is_empty() {
        return FormattingResult::Error {
            message: "输入为空，请提供有效的 JSON".to_string(),
        };
    }

    // 验证缩进值
    if options.indent != 2 && options.indent != 4 {
        return FormattingResult::Error {
            message: format!(
                "不支持的缩进值 {}，仅支持 2 或 4 个空格",
                options.indent
            ),
        };
    }

    // 解析 JSON
    let value = match serde_json::from_str::<serde_json::Value>(input) {
        Ok(v) => v,
        Err(e) => {
            return FormattingResult::Error {
                message: format!("JSON 解析失败: {}（第 {} 行，第 {} 列）", e, e.line(), e.column()),
            };
        }
    };

    // 格式化 JSON
    let formatted = match format_value(&value, options.indent) {
        Ok(s) => s,
        Err(e) => {
            return FormattingResult::Error {
                message: format!("JSON 格式化失败: {}", e),
            };
        }
    };

    // 根据配置添加或不添加尾部换行符
    let output = if options.trailing_newline {
        format!("{}\n", formatted)
    } else {
        formatted
    };

    FormattingResult::Success {
        size: output.len(),
        formatted: output,
    }
}

/// 压缩 JSON（移除多余空白）
///
/// # Arguments
/// * `input` - 待压缩的 JSON 字符串
///
/// # Returns
/// 格式化结果，包含压缩后的字符串或错误信息
pub fn minify_json(input: &str) -> FormattingResult {
    // 检查输入大小
    if input.len() > MAX_JSON_SIZE {
        return FormattingResult::Error {
            message: format!(
                "输入大小 ({:.2} MB) 超过最大限制 5 MB",
                input.len() as f64 / (1024.0 * 1024.0)
            ),
        };
    }

    // 检查空输入
    if input.trim().is_empty() {
        return FormattingResult::Error {
            message: "输入为空，请提供有效的 JSON".to_string(),
        };
    }

    // 解析 JSON
    let value = match serde_json::from_str::<serde_json::Value>(input) {
        Ok(v) => v,
        Err(e) => {
            return FormattingResult::Error {
                message: format!("JSON 解析失败: {}（第 {} 行，第 {} 列）", e, e.line(), e.column()),
            };
        }
    };

    // 压缩 JSON（使用 serde_json 的 to_string，它会移除所有多余空白）
    let minified = match serde_json::to_string(&value) {
        Ok(s) => s,
        Err(e) => {
            return FormattingResult::Error {
                message: format!("JSON 压缩失败: {}", e),
            };
        }
    };

    FormattingResult::Success {
        size: minified.len(),
        formatted: minified,
    }
}

/// 使用指定缩进格式化 JSON 值
fn format_value(value: &serde_json::Value, indent: u8) -> Result<String, String> {
    let indent_str = " ".repeat(indent as usize);

    // 使用 serde_json 的 Serializer 和自定义格式化器
    let formatter = serde_json::ser::PrettyFormatter::with_indent(indent_str.as_bytes());
    let mut buf = Vec::new();
    let mut serializer = serde_json::Serializer::with_formatter(&mut buf, formatter);

    serde::Serialize::serialize(value, &mut serializer)
        .map_err(|e| format!("序列化失败: {}", e))?;

    String::from_utf8(buf).map_err(|e| format!("UTF-8 转换失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_json_with_2_spaces() {
        let input = r#"{"name":"test","value":42,"nested":{"key":"value"}}"#;
        let options = FormattingOptions {
            indent: 2,
            trailing_newline: false,
        };

        let result = format_json(input, &options);

        if let FormattingResult::Success { formatted, .. } = result {
            assert!(formatted.contains("  \"name\":"));
            assert!(formatted.contains("    \"key\":"));
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_format_json_with_4_spaces() {
        let input = r#"{"name":"test","value":42}"#;
        let options = FormattingOptions {
            indent: 4,
            trailing_newline: false,
        };

        let result = format_json(input, &options);

        if let FormattingResult::Success { formatted, .. } = result {
            assert!(formatted.contains("    \"name\":"));
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_format_json_with_trailing_newline() {
        let input = r#"{"name":"test"}"#;
        let options = FormattingOptions {
            indent: 2,
            trailing_newline: true,
        };

        let result = format_json(input, &options);

        if let FormattingResult::Success { formatted, .. } = result {
            assert!(formatted.ends_with('\n'));
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_format_json_without_trailing_newline() {
        let input = r#"{"name":"test"}"#;
        let options = FormattingOptions {
            indent: 2,
            trailing_newline: false,
        };

        let result = format_json(input, &options);

        if let FormattingResult::Success { formatted, .. } = result {
            assert!(!formatted.ends_with('\n'));
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_format_json_invalid_indent() {
        let input = r#"{"name":"test"}"#;
        let options = FormattingOptions {
            indent: 3,
            trailing_newline: false,
        };

        let result = format_json(input, &options);

        assert!(matches!(result, FormattingResult::Error { .. }));
    }

    #[test]
    fn test_format_json_invalid_json() {
        let input = r#"{"name": invalid}"#;
        let options = FormattingOptions::default();

        let result = format_json(input, &options);

        assert!(matches!(result, FormattingResult::Error { .. }));
    }

    #[test]
    fn test_format_json_empty_input() {
        let input = "";
        let options = FormattingOptions::default();

        let result = format_json(input, &options);

        assert!(matches!(result, FormattingResult::Error { .. }));
    }

    #[test]
    fn test_minify_json_basic() {
        let input = r#"{
  "name": "test",
  "value": 42
}"#;

        let result = minify_json(input);

        if let FormattingResult::Success { formatted, .. } = result {
            assert_eq!(formatted, r#"{"name":"test","value":42}"#);
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_minify_json_nested() {
        let input = r#"{
  "user": {
    "name": "Alice",
    "age": 30,
    "hobbies": [
      "reading",
      "coding"
    ]
  }
}"#;

        let result = minify_json(input);

        if let FormattingResult::Success { formatted, .. } = result {
            assert!(!formatted.contains('\n'));
            assert!(!formatted.contains("  "));
            assert!(formatted.contains("\"user\""));
            assert!(formatted.contains("\"hobbies\""));
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_minify_json_invalid() {
        let input = r#"{"name": invalid}"#;

        let result = minify_json(input);

        assert!(matches!(result, FormattingResult::Error { .. }));
    }

    #[test]
    fn test_minify_json_empty() {
        let input = "";

        let result = minify_json(input);

        assert!(matches!(result, FormattingResult::Error { .. }));
    }

    #[test]
    fn test_format_json_too_large() {
        let input = "a".repeat(6 * 1024 * 1024); // 6 MB
        let options = FormattingOptions::default();

        let result = format_json(&input, &options);

        if let FormattingResult::Error { message } = result {
            assert!(message.contains("超过最大限制"));
        } else {
            panic!("Expected Error result");
        }
    }

    #[test]
    fn test_minify_json_too_large() {
        let input = "a".repeat(6 * 1024 * 1024); // 6 MB

        let result = minify_json(&input);

        if let FormattingResult::Error { message } = result {
            assert!(message.contains("超过最大限制"));
        } else {
            panic!("Expected Error result");
        }
    }

    #[test]
    fn test_format_preserves_json_semantics() {
        let input = r#"{"a":1,"b":null,"c":true,"d":"string","e":[],"f":{}}"#;
        let options = FormattingOptions::default();

        let result = format_json(input, &options);

        if let FormattingResult::Success { formatted, .. } = result {
            // 重新解析格式化后的 JSON，确保语义一致
            let original: serde_json::Value = serde_json::from_str(input).unwrap();
            let reformatted: serde_json::Value = serde_json::from_str(&formatted).unwrap();
            assert_eq!(original, reformatted);
        } else {
            panic!("Expected Success result");
        }
    }

    #[test]
    fn test_minify_preserves_json_semantics() {
        let input = r#"{
  "a": 1,
  "b": null,
  "c": true,
  "d": "string",
  "e": [],
  "f": {}
}"#;

        let result = minify_json(input);

        if let FormattingResult::Success { formatted, .. } = result {
            // 重新解析压缩后的 JSON，确保语义一致
            let original: serde_json::Value = serde_json::from_str(input).unwrap();
            let minified: serde_json::Value = serde_json::from_str(&formatted).unwrap();
            assert_eq!(original, minified);
        } else {
            panic!("Expected Success result");
        }
    }
}
