import type { FormattingOptions } from './formatting'
import type { ThemeMode } from './theme'

/**
 * 完整的用户偏好配置
 *
 * 这是应用所有偏好设置的单一数据源 (Single Source of Truth)
 */
export interface UserPreferences {
  /**
   * 应用版本 (用于迁移和兼容性检查)
   */
  version: string

  /**
   * 主题设置
   */
  theme: ThemeMode

  /**
   * 自动验证开关
   */
  autoValidate: boolean

  /**
   * JSON 格式化选项
   */
  formatting: FormattingOptions

  /**
   * 窗口设置 (可选,为未来扩展预留)
   */
  window?: {
    width?: number
    height?: number
    x?: number
    y?: number
  }

  /**
   * 高级设置 (可选,为未来扩展预留)
   */
  advanced?: {
    maxFileSize?: number
    enableLogging?: boolean
  }
}

/**
 * 默认偏好配置
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  version: '1.0.0',
  theme: 'system',
  autoValidate: false,
  formatting: {
    indent: 2,
    trailing_newline: true,
  },
}

/**
 * 偏好存储文件名 (Tauri Store 文件名)
 */
export const PREFERENCES_STORE_FILE = 'preferences.json'
