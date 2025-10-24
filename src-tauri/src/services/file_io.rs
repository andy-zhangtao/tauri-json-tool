/// 文件输入输出服务
/// 处理 JSON 文件的导入和导出

use std::fs;
use std::path::Path;

/// 文件读取结果
#[derive(Debug)]
pub struct FileReadResult {
    pub content: String,
    pub file_name: String,
}

/// 从文件路径读取 JSON 内容
///
/// # 参数
/// * `file_path` - 文件的完整路径
///
/// # 返回
/// * `Ok(FileReadResult)` - 成功读取,包含文件内容和文件名
/// * `Err(String)` - 读取失败,包含错误信息
pub fn read_json_file(file_path: &str) -> Result<FileReadResult, String> {
    // 验证文件路径
    let path = Path::new(file_path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    if !path.is_file() {
        return Err(format!("路径不是文件: {}", file_path));
    }

    // 检查文件扩展名
    if let Some(ext) = path.extension() {
        if ext != "json" {
            return Err(format!("文件必须是 .json 格式,当前: .{}", ext.to_string_lossy()));
        }
    } else {
        return Err("文件缺少扩展名,必须是 .json 文件".to_string());
    }

    // 检查文件大小 (限制为 10 MB)
    match fs::metadata(path) {
        Ok(metadata) => {
            let size_mb = metadata.len() as f64 / (1024.0 * 1024.0);
            if size_mb > 10.0 {
                return Err(format!("文件太大 ({:.2} MB),最大支持 10 MB", size_mb));
            }
        }
        Err(e) => {
            return Err(format!("无法获取文件元数据: {}", e));
        }
    }

    // 读取文件内容
    match fs::read_to_string(path) {
        Ok(content) => {
            let file_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            Ok(FileReadResult { content, file_name })
        }
        Err(e) => {
            Err(format!("读取文件失败: {}", e))
        }
    }
}

/// 将 JSON 内容写入文件
///
/// # 参数
/// * `file_path` - 文件的完整路径
/// * `content` - 要写入的 JSON 内容
///
/// # 返回
/// * `Ok(String)` - 成功写入,返回文件路径
/// * `Err(String)` - 写入失败,包含错误信息
pub fn write_json_file(file_path: &str, content: &str) -> Result<String, String> {
    // 验证文件路径
    let path = Path::new(file_path);

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            match fs::create_dir_all(parent) {
                Ok(_) => {}
                Err(e) => {
                    return Err(format!("无法创建目录: {}", e));
                }
            }
        }
    }

    // 确保文件扩展名是 .json
    let path_with_ext = if let Some(ext) = path.extension() {
        if ext != "json" {
            return Err(format!("文件必须是 .json 格式,当前: .{}", ext.to_string_lossy()));
        }
        path.to_path_buf()
    } else {
        // 如果没有扩展名,自动添加 .json
        let mut new_path = path.to_path_buf();
        new_path.set_extension("json");
        new_path
    };

    // 写入文件
    match fs::write(&path_with_ext, content) {
        Ok(_) => {
            Ok(path_with_ext.to_string_lossy().to_string())
        }
        Err(e) => {
            Err(format!("写入文件失败: {}", e))
        }
    }
}

/// 验证文件是否可写
#[allow(dead_code)]
pub fn can_write_file(file_path: &str) -> bool {
    let path = Path::new(file_path);

    // 如果文件已存在,检查是否可写
    if path.exists() {
        return match fs::metadata(path) {
            Ok(metadata) => !metadata.permissions().readonly(),
            Err(_) => false,
        };
    }

    // 如果文件不存在,检查父目录是否可写
    if let Some(parent) = path.parent() {
        if parent.exists() {
            return match fs::metadata(parent) {
                Ok(metadata) => !metadata.permissions().readonly(),
                Err(_) => false,
            };
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn get_temp_dir() -> PathBuf {
        std::env::temp_dir().join("tauri_json_tool_tests")
    }

    fn setup_test_env() -> PathBuf {
        let temp_dir = get_temp_dir();
        fs::create_dir_all(&temp_dir).unwrap();
        temp_dir
    }

    fn cleanup_test_env() {
        let temp_dir = get_temp_dir();
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }
    }

    #[test]
    fn test_read_valid_json_file() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("test.json");
        let test_content = r#"{"name": "test", "value": 123}"#;

        fs::write(&file_path, test_content).unwrap();

        let result = read_json_file(&file_path.to_string_lossy());
        assert!(result.is_ok());

        let read_result = result.unwrap();
        assert_eq!(read_result.content, test_content);
        assert_eq!(read_result.file_name, "test.json");

        cleanup_test_env();
    }

    #[test]
    fn test_read_nonexistent_file() {
        let result = read_json_file("/nonexistent/path/test.json");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("文件不存在"));
    }

    #[test]
    fn test_read_non_json_file() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("test.txt");

        fs::write(&file_path, "test content").unwrap();

        let result = read_json_file(&file_path.to_string_lossy());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("必须是 .json 格式"));

        cleanup_test_env();
    }

    #[test]
    fn test_write_json_file() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("output.json");
        let test_content = r#"{"result": "success"}"#;

        let result = write_json_file(&file_path.to_string_lossy(), test_content);
        assert!(result.is_ok());

        let written_content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(written_content, test_content);

        cleanup_test_env();
    }

    #[test]
    fn test_write_json_file_auto_add_extension() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("output");
        let test_content = r#"{"result": "success"}"#;

        let result = write_json_file(&file_path.to_string_lossy(), test_content);
        assert!(result.is_ok());

        let expected_path = temp_dir.join("output.json");
        assert!(expected_path.exists());

        cleanup_test_env();
    }

    #[test]
    fn test_write_invalid_extension() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("output.txt");
        let test_content = r#"{"result": "success"}"#;

        let result = write_json_file(&file_path.to_string_lossy(), test_content);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("必须是 .json 格式"));

        cleanup_test_env();
    }

    #[test]
    fn test_can_write_file() {
        let temp_dir = setup_test_env();
        let file_path = temp_dir.join("test.json");

        // 目录存在时应该可写
        assert!(can_write_file(&file_path.to_string_lossy()));

        cleanup_test_env();
    }
}
