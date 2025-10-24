import { useTheme } from '../hooks/useTheme'
import type { ThemeMode } from '../types/theme'

/**
 * 主题图标映射
 */
const THEME_ICONS: Record<ThemeMode, string> = {
  system: '💻', // 电脑图标表示自动
  light: '☀️',  // 太阳图标表示浅色
  dark: '🌙',   // 月亮图标表示深色
}

/**
 * 主题标签映射
 */
const THEME_LABELS: Record<ThemeMode, string> = {
  system: '自动',
  light: '浅色',
  dark: '深色',
}

/**
 * 主题切换按钮组件
 *
 * 提供三种主题模式的循环切换:
 * - 自动 (跟随系统)
 * - 浅色 (强制浅色)
 * - 深色 (强制深色)
 */
export function ThemeToggle() {
  const { themeMode, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`当前主题: ${THEME_LABELS[themeMode]} (点击切换)`}
      aria-label={`切换主题，当前为${THEME_LABELS[themeMode]}模式`}
      type="button"
    >
      <span className="theme-icon">{THEME_ICONS[themeMode]}</span>
      <span className="theme-label">{THEME_LABELS[themeMode]}</span>
    </button>
  )
}
