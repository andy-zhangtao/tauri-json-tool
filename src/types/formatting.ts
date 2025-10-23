// 格式化选项
export interface FormattingOptions {
  indent: 2 | 4
  trailing_newline: boolean
}

// 格式化结果
export type FormattingResult =
  | {
      type: 'Success'
      formatted: string
      size: number
    }
  | {
      type: 'Error'
      message: string
    }

// 类型守卫
export function isFormattingSuccess(
  result: FormattingResult
): result is Extract<FormattingResult, { type: 'Success' }> {
  return result.type === 'Success'
}

export function isFormattingError(
  result: FormattingResult
): result is Extract<FormattingResult, { type: 'Error' }> {
  return result.type === 'Error'
}
