/**
 * JSON 指标类型定义
 */

/**
 * JSON 负载指标
 */
export interface JsonMetrics {
  // 基础统计
  lines: number // 行数
  chars: number // 字符数
  bytes: number // 字节数

  // 结构统计（仅对有效 JSON）
  depth: number // JSON 嵌套深度
  objects: number // 对象数量
  arrays: number // 数组数量
  keys: number // 键总数

  // 性能统计
  processingTime?: number // 处理耗时（毫秒）
}

/**
 * 验证状态类型
 */
export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error'

/**
 * 验证状态详情
 */
export interface ValidationStatusDetail {
  status: ValidationStatus
  message?: string
  timestamp?: Date
  duration?: number // 验证耗时（毫秒）
}

/**
 * 空的指标对象（默认值）
 */
export const emptyMetrics: JsonMetrics = {
  lines: 0,
  chars: 0,
  bytes: 0,
  depth: 0,
  objects: 0,
  arrays: 0,
  keys: 0,
}
