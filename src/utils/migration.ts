import { preferencesService } from '../services/preferencesService'
import { getFromStorage, removeFromStorage } from './localStorage'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES } from '../types/preferences'

/**
 * 从 localStorage 迁移到 Tauri Store
 *
 * 这是一次性迁移脚本,在应用启动时执行一次
 */
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    console.log('检查是否需要迁移偏好...')

    // 1. 检查 Tauri Store 是否已有数据
    const existing = await preferencesService.getPreferences()

    // 如果 Store 有数据且版本正确,说明已经迁移过或是新安装
    if (existing.version === DEFAULT_PREFERENCES.version) {
      // 额外检查: 如果 Store 有数据但不是默认值,说明已迁移
      const isDefault = isDefaultPreferences(existing)
      if (!isDefault) {
        console.log('Tauri Store 已有用户数据,跳过迁移')
        return
      }
      // 如果是默认值,继续检查 localStorage
    }

    console.log('检查 localStorage 是否有数据...')

    // 2. 读取旧的 localStorage 数据
    const oldPreferences = getFromStorage<{
      autoValidate: boolean
      formattingOptions: { indent: number; trailing_newline: boolean }
    }>('json-tool-preferences', null as any)

    const oldTheme = getFromStorage<string>('json-tool-theme', null as any)

    // 3. 如果 localStorage 无数据,使用默认值
    if (!oldPreferences && !oldTheme) {
      console.log('localStorage 无数据,使用默认偏好')
      // 确保 Store 有默认值
      await preferencesService.setPreferences(DEFAULT_PREFERENCES)
      return
    }

    console.log('发现 localStorage 数据,开始迁移...')
    console.log('- oldPreferences:', oldPreferences)
    console.log('- oldTheme:', oldTheme)

    // 4. 构建新的偏好对象 (从 localStorage 迁移)
    const migrated: UserPreferences = {
      version: DEFAULT_PREFERENCES.version,
      theme: validateTheme(oldTheme) || DEFAULT_PREFERENCES.theme,
      autoValidate: oldPreferences?.autoValidate ?? DEFAULT_PREFERENCES.autoValidate,
      formatting: {
        indent: (oldPreferences?.formattingOptions?.indent === 2 ||
                 oldPreferences?.formattingOptions?.indent === 4
                 ? oldPreferences.formattingOptions.indent
                 : DEFAULT_PREFERENCES.formatting.indent) as 2 | 4,
        trailing_newline: oldPreferences?.formattingOptions?.trailing_newline ??
                          DEFAULT_PREFERENCES.formatting.trailing_newline,
      },
    }

    // 5. 保存到 Tauri Store
    await preferencesService.setPreferences(migrated)
    console.log('迁移成功,新偏好:', migrated)

    // 6. 清理旧的 localStorage (可选,避免再次触发迁移)
    removeFromStorage('json-tool-preferences')
    removeFromStorage('json-tool-theme')
    console.log('已清理 localStorage 旧数据')
  } catch (error) {
    console.error('迁移失败:', error)
    // 失败时确保使用默认值 (但不覆盖可能已存在的数据)
    try {
      const current = await preferencesService.getPreferences()
      if (isDefaultPreferences(current)) {
        await preferencesService.setPreferences(DEFAULT_PREFERENCES)
      }
    } catch {
      // 忽略二次错误
    }
  }
}

/**
 * 验证主题值是否有效
 */
function validateTheme(theme: any): 'system' | 'light' | 'dark' | null {
  if (theme === 'system' || theme === 'light' || theme === 'dark') {
    return theme
  }
  return null
}

/**
 * 检查偏好是否为默认值
 */
function isDefaultPreferences(prefs: UserPreferences): boolean {
  return (
    prefs.version === DEFAULT_PREFERENCES.version &&
    prefs.theme === DEFAULT_PREFERENCES.theme &&
    prefs.autoValidate === DEFAULT_PREFERENCES.autoValidate &&
    prefs.formatting.indent === DEFAULT_PREFERENCES.formatting.indent &&
    prefs.formatting.trailing_newline === DEFAULT_PREFERENCES.formatting.trailing_newline
  )
}

/**
 * 手动触发迁移 (测试时使用)
 */
export async function forceMigration(): Promise<void> {
  console.log('强制执行迁移...')
  // 临时清除 Store 数据以触发迁移
  await preferencesService.resetPreferences()
  await migrateFromLocalStorage()
}
