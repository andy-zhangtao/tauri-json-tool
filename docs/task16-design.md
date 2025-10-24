# Task 16: Logging & Issue Reporting - 设计文档

> **任务名称**: 日志与问题报告
> **创建时间**: 2025-10-24
> **状态**: 设计中
> **优先级**: 中

---

## 📋 需求分析

### 功能描述

实现验证操作的可选本地日志记录,并提供手动问题报告快捷方式。

### 验收标准

1. **日志存储捕获带有时间戳的验证成功/失败**
   - 记录所有验证、格式化、压缩操作
   - 每条日志包含时间戳、操作类型、结果状态
   - 可配置的日志级别（详细/简洁）
   - 日志文件自动滚动（限制大小）

2. **用户可以从应用内打开日志位置或清除日志**
   - 一键打开日志文件所在文件夹
   - 一键清除所有日志
   - 导出日志为文本文件
   - 查看日志统计信息（总条数、成功率）

3. **"报告问题"操作打开项目的问题跟踪器或预填充的电子邮件草稿**
   - 自动收集诊断信息（版本、平台、错误日志）
   - 在浏览器中打开 GitHub Issues 页面
   - 预填充 Issue 模板
   - 用户可选是否包含最近的日志

---

## 🎯 当前状况分析

### 现有日志系统

目前应用已集成 `tauri-plugin-log`，但仅在 **开发模式** 下启用：

```rust
// src-tauri/src/lib.rs
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
```

**问题分析**:
- ❌ **生产模式无日志**: 用户遇到问题时无法提供日志
- ❌ **无操作记录**: 验证/格式化操作不会被记录
- ❌ **无日志管理 UI**: 用户无法查看或清除日志
- ❌ **无问题报告功能**: 用户不知道如何反馈问题

---

## 🏗️ 技术方案

### 方案概述

我们将实现一个 **轻量级日志系统**，包括：

1. **后端日志服务** (Rust): 记录操作到文件
2. **前端日志管理 UI** (React): 查看、导出、清除日志
3. **问题报告功能**: GitHub Issues 集成

### 设计原则

✅ **可选性**: 日志记录默认开启，但用户可关闭
✅ **隐私优先**: 不记录用户的 JSON 内容，仅记录元数据（大小、类型）
✅ **性能友好**: 异步写入，不阻塞 UI
✅ **自动清理**: 日志文件自动滚动，限制磁盘占用

---

## 🏗️ 架构设计

### 1. 日志数据模型

#### 日志条目结构

```rust
// src-tauri/src/models/log_entry.rs

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

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
    Validate,   // 验证
    Format,     // 格式化
    Minify,     // 压缩
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
    Success,  // 成功
    Error,    // 失败
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
```

---

### 2. Rust 日志服务

#### 日志管理器

```rust
// src-tauri/src/services/logger.rs

use crate::models::log_entry::{LogEntry, LogStatistics, OperationType, OperationResult};
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Utc;

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

        writeln!(writer, "{}", json)
            .map_err(|e| format!("无法写入日志: {}", e))?;

        writer.flush()
            .map_err(|e| format!("无法刷新日志缓冲区: {}", e))?;

        Ok(())
    }

    /// 读取所有日志 (最新的在前)
    pub fn read_logs(&self, limit: Option<usize>) -> Result<Vec<LogEntry>, String> {
        if !self.log_file_path.exists() {
            return Ok(Vec::new());
        }

        let file = File::open(&self.log_file_path)
            .map_err(|e| format!("无法打开日志文件: {}", e))?;

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
        let success = entries.iter().filter(|e| e.result == OperationResult::Success).count();
        let error = entries.iter().filter(|e| e.result == OperationResult::Error).count();
        let validate = entries.iter().filter(|e| e.operation == OperationType::Validate).count();
        let format = entries.iter().filter(|e| e.operation == OperationType::Format).count();
        let minify = entries.iter().filter(|e| e.operation == OperationType::Minify).count();

        let avg_time = entries.iter()
            .map(|e| e.processing_time_ms as f64)
            .sum::<f64>() / total as f64;

        let earliest = entries.last().map(|e| e.timestamp);
        let latest = entries.first().map(|e| e.timestamp);

        Ok(LogStatistics {
            total_operations: total,
            success_count: success,
            error_count: error,
            success_rate: if total > 0 { (success as f64 / total as f64) * 100.0 } else { 0.0 },
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
            std::fs::remove_file(&old_path)
                .map_err(|e| format!("无法删除旧日志备份: {}", e))?;
        }

        // 重命名当前日志文件
        std::fs::rename(&self.log_file_path, &old_path)
            .map_err(|e| format!("无法滚动日志文件: {}", e))?;

        Ok(())
    }
}
```

