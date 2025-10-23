import { useState, useEffect, useCallback } from 'react'
import { getFromStorage, setToStorage } from '../utils/localStorage'
import type { FormattingOptions } from '../types/formatting'

/**
 * 用户偏好设置接口
 */
export interface UserPreferences {
  autoValidate: boolean
  formattingOptions: FormattingOptions
}

/**
 * 默认偏好设置
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  autoValidate: false,
  formattingOptions: {
    indent: 2,
    trailing_newline: true,
  },
}

/**
 * localStorage 存储键
 */
const PREFERENCES_KEY = 'json-tool-preferences'

/**
 * 用户偏好管理 Hook
 * @returns 偏好设置和更新函数
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // 初始化时从 localStorage 读取
    return getFromStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES)
  })

  // 同步到 localStorage
  useEffect(() => {
    setToStorage(PREFERENCES_KEY, preferences)
  }, [preferences])

  /**
   * 更新自动验证设置
   */
  const setAutoValidate = useCallback((autoValidate: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      autoValidate,
    }))
  }, [])

  /**
   * 更新格式化选项
   */
  const setFormattingOptions = useCallback(
    (formattingOptions: FormattingOptions) => {
      setPreferences((prev) => ({
        ...prev,
        formattingOptions,
      }))
    },
    []
  )

  /**
   * 重置为默认偏好
   */
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  return {
    preferences,
    autoValidate: preferences.autoValidate,
    formattingOptions: preferences.formattingOptions,
    setAutoValidate,
    setFormattingOptions,
    resetPreferences,
  }
}
