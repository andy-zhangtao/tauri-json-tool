/**
 * 日志类型定义
 * 对应 Rust src-tauri/src/models/log_entry.rs
 */

/**
 * 操作类型
 */
export type OperationType = 'validate' | 'format' | 'minify'

/**
 * 操作结果
 */
export type OperationResult = 'success' | 'error'

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 (ISO 8601) */
  timestamp: string

  /** 操作类型 */
  operation: OperationType

  /** 操作结果 */
  result: OperationResult

  /** 输入大小 (字节) */
  input_size: number

  /** 处理时间 (毫秒) */
  processing_time_ms: number

  /** 错误消息 (如果失败) */
  error_message?: string

  /** 应用版本 */
  app_version: string
}

/**
 * 日志统计信息
 */
export interface LogStatistics {
  /** 总操作数 */
  total_operations: number

  /** 成功数 */
  success_count: number

  /** 失败数 */
  error_count: number

  /** 成功率 (0-100) */
  success_rate: number

  /** 验证操作数 */
  validate_count: number

  /** 格式化操作数 */
  format_count: number

  /** 压缩操作数 */
  minify_count: number

  /** 平均处理时间 (毫秒) */
  avg_processing_time_ms: number

  /** 最早日志时间戳 */
  earliest_log?: string

  /** 最新日志时间戳 */
  latest_log?: string
}

/**
 * 操作类型显示文本映射
 */
export const OPERATION_TEXT: Record<OperationType, string> = {
  validate: '验证',
  format: '格式化',
  minify: '压缩',
}

/**
 * 操作结果显示文本映射
 */
export const RESULT_TEXT: Record<OperationResult, string> = {
  success: '成功',
  error: '失败',
}
