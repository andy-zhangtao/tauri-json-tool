import { useState, useEffect, useCallback } from 'react'
import { getFromStorage, setToStorage } from '../utils/localStorage'
import type { ThemeMode, AppliedTheme } from '../types/theme'

/**
 * localStorage 存储键
 */
const THEME_STORAGE_KEY = 'json-tool-theme'

/**
 * 默认主题模式
 */
const DEFAULT_THEME_MODE: ThemeMode = 'system'

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

/**
 * 主题管理 Hook
 *
 * 提供三种主题模式:
 * - system: 跟随系统设置,动态响应系统主题变化
 * - light: 强制浅色主题,忽略系统设置
 * - dark: 强制深色主题,忽略系统设置
 *
 * @returns {Object} 主题状态和控制函数
 */
export function useTheme() {
  // 从 localStorage 读取用户偏好
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return getFromStorage(THEME_STORAGE_KEY, DEFAULT_THEME_MODE)
  })

  // 计算实际应用的主题
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
    return computeAppliedTheme(themeMode)
  })

  // 持久化主题模式到 localStorage
  useEffect(() => {
    setToStorage(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  // 应用主题到 DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme)
  }, [appliedTheme])

  // 监听系统主题变化 (仅在 system 模式下)
  useEffect(() => {
    if (themeMode !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setAppliedTheme(e.matches ? 'dark' : 'light')
    }

    // 使用 addEventListener (推荐的现代方式)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themeMode])

  /**
   * 设置主题模式
   */
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
    setAppliedTheme(computeAppliedTheme(mode))
  }, [])

  /**
   * 切换主题 (在三种模式间循环)
   * system → light → dark → system
   */
  const toggleTheme = useCallback(() => {
    const nextMode: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    }
    setTheme(nextMode[themeMode])
  }, [themeMode, setTheme])

  return {
    /**
     * 当前主题模式 (用户选择的模式)
     */
    themeMode,

    /**
     * 实际应用的主题 (计算后的主题)
     */
    appliedTheme,

    /**
     * 设置主题模式
     */
    setTheme,

    /**
     * 切换主题 (循环切换)
     */
    toggleTheme,
  }
}
