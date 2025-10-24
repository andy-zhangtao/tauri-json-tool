import { ErrorContext } from '../types/validation'

/**
 * 从输入文本中提取错误上下文
 */
export function extractErrorContext(
  input: string,
  line?: number,
  column?: number,
  contextLines: number = 2
): ErrorContext | undefined {
  if (!line) return undefined

  const lines = input.split('\n')
  const errorLineIndex = line - 1 // 转换为 0-based 索引

  // 边界检查
  if (errorLineIndex < 0 || errorLineIndex >= lines.length) {
    return undefined
  }

  // 提取上下文行
  const startIndex = Math.max(0, errorLineIndex - contextLines)
  const endIndex = Math.min(lines.length - 1, errorLineIndex + contextLines)

  const beforeLines = lines.slice(startIndex, errorLineIndex)
  const errorLine = lines[errorLineIndex]
  const afterLines = lines.slice(errorLineIndex + 1, endIndex + 1)

  // 提取错误字符
  let errorChar: string | undefined
  if (column && column > 0 && column <= errorLine.length) {
    errorChar = errorLine[column - 1]
  }

  return {
    beforeLines,
    errorLine,
    afterLines,
    errorChar,
    suggestion: generateSuggestion(errorLine, column),
  }
}

/**
 * 根据错误位置生成修复建议
 */
function generateSuggestion(errorLine: string, column?: number): string | undefined {
  if (!column) return undefined

  const trimmedLine = errorLine.trim()

  // 常见错误模式
  if (trimmedLine.endsWith('"') && !trimmedLine.endsWith(',')) {
    return '尝试在引号后添加逗号'
  }

  if (trimmedLine.match(/^\s*"[^"]+"\s*:\s*"[^"]+"\s*$/)) {
    return '对象属性后需要添加逗号(除最后一个属性外)'
  }

  if (trimmedLine.match(/^\s*"[^"]+"\s*$/)) {
    return '字符串值后可能缺少逗号'
  }

  if (errorLine[column - 1] === '}' || errorLine[column - 1] === ']') {
    return '检查是否缺少逗号或有多余的逗号'
  }

  return '检查语法错误,确保 JSON 格式正确'
}

/**
 * 解析错误类型
 */
export function parseErrorType(message: string): string {
  if (message.includes('EOF') || message.includes('unexpected end')) {
    return '意外的文件结束'
  }

  if (message.includes('comma') || message.includes('逗号')) {
    return '逗号相关错误'
  }

  if (message.includes('bracket') || message.includes('括号')) {
    return '括号匹配错误'
  }

  if (message.includes('quote') || message.includes('引号')) {
    return '引号匹配错误'
  }

  if (message.includes('key') || message.includes('键')) {
    return '对象键错误'
  }

  if (message.includes('value') || message.includes('值')) {
    return '值格式错误'
  }

  return '语法错误'
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(
  message: string,
  line?: number,
  column?: number
): string {
  let formatted = message

  // 移除冗余信息
  formatted = formatted.replace(/at line \d+ column \d+/gi, '')
  formatted = formatted.trim()

  // 添加位置信息
  if (line) {
    formatted += ` (第 ${line} 行`
    if (column) {
      formatted += `, 第 ${column} 列`
    }
    formatted += ')'
  }

  return formatted
}
