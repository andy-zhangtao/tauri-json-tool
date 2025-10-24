/**
 * 错误上下文信息
 */
export interface ErrorContext {
  beforeLines: string[]  // 错误前几行
  errorLine: string      // 错误所在行
  afterLines: string[]   // 错误后几行
  errorChar?: string     // 错误字符
  suggestion?: string    // 修复建议
}

/**
 * JSON 验证结果类型
 */
export type ValidationResult =
  | {
      type: 'Success'
      data: unknown
      size: number
    }
  | {
      type: 'Error'
      message: string
      line?: number
      column?: number
      context?: ErrorContext
    }

/**
 * JSON 验证错误
 */
export interface JsonValidationError {
  message: string
  location?: {
    line: number
    column: number
  }
}

/**
 * 判断验证结果是否为成功
 */
export function isSuccess(
  result: ValidationResult
): result is Extract<ValidationResult, { type: 'Success' }> {
  return result.type === 'Success'
}

/**
 * 判断验证结果是否为错误
 */
export function isError(
  result: ValidationResult
): result is Extract<ValidationResult, { type: 'Error' }> {
  return result.type === 'Error'
}
