/**
 * 主题类型定义
 * @module types/theme
 */

/**
 * 主题模式
 * - 'system': 跟随系统设置 (默认)
 * - 'light': 强制浅色主题
 * - 'dark': 强制深色主题
 */
export type ThemeMode = 'system' | 'light' | 'dark'

/**
 * 实际应用的主题
 */
export type AppliedTheme = 'light' | 'dark'

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  mode: ThemeMode
  appliedTheme: AppliedTheme
}