---

### 3. Tauri 命令集成

#### 新增 Tauri 命令

```rust
// src-tauri/src/lib.rs

use std::sync::OnceLock;
use services::logger::Logger;

/// 全局日志管理器
static LOGGER: OnceLock<Logger> = OnceLock::new();

/// 获取日志管理器实例
fn get_logger() -> &'static Logger {
    LOGGER.get().expect("Logger not initialized")
}

/// 初始化日志管理器
fn init_logger(app_data_dir: PathBuf) -> Result<(), String> {
    let log_dir = app_data_dir.join("logs");
    let logger = Logger::new(log_dir)?;
    LOGGER.set(logger).map_err(|_| "Logger already initialized".to_string())?;
    Ok(())
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
    Ok(get_logger().get_log_path().to_string_lossy().to_string())
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

/// 修改 validate_json 命令以记录日志
#[tauri::command]
async fn validate_json(input: String) -> Result<ValidationResult, String> {
    let input_size = input.len();
    let start = std::time::Instant::now();

    let result = tokio::task::spawn_blocking(move || {
        Ok(json_parser::validate_json(&input))
    })
    .await
    .map_err(|e| format!("Task execution error: {}", e))??;

    let processing_time = start.elapsed().as_millis() as u64;

    // 记录日志
    let (op_result, error_msg) = match &result {
        ValidationResult::Success { .. } => (OperationResult::Success, None),
        ValidationResult::Error { message, .. } => (OperationResult::Error, Some(message.clone())),
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

// 类似地修改 format_json 和 minify_json
```

#### 应用启动时初始化

```rust
// src-tauri/src/lib.rs

.setup(|app| {
  // 获取应用数据目录
  let app_data_dir = app.path().app_data_dir()
    .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

  // 初始化日志管理器
  init_logger(app_data_dir)?;

  // ... 现有代码
  Ok(())
})
```

---

### 4. 前端日志管理界面

#### 日志查看器组件

```typescript
// src/components/LogViewer.tsx

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { LogEntry, LogStatistics } from '../types/logging'

export function LogViewer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const [logsData, statsData] = await Promise.all([
        invoke<LogEntry[]>('get_recent_logs', { limit: 100 }),
        invoke<LogStatistics>('get_log_statistics'),
      ])
      setLogs(logsData)
      setStats(statsData)
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('确定要清除所有日志吗？此操作不可撤销。')) {
      return
    }

    try {
      await invoke('clear_logs')
      await loadLogs() // 重新加载
    } catch (error) {
      console.error('清除日志失败:', error)
      alert('清除日志失败，请重试。')
    }
  }

  const handleOpenLogFolder = async () => {
    try {
      const logPath = await invoke<string>('get_log_file_path')
      const logDir = logPath.substring(0, logPath.lastIndexOf('/'))
      await invoke('open_in_finder', { path: logDir })
    } catch (error) {
      console.error('打开日志文件夹失败:', error)
    }
  }

  const handleExportLogs = () => {
    const text = logs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.operation} - ${log.result} (${log.processing_time_ms}ms, ${log.input_size} bytes)${log.error_message ? ` Error: ${log.error_message}` : ''}`
      )
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `json-tool-logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <h2>操作日志</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="log-stats">
            <div className="stat-card">
              <div className="stat-label">总操作数</div>
              <div className="stat-value">{stats.total_operations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">成功率</div>
              <div className="stat-value">{stats.success_rate.toFixed(1)}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均处理时间</div>
              <div className="stat-value">{stats.avg_processing_time_ms.toFixed(1)}ms</div>
            </div>
          </div>
        )}

        {/* 日志列表 */}
        <div className="log-list">
          {isLoading ? (
            <div className="log-loading">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="log-empty">暂无日志记录</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`log-entry ${log.result === 'error' ? 'log-error' : 'log-success'}`}
              >
                <div className="log-timestamp">
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </div>
                <div className="log-operation">{log.operation}</div>
                <div className="log-result">{log.result}</div>
                <div className="log-time">{log.processing_time_ms}ms</div>
                <div className="log-size">{formatBytes(log.input_size)}</div>
                {log.error_message && <div className="log-error-msg">{log.error_message}</div>}
              </div>
            ))
          )}
        </div>

        {/* 操作按钮 */}
        <div className="log-actions">
          <button className="btn-secondary" onClick={handleOpenLogFolder}>
            打开日志文件夹
          </button>
          <button className="btn-secondary" onClick={handleExportLogs} disabled={logs.length === 0}>
            导出日志
          </button>
          <button className="btn-danger" onClick={handleClearLogs} disabled={logs.length === 0}>
            清除日志
          </button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

---

### 5. 问题报告功能

#### 问题报告组件

```typescript
// src/components/IssueReporter.tsx

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'

