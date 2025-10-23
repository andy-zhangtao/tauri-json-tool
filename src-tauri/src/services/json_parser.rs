use crate::models::validation::ValidationResult;

/// JSON 最大允许大小：5 MB
const MAX_JSON_SIZE: usize = 5 * 1024 * 1024;

/// 验证 JSON 字符串
///
/// # Arguments
/// * `input` - 待验证的 JSON 字符串
///
/// # Returns
/// 验证结果，包含成功的数据或错误信息
pub fn validate_json(input: &str) -> ValidationResult {
    // 检查输入大小
    if input.len() > MAX_JSON_SIZE {
        return ValidationResult::Error {
            message: format!(
                "输入大小 ({:.2} MB) 超过最大限制 5 MB",
                input.len() as f64 / (1024.0 * 1024.0)
            ),
            line: None,
            column: None,
        };
    }

    // 检查空输入
    if input.trim().is_empty() {
        return ValidationResult::Error {
            message: "输入为空，请提供有效的 JSON".to_string(),
            line: None,
            column: None,
        };
    }

    // 尝试解析 JSON
    match serde_json::from_str::<serde_json::Value>(input) {
        Ok(value) => ValidationResult::Success {
            data: value,
            size: input.len(),
        },
        Err(error) => {
            // 提取错误位置
            let line = Some(error.line());
            let column = Some(error.column());

            // 格式化错误消息
            let message = format_error_message(&error);

            ValidationResult::Error {
                message,
                line,
                column,
            }
        }
    }
}

/// 将 serde_json 错误转换为用户友好的消息
fn format_error_message(error: &serde_json::Error) -> String {
    let raw = error.to_string();

    // 转换为中文用户友好的消息
    if raw.contains("trailing comma") {
        format!("JSON 中存在多余的逗号（第 {} 行，第 {} 列）", error.line(), error.column())
    } else if raw.contains("expected `,` or `}`") || raw.contains("expected comma") {
        format!("缺少逗号分隔符（第 {} 行，第 {} 列）", error.line(), error.column())
    } else if raw.contains("expected value") {
        format!("缺少值或引号不完整（第 {} 行，第 {} 列）", error.line(), error.column())
    } else if raw.contains("EOF while parsing") {
        format!("JSON 结构不完整，可能缺少括号（第 {} 行）", error.line())
    } else if raw.contains("key must be a string") {
        format!("对象的键必须是字符串（第 {} 行，第 {} 列）", error.line(), error.column())
    } else if raw.contains("invalid escape") {
        format!("包含非法的转义序列（第 {} 行，第 {} 列）", error.line(), error.column())
    } else if raw.contains("control character") {
        format!("包含非法的控制字符（第 {} 行，第 {} 列）", error.line(), error.column())
    } else {
        // 保留原始错误消息，添加位置信息
        format!("JSON 解析错误：{}（第 {} 行，第 {} 列）", raw, error.line(), error.column())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_json_object() {
        let input = r#"{"name": "test", "value": 42}"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Success { .. }));
    }

    #[test]
    fn test_valid_json_array() {
        let input = r#"[1, 2, 3, "test"]"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Success { .. }));
    }

    #[test]
    fn test_valid_json_nested() {
        let input = r#"{"user": {"name": "Alice", "age": 30, "hobbies": ["reading", "coding"]}}"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Success { .. }));
    }

    #[test]
    fn test_empty_object() {
        let input = r#"{}"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Success { .. }));
    }

    #[test]
    fn test_empty_array() {
        let input = r#"[]"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Success { .. }));
    }

    #[test]
    fn test_invalid_json_missing_quote() {
        let input = r#"{"name: "test"}"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Error { .. }));
    }

    #[test]
    fn test_invalid_json_trailing_comma() {
        let input = r#"{"name": "test",}"#;
        let result = validate_json(input);
        if let ValidationResult::Error { line, column, .. } = result {
            assert_eq!(line, Some(1));
            assert!(column.is_some());
        } else {
            panic!("Expected Error result");
        }
    }

    #[test]
    fn test_invalid_json_missing_comma() {
        let input = r#"{"name": "test" "value": 42}"#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Error { .. }));
    }

    #[test]
    fn test_invalid_json_unmatched_bracket() {
        let input = r#"{"name": "test""#;
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Error { .. }));
    }

    #[test]
    fn test_empty_input() {
        let input = "";
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Error { .. }));
    }

    #[test]
    fn test_plain_text() {
        let input = "hello world";
        let result = validate_json(input);
        assert!(matches!(result, ValidationResult::Error { .. }));
    }

    #[test]
    fn test_json_too_large() {
        let input = "a".repeat(6 * 1024 * 1024); // 6 MB
        let result = validate_json(&input);
        if let ValidationResult::Error { message, .. } = result {
            assert!(message.contains("超过最大限制"));
        } else {
            panic!("Expected Error result");
        }
    }

    #[test]
    fn test_error_location_multiline() {
        let input = "{\n  \"name\": \"test\",\n  \"value\": invalid\n}";
        let result = validate_json(input);
        if let ValidationResult::Error { line, column, .. } = result {
            assert_eq!(line, Some(3));
            assert!(column.is_some());
        } else {
            panic!("Expected Error result");
        }
    }

    #[test]
    fn test_success_returns_size() {
        let input = r#"{"test": 123}"#;
        let result = validate_json(input);
        if let ValidationResult::Success { size, .. } = result {
            assert_eq!(size, input.len());
        } else {
            panic!("Expected Success result");
        }
    }
}
