/**
 * 文件服务
 * 处理 JSON 文件的导入和导出
 */

import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

/**
 * 文件读取结果
 */
export interface FileReadResult {
  content: string
  file_name: string
}

/**
 * 文件导入选项
 */
export interface ImportOptions {
  /**
   * 允许的文件扩展名
   * @default [{ name: 'JSON', extensions: ['json'] }]
   */
  filters?: Array<{ name: string; extensions: string[] }>

  /**
   * 对话框标题
   * @default '选择 JSON 文件'
   */
  title?: string
}

/**
 * 文件导出选项
 */
export interface ExportOptions {
  /**
   * 默认文件名
   * @default 'output.json'
   */
  defaultFileName?: string

  /**
   * 允许的文件扩展名
   * @default [{ name: 'JSON', extensions: ['json'] }]
   */
  filters?: Array<{ name: string; extensions: string[] }>

  /**
   * 对话框标题
   * @default '保存 JSON 文件'
   */
  title?: string
}

/**
 * 文件服务类
 */
class FileService {
  /**
   * 导入 JSON 文件
   *
   * @returns 文件内容和文件名,如果用户取消则返回 null
   * @throws 读取失败时抛出错误
   */
  async importJsonFile(options?: ImportOptions): Promise<FileReadResult | null> {
    // 显示文件选择对话框
    const filePath = await open({
      title: options?.title || '选择 JSON 文件',
      multiple: false,
      directory: false,
      filters: options?.filters || [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    // 用户取消选择
    if (!filePath) {
      return null
    }

    // 调用 Tauri 命令读取文件
    try {
      const result = await invoke<FileReadResult>('import_json_file', {
        filePath,
      })
      return result
    } catch (error) {
      throw new Error(`文件读取失败: ${error}`)
    }
  }

  /**
   * 导出 JSON 文件
   *
   * @param content - 要导出的 JSON 内容
   * @param options - 导出选项
   * @returns 保存的文件路径,如果用户取消则返回 null
   * @throws 写入失败时抛出错误
   */
  async exportJsonFile(
    content: string,
    options?: ExportOptions
  ): Promise<string | null> {
    // 显示文件保存对话框
    const filePath = await save({
      title: options?.title || '保存 JSON 文件',
      defaultPath: options?.defaultFileName || 'output.json',
      filters: options?.filters || [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    // 用户取消保存
    if (!filePath) {
      return null
    }

    // 调用 Tauri 命令写入文件
    try {
      const savedPath = await invoke<string>('export_json_file', {
        filePath,
        content,
      })
      return savedPath
    } catch (error) {
      throw new Error(`文件保存失败: ${error}`)
    }
  }
}

// 导出单例实例
export const fileService = new FileService()
