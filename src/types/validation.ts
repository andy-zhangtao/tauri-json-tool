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
