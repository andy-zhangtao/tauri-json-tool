import { Store } from '@tauri-apps/plugin-store'
import type { UserPreferences } from '../types/preferences'
import type { ThemeMode } from '../types/theme'
import { DEFAULT_PREFERENCES, PREFERENCES_STORE_FILE } from '../types/preferences'

/**
 * 偏好存储服务
 *
 * 封装 Tauri Store 插件,提供类型安全的偏好管理
 */
class PreferencesService {
  private store: Store | null = null
  private isInitialized = false
  private initPromise: Promise<Store> | null = null

  /**
   * 初始化 Store (懒加载,单例)
   */
  private async ensureStore(): Promise<Store> {
    // 如果已初始化,直接返回
    if (this.store && this.isInitialized) {
      return this.store
    }

    // 如果正在初始化,等待完成
    if (this.initPromise) {
      return this.initPromise
    }

    // 开始初始化
    this.initPromise = this.initializeStore()
    return this.initPromise
  }

  /**
   * 实际的初始化逻辑
   */
  private async initializeStore(): Promise<Store> {
    try {
      this.store = await Store.load(PREFERENCES_STORE_FILE)
      this.isInitialized = true
      console.log('Tauri Store 初始化成功:', PREFERENCES_STORE_FILE)
      return this.store
    } catch (error) {
      console.error('初始化 Tauri Store 失败:', error)
      throw new Error('无法初始化偏好存储')
    } finally {
      this.initPromise = null
    }
  }

  /**
   * 读取完整的偏好配置
   *
   * @returns 用户偏好或默认值
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const store = await this.ensureStore()
      const saved = await store.get<UserPreferences>('preferences')

      if (!saved) {
        // 首次启动,使用默认值并保存
        console.log('首次启动,初始化默认偏好')
        await this.setPreferences(DEFAULT_PREFERENCES)
        return DEFAULT_PREFERENCES
      }

      // 验证版本,处理迁移
      if (saved.version !== DEFAULT_PREFERENCES.version) {
        console.warn(`偏好版本不匹配: ${saved.version} -> ${DEFAULT_PREFERENCES.version}`)
        const migrated = this.migratePreferences(saved)
        await this.setPreferences(migrated)
        return migrated
      }

      // 验证必要字段是否存在
      if (!this.validatePreferences(saved)) {
        console.warn('偏好数据不完整,使用默认值')
        await this.setPreferences(DEFAULT_PREFERENCES)
        return DEFAULT_PREFERENCES
      }

      return saved
    } catch (error) {
      console.error('读取偏好失败:', error)
      // 损坏或错误时返回默认值 (不写入,避免覆盖可能可恢复的数据)
      return DEFAULT_PREFERENCES
    }
  }

  /**
   * 保存完整的偏好配置
   *
   * @param preferences - 新的偏好配置
   */
  async setPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const store = await this.ensureStore()
      await store.set('preferences', preferences)
      await store.save() // 持久化到磁盘
      console.log('偏好已保存:', preferences)
    } catch (error) {
      console.error('保存偏好失败:', error)
      throw new Error('无法保存偏好设置')
    }
  }

  /**
   * 更新部分偏好 (合并更新)
   *
   * @param partial - 部分偏好配置
   */
  async updatePreferences(
    partial: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const current = await this.getPreferences()

      // 深度合并
      const updated: UserPreferences = {
        ...current,
        ...partial,
        // 深度合并 formatting (避免覆盖整个对象)
        formatting: {
          ...current.formatting,
          ...(partial.formatting || {}),
        },
        // 深度合并 window (可选)
        window: partial.window
          ? {
              ...current.window,
              ...partial.window,
            }
          : current.window,
        // 深度合并 advanced (可选)
        advanced: partial.advanced
          ? {
              ...current.advanced,
              ...partial.advanced,
            }
          : current.advanced,
      }

      await this.setPreferences(updated)
      return updated
    } catch (error) {
      console.error('更新偏好失败:', error)
      throw new Error('无法更新偏好设置')
    }
  }

  /**
   * 重置为默认偏好
   */
  async resetPreferences(): Promise<UserPreferences> {
    console.log('重置为默认偏好')
    await this.setPreferences(DEFAULT_PREFERENCES)
    return DEFAULT_PREFERENCES
  }

  /**
   * 导出偏好 (JSON 字符串)
   */
  async exportPreferences(): Promise<string> {
    const prefs = await this.getPreferences()
    return JSON.stringify(prefs, null, 2)
  }

  /**
   * 导入偏好 (从 JSON 字符串)
   *
   * @param json - JSON 字符串
   */
  async importPreferences(json: string): Promise<UserPreferences> {
    try {
      const parsed = JSON.parse(json) as Partial<UserPreferences>

      // 验证必要字段
      if (!parsed.version || !parsed.theme || parsed.autoValidate === undefined) {
        throw new Error('无效的偏好配置格式: 缺少必要字段')
      }

      // 合并到默认值 (确保所有字段都存在)
      const merged: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        formatting: {
          ...DEFAULT_PREFERENCES.formatting,
          ...(parsed.formatting || {}),
        },
      }

      await this.setPreferences(merged)
      console.log('偏好导入成功')
      return merged
    } catch (error) {
      console.error('导入偏好失败:', error)
      if (error instanceof SyntaxError) {
        throw new Error('导入失败: JSON 格式错误')
      }
      throw new Error('导入失败: 配置格式无效')
    }
  }

  /**
   * 验证偏好数据的完整性
   *
   * @param prefs - 待验证的偏好
   * @returns 是否有效
   */
  private validatePreferences(prefs: Partial<UserPreferences>): boolean {
    // 检查必要字段
    if (!prefs.version || !prefs.theme || prefs.autoValidate === undefined) {
      return false
    }

    // 检查 theme 值是否有效
    const validThemes: ThemeMode[] = ['system', 'light', 'dark']
    if (!validThemes.includes(prefs.theme)) {
      return false
    }

    // 检查 formatting 字段
    if (!prefs.formatting || typeof prefs.formatting.indent !== 'number') {
      return false
    }

    return true
  }

  /**
   * 偏好版本迁移
   *
   * @param old - 旧版本偏好
   * @returns 新版本偏好
   */
  private migratePreferences(old: UserPreferences): UserPreferences {
    console.log(`迁移偏好: ${old.version} -> ${DEFAULT_PREFERENCES.version}`)

    // 当前版本: 1.0.0
    // 未来版本迁移逻辑在这里实现

    // 示例: 从 0.9.x 迁移到 1.0.0
    // if (old.version.startsWith('0.9')) {
    //   return {
    //     ...old,
    //     version: '1.0.0',
    //     // 添加新字段的默认值
    //     newField: defaultValue,
    //   }
    // }

    // 默认: 合并到当前版本 (保留用户设置,更新版本号)
    return {
      ...DEFAULT_PREFERENCES,
      ...old,
      version: DEFAULT_PREFERENCES.version,
      // 确保深度合并
      formatting: {
        ...DEFAULT_PREFERENCES.formatting,
        ...old.formatting,
      },
    }
  }

  /**
   * 检查 Store 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureStore()
      return true
    } catch {
      return false
    }
  }

  /**
   * 清理资源 (测试时使用)
   */
  async cleanup(): Promise<void> {
    if (this.store) {
      // Tauri Store 没有显式的 close 方法
      this.store = null
      this.isInitialized = false
      this.initPromise = null
      console.log('Tauri Store 已清理')
    }
  }
}

// 单例导出
export const preferencesService = new PreferencesService()