const GITHUB_REPO = 'your-username/tauri-json-tool'
const ISSUE_URL = `https://github.com/${GITHUB_REPO}/issues/new`

export function IssueReporter() {
  const [includeLog, setIncludeLog] = useState(true)

  const handleReportIssue = async () => {
    try {
      // 收集诊断信息
      const platform = navigator.platform
      const userAgent = navigator.userAgent
      const appVersion = '0.1.0' // 从某处获取

      // 可选：获取最近的错误日志
      let recentErrors = ''
      if (includeLog) {
        try {
          const logs = await invoke<any[]>('get_recent_logs', { limit: 10 })
          const errors = logs.filter((log) => log.result === 'error')
          recentErrors = errors
            .map((log) => `- ${log.timestamp}: ${log.error_message}`)
            .join('\n')
        } catch (e) {
          console.error('获取日志失败:', e)
        }
      }

      // 构建 Issue 模板
      const issueBody = `
## 问题描述

请简要描述您遇到的问题...

## 复现步骤

1.
2.
3.

## 预期行为

描述您期望发生的行为...

## 实际行为

描述实际发生的行为...

## 环境信息

- **应用版本**: ${appVersion}
- **操作系统**: ${platform}
- **用户代理**: ${userAgent}

${recentErrors ? `## 最近的错误日志\n\n\`\`\`\n${recentErrors}\n\`\`\`\n` : ''}

## 附加信息

请提供任何其他有助于解决问题的信息...
`.trim()

      // 打开 GitHub Issues 页面
      const url = `${ISSUE_URL}?body=${encodeURIComponent(issueBody)}`
      await open(url)
    } catch (error) {
      console.error('打开问题报告页面失败:', error)
      alert('无法打开问题报告页面，请手动访问 GitHub Issues。')
    }
  }

  return (
    <div className="issue-reporter">
      <h3>报告问题</h3>
      <p>如果您遇到问题或有功能建议，请通过 GitHub Issues 告诉我们。</p>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={includeLog}
          onChange={(e) => setIncludeLog(e.target.checked)}
        />
        包含最近的错误日志（不含您的 JSON 数据）
      </label>

      <button className="btn-primary" onClick={handleReportIssue}>
        在 GitHub 上报告问题
      </button>
    </div>
  )
}
```

---

### 6. Toolbar 集成

在 Toolbar 添加 "日志" 和 "报告问题" 按钮：

```typescript
// src/components/Toolbar.tsx

import { LogViewer } from './LogViewer'
import { IssueReporter } from './IssueReporter'

export function Toolbar() {
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [showIssueReporter, setShowIssueReporter] = useState(false)

  return (
    <div className="toolbar">
      {/* 现有按钮 */}

      {/* 新增: 日志按钮 */}
      <button
        className="btn-icon"
        onClick={() => setShowLogViewer(true)}
        title="查看操作日志"
        aria-label="查看操作日志"
      >
        📋
      </button>

      {/* 新增: 报告问题按钮 */}
      <button
        className="btn-icon"
        onClick={() => setShowIssueReporter(true)}
        title="报告问题"
        aria-label="报告问题"
      >
        🐛
      </button>

      {/* 对话框 */}
      <LogViewer isOpen={showLogViewer} onClose={() => setShowLogViewer(false)} />
      {showIssueReporter && (
        <div className="modal-overlay" onClick={() => setShowIssueReporter(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <IssueReporter />
            <button onClick={() => setShowIssueReporter(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 📁 文件清单

### 新增文件

#### Rust 后端

1. **`src-tauri/src/models/log_entry.rs`**
   - LogEntry 结构体
   - OperationType 枚举
   - OperationResult 枚举
   - LogStatistics 结构体

2. **`src-tauri/src/services/logger.rs`**
   - Logger 日志管理器
   - 日志写入、读取、滚动逻辑

#### 前端

1. **`src/types/logging.ts`**
   - TypeScript 类型定义（对应 Rust 结构体）

2. **`src/components/LogViewer.tsx`**
   - 日志查看器组件
   - 统计信息展示
   - 导出、清除功能

3. **`src/components/IssueReporter.tsx`**
   - 问题报告组件
   - GitHub Issues 集成

### 修改文件

1. **`src-tauri/Cargo.toml`**
   - 添加 `chrono` 依赖（时间戳）

2. **`src-tauri/src/models/mod.rs`**
   - 导出 `log_entry` 模块

3. **`src-tauri/src/services/mod.rs`**
   - 导出 `logger` 模块

4. **`src-tauri/src/lib.rs`**
   - 初始化 Logger
   - 注册 Tauri 命令
   - 修改 validate_json/format_json/minify_json 以记录日志

5. **`src/components/Toolbar.tsx`**
   - 添加日志和报告问题按钮

6. **`src/styles.css`**
   - 添加日志查看器样式

7. **`package.json`**
   - 添加 `@tauri-apps/plugin-shell` 依赖（打开浏览器）

---

## 🧪 测试计划

### 功能测试

#### 1. 日志记录

- [ ] 验证操作成功时记录日志
- [ ] 验证操作失败时记录日志（包含错误消息）
- [ ] 格式化操作成功时记录日志
- [ ] 压缩操作成功时记录日志
- [ ] 日志文件超过 5MB 时自动滚动
- [ ] 禁用日志后不再记录

#### 2. 日志查看

- [ ] 日志查看器正确显示最近 100 条日志
- [ ] 统计信息正确（总数、成功率、平均时间）
- [ ] 日志按时间倒序排列（最新的在前）
- [ ] 空日志时显示提示
- [ ] 加载状态正确显示

#### 3. 日志管理

- [ ] 清除日志成功删除文件
- [ ] 清除日志后统计归零
- [ ] 导出日志生成正确的文本文件
- [ ] 打开日志文件夹正确跳转到 Finder

#### 4. 问题报告

- [ ] 报告问题打开 GitHub Issues 页面
- [ ] Issue 模板包含正确的环境信息
- [ ] 勾选 "包含日志" 时正确附加错误日志
- [ ] 不勾选时不包含日志

### 边界情况测试

- [ ] 日志文件不存在时创建新文件
- [ ] 日志文件损坏时跳过无效行
- [ ] 日志目录权限错误时的错误处理
- [ ] 大量日志（10000+ 条）的性能
- [ ] 并发写入日志的线程安全性

### 性能测试

- [ ] 单次日志写入耗时 < 5ms
- [ ] 读取 1000 条日志耗时 < 100ms
- [ ] 日志不影响 JSON 验证性能

---

## 🔄 用户流程

### 流程 1: 自动记录日志

```
用户点击 "验证" 按钮
  ↓
validate_json 命令执行
  ↓
JSON 解析成功/失败
  ↓
记录日志到 operations.log
  ↓
返回验证结果给用户
```

### 流程 2: 查看日志

```
用户点击工具栏 "📋" 按钮
  ↓
打开日志查看器对话框
  ↓
加载最近 100 条日志 + 统计信息
  ↓
用户查看日志列表
  ↓
用户可选:
  - 导出日志 → 下载 .txt 文件
  - 清除日志 → 确认 → 删除所有日志
  - 打开文件夹 → Finder 打开日志目录
```

### 流程 3: 报告问题

```
用户点击工具栏 "🐛" 按钮
  ↓
打开问题报告对话框
  ↓
用户勾选 "包含日志"
  ↓
点击 "在 GitHub 上报告问题"
  ↓
收集诊断信息 + 最近错误日志
  ↓
构建 Issue 模板
  ↓
打开浏览器跳转到 GitHub Issues (预填充模板)
```

---

## ⚠️ 注意事项

### 1. 隐私保护

**关键原则**: 不记录用户的 JSON 内容

✅ **记录的内容**:
- 操作类型（验证/格式化/压缩）
- 操作结果（成功/失败）
- 输入大小（字节数）
- 处理时间
- 错误消息（不含 JSON 片段）
- 时间戳
- 应用版本

❌ **不记录的内容**:
- 用户的 JSON 数据
- JSON 内容的片段
- 文件路径

### 2. 性能考虑

- **异步写入**: 日志写入不阻塞 UI
- **文件大小限制**: 5MB 自动滚动
- **延迟加载**: 日志查看器仅在打开时加载
- **限制条数**: 默认只显示最近 100 条

### 3. 错误处理

- **静默失败**: 日志写入失败不影响主功能
- **跳过损坏行**: 读取日志时跳过无效行
- **默认值**: 统计信息计算错误时返回默认值

### 4. 跨平台兼容性

- **日志路径**: macOS 使用 `~/Library/Application Support/com.json-tools.app/logs/`
- **打开文件夹**: 使用 Tauri Shell 插件
- **时间格式**: 使用 ISO 8601 标准

---

## 📊 验收检查清单

### 核心功能

- [ ] ✅ 验证操作记录日志（成功/失败）
- [ ] ✅ 格式化操作记录日志
- [ ] ✅ 压缩操作记录日志
- [ ] ✅ 日志包含时间戳、类型、结果、大小、时间
- [ ] ✅ 日志文件自动滚动（5MB 限制）

### 日志管理

- [ ] ✅ 查看最近 100 条日志
- [ ] ✅ 显示统计信息（总数、成功率、平均时间）
- [ ] ✅ 导出日志为文本文件
- [ ] ✅ 清除所有日志
- [ ] ✅ 打开日志文件夹

### 问题报告

- [ ] ✅ 在 GitHub 上报告问题
- [ ] ✅ 预填充 Issue 模板（环境信息）
- [ ] ✅ 可选包含最近的错误日志
- [ ] ✅ 不包含用户的 JSON 数据

### 用户体验

- [ ] ✅ 日志记录不影响性能（< 5ms）
- [ ] ✅ 日志查看器加载快速（< 100ms）
- [ ] ✅ 界面清晰直观
- [ ] ✅ 隐私保护（不记录敏感数据）

---

## 🚀 实施步骤

### Phase 1: Rust 后端 (60 分钟)

1. 添加 `chrono` 依赖到 `Cargo.toml`
2. 创建 `models/log_entry.rs`（数据模型）
3. 创建 `services/logger.rs`（日志管理器）
4. 修改 `lib.rs`（初始化 + Tauri 命令）
5. 修改 `validate_json/format_json/minify_json`（记录日志）
6. 编写单元测试

### Phase 2: 前端类型定义 (15 分钟)

1. 创建 `types/logging.ts`
2. 定义 TypeScript 接口

### Phase 3: 日志查看器 (45 分钟)

1. 创建 `LogViewer.tsx`
2. 实现统计信息显示
3. 实现日志列表
4. 实现导出、清除功能

### Phase 4: 问题报告 (30 分钟)

1. 创建 `IssueReporter.tsx`
2. 集成 Shell 插件
3. 实现 GitHub Issues 跳转

### Phase 5: UI 集成 (20 分钟)

1. 修改 `Toolbar.tsx`
2. 添加日志和报告问题按钮
3. 集成对话框

### Phase 6: 样式设计 (25 分钟)

1. 添加日志查看器样式
2. 添加问题报告样式
3. 响应式设计

### Phase 7: 测试与调试 (45 分钟)

1. 功能测试
2. 边界情况测试
3. 性能测试
4. 跨平台测试

### Phase 8: 文档与验收 (20 分钟)

1. 编写完成报告
2. 更新 TODO.md
3. 代码审查

**预计总时长**: 4 小时

---

## 📝 风险评估

### 低风险 ✅

- JSON Lines 格式简单可靠
- 日志写入失败不影响主功能
- 隐私保护明确（不记录敏感数据）

### 中风险 ⚠️

- 日志文件可能被用户手动修改
  - **缓解**: 读取时跳过无效行
- 并发写入可能导致竞争
  - **缓解**: 使用 Mutex 保护
- 日志文件可能占用大量磁盘空间
  - **缓解**: 5MB 自动滚动

### 需要测试 🧪

- 大量日志的读取性能
- 日志滚动的可靠性
- 跨平台兼容性

---

## 🎯 核心价值

### 1. 可观测性

- 用户可以追踪应用的使用情况
- 开发者可以收集问题诊断信息

### 2. 用户赋能

- 用户可以自主管理日志
- 用户可以方便地报告问题

### 3. 隐私优先

- 不记录敏感的 JSON 数据
- 用户可选是否包含日志

### 4. 轻量级

- 异步写入不阻塞 UI
- 自动清理避免磁盘占用

---

## 🔗 相关任务

- **Task 14**: 性能与响应性（已完成）- 日志记录处理时间
- **Task 15**: 偏好存储与同步（已完成）- 可能添加 "日志启用" 偏好
- **Task 18**: 测试自动化与 QA（待实现）- 日志可用于测试报告

---

**文档版本**: 1.0
**审核状态**: 待审核
**预计开始**: 2025-10-24
**预计完成**: 2025-10-24

---

## 附录

### A. 日志文件位置

#### macOS
```
~/Library/Application Support/com.json-tools.app/logs/operations.log
~/Library/Application Support/com.json-tools.app/logs/operations.log.old (备份)
```

### B. 日志格式示例

```jsonlines
{"timestamp":"2025-10-24T12:34:56.789Z","operation":"validate","result":"success","input_size":1024,"processing_time_ms":5,"error_message":null,"app_version":"0.1.0"}
{"timestamp":"2025-10-24T12:35:12.345Z","operation":"format","result":"success","input_size":2048,"processing_time_ms":8,"error_message":null,"app_version":"0.1.0"}
{"timestamp":"2025-10-24T12:36:45.678Z","operation":"validate","result":"error","input_size":512,"processing_time_ms":3,"error_message":"JSON 中存在多余的逗号（第 5 行，第 12 列）","app_version":"0.1.0"}
```

### C. GitHub Issue 模板示例

```markdown
## 问题描述

在验证包含尾部逗号的 JSON 时，错误消息显示不清楚。

## 复现步骤

1. 打开应用
2. 粘贴包含尾部逗号的 JSON: `{"name": "test",}`
3. 点击验证

## 预期行为

应该显示明确的错误消息，指出尾部逗号的位置。

## 实际行为

错误消息模糊，难以定位问题。

## 环境信息

- **应用版本**: 0.1.0
- **操作系统**: MacIntel
- **用户代理**: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...

## 最近的错误日志

\`\`\`
- 2025-10-24T12:36:45.678Z: JSON 中存在多余的逗号（第 5 行，第 12 列）
\`\`\`

## 附加信息

建议在错误消息中提供修复建议。
```
