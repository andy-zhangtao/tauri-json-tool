import { useState, useEffect, useCallback } from 'react'
import { preferencesService } from '../services/preferencesService'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES } from '../types/preferences'
import type { FormattingOptions } from '../types/formatting'
import type { ThemeMode } from '../types/theme'

/**
 * 统一的偏好管理 Hook
 *
 * 使用 Tauri Store 插件持久化偏好,替代原来的 localStorage
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化: 从 Tauri Store 加载偏好
  useEffect(() => {
    let isMounted = true

    async function loadPreferences() {
      try {
        setIsLoading(true)
        const loaded = await preferencesService.getPreferences()
        if (isMounted) {
          setPreferences(loaded)
          setError(null)
        }
      } catch (err) {
        console.error('加载偏好失败:', err)
        if (isMounted) {
          setError('无法加载偏好设置')
          // 使用默认值
          setPreferences(DEFAULT_PREFERENCES)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPreferences()

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * 更新主题
   */
  const setTheme = useCallback(async (theme: ThemeMode) => {
    try {
      const updated = await preferencesService.updatePreferences({ theme })
      setPreferences(updated)
      setError(null)
    } catch (err) {
      console.error('更新主题失败:', err)
      setError('无法保存主题设置')
    }
  }, [])

  /**
   * 更新自动验证
   */
  const setAutoValidate = useCallback(async (autoValidate: boolean) => {
    try {
      const updated = await preferencesService.updatePreferences({ autoValidate })
      setPreferences(updated)
      setError(null)
    } catch (err) {
      console.error('更新自动验证失败:', err)
      setError('无法保存自动验证设置')
    }
  }, [])

  /**
   * 更新格式化选项
   */
  const setFormattingOptions = useCallback(
    async (formatting: FormattingOptions) => {
      try {
        const updated = await preferencesService.updatePreferences({ formatting })
        setPreferences(updated)
        setError(null)
      } catch (err) {
        console.error('更新格式化选项失败:', err)
        setError('无法保存格式化设置')
      }
    },
    []
  )

  /**
   * 重置所有偏好
   */
  const resetPreferences = useCallback(async () => {
    try {
      const reset = await preferencesService.resetPreferences()
      setPreferences(reset)
      setError(null)
    } catch (err) {
      console.error('重置偏好失败:', err)
      setError('无法重置偏好设置')
    }
  }, [])

  /**
   * 导出偏好
   */
  const exportPreferences = useCallback(async (): Promise<string> => {
    try {
      return await preferencesService.exportPreferences()
    } catch (err) {
      console.error('导出偏好失败:', err)
      throw new Error('导出失败')
    }
  }, [])

  /**
   * 导入偏好
   */
  const importPreferences = useCallback(async (json: string) => {
    try {
      const imported = await preferencesService.importPreferences(json)
      setPreferences(imported)
      setError(null)
    } catch (err) {
      console.error('导入偏好失败:', err)
      setError('导入失败: JSON 格式错误')
      throw err
    }
  }, [])

  return {
    // 状态
    preferences,
    isLoading,
    error,

    // 便捷访问器 (保持向后兼容)
    theme: preferences.theme,
    autoValidate: preferences.autoValidate,
    formattingOptions: preferences.formatting,

    // 更新函数
    setTheme,
    setAutoValidate,
    setFormattingOptions,

    // 高级功能
    resetPreferences,
    exportPreferences,
    importPreferences,
  }
}
