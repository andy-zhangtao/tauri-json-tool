import { invoke } from '@tauri-apps/api/core'
import type { ValidationResult } from '../types/validation'
import type { FormattingOptions, FormattingResult } from '../types/formatting'

/**
 * JSON 验证与格式化服务
 */
export class JsonValidationService {
  /**
   * 验证 JSON 字符串
   * @param input - 待验证的 JSON 字符串
   * @returns 验证结果
   */
  async validateJson(input: string): Promise<ValidationResult> {
    try {
      const result = await invoke<ValidationResult>('validate_json', {
        input,
      })
      return result
    } catch (error) {
      // 处理 Tauri invoke 错误
      const message =
        error instanceof Error ? error.message : '未知错误'
      return {
        type: 'Error',
        message: `系统错误: ${message}`,
        line: undefined,
        column: undefined,
      }
    }
  }

  /**
   * 检查是否为有效 JSON
   * @param input - 待检查的字符串
   * @returns 是否有效
   */
  async isValidJson(input: string): Promise<boolean> {
    const result = await this.validateJson(input)
    return result.type === 'Success'
  }

  /**
   * 获取 JSON 大小（字节）
   * @param input - JSON 字符串
   * @returns 大小（字节）
   */
  getSize(input: string): number {
    return new Blob([input]).size
  }

  /**
   * 格式化文件大小显示
   * @param bytes - 字节数
   * @returns 格式化后的字符串
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * 格式化 JSON 字符串
   * @param input - 待格式化的 JSON 字符串
   * @param options - 格式化选项
   * @returns 格式化结果
   */
  async formatJson(
    input: string,
    options: FormattingOptions
  ): Promise<FormattingResult> {
    try {
      const result = await invoke<FormattingResult>('format_json', {
        input,
        options,
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      return {
        type: 'Error',
        message: `系统错误: ${message}`,
      }
    }
  }

  /**
   * 压缩 JSON 字符串
   * @param input - 待压缩的 JSON 字符串
   * @returns 格式化结果
   */
  async minifyJson(input: string): Promise<FormattingResult> {
    try {
      const result = await invoke<FormattingResult>('minify_json', {
        input,
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      return {
        type: 'Error',
        message: `系统错误: ${message}`,
      }
    }
  }
}

// 导出单例
export const jsonService = new JsonValidationService()
