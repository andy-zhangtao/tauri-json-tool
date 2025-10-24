import { useState, useEffect, useCallback } from 'react'
import type { ThemeMode, AppliedTheme } from '../types/theme'

/**
 * 主题管理 Hook (简化版)
 *
 * 不再负责持久化,仅负责:
 * 1. 计算实际应用的主题 (system 模式下检测系统主题)
 * 2. 应用主题到 DOM
 * 3. 监听系统主题变化
 *
 * 持久化由 usePreferences 统一管理
 */
export function useTheme(themeMode: ThemeMode, onChange: (mode: ThemeMode) => void) {
  // 计算实际应用的主题
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
    return computeAppliedTheme(themeMode)
  })

  // 应用主题到 DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme)
  }, [appliedTheme])

  // 监听系统主题变化 (仅在 system 模式下)
  useEffect(() => {
    if (themeMode !== 'system') {
      setAppliedTheme(themeMode as AppliedTheme)
      return
    }

    // 立即应用系统主题
    setAppliedTheme(getSystemTheme())

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setAppliedTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themeMode])

  /**
   * 切换主题 (在三种模式间循环)
   */
  const toggleTheme = useCallback(() => {
    const nextMode: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    }
    onChange(nextMode[themeMode])
  }, [themeMode, onChange])

  return {
    appliedTheme,
    toggleTheme,
  }
}

/**
 * 检测系统主题偏好
 */
function getSystemTheme(): AppliedTheme {
  if (typeof window === 'undefined') return 'dark'
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return isDark ? 'dark' : 'light'
}

/**
 * 计算应用的主题
 */
function computeAppliedTheme(mode: ThemeMode): AppliedTheme {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode as AppliedTheme
}
