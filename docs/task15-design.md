# Task 15: Preference Storage & Sync - 设计文档

> **任务名称**: 偏好存储与同步
> **创建时间**: 2025-10-24
> **状态**: 设计中
> **优先级**: 中

---

## 📋 需求分析

### 功能描述

集中存储用户偏好(主题、自动验证、缩进、尾部换行符)并确保启动时检索。

### 验收标准

1. **偏好在 macOS 上支持重启持久化**
   - 用户偏好保存到本地文件系统
   - 应用重启后自动恢复所有偏好设置
   - 支持跨会话访问

2. **损坏或缺失的偏好存储回退到安全默认值而不会崩溃**
   - 检测存储文件损坏或缺失
   - 自动恢复到默认配置
   - 记录错误但不影响应用启动

3. **设置在更改后立即更新,无需重启应用**
   - 实时保存偏好变更
   - UI 立即反映新设置
   - 无延迟或阻塞

---

## 🎯 当前状况分析

### 现有实现

目前应用使用 **浏览器 localStorage** 存储偏好:

1. **存储位置**: `window.localStorage`
2. **存储 Key**:
   - `json-tool-preferences` - 主偏好 (autoValidate, formattingOptions)
   - `json-tool-theme` - 主题偏好 (system/light/dark)

3. **实现文件**:
   - [src/utils/localStorage.ts](src/utils/localStorage.ts) - localStorage 工具函数
   - [src/hooks/usePreferences.ts](src/hooks/usePreferences.ts) - 偏好管理 Hook
   - [src/hooks/useTheme.ts](src/hooks/useTheme.ts) - 主题管理 Hook

### 现有问题分析

#### 问题 1: 浏览器 localStorage 的局限性

❌ **不可靠的持久化**:
- localStorage 受浏览器隐私设置影响
- 用户清理浏览器缓存会丢失偏好
- Tauri WebView 的 localStorage 路径不稳定
- 不同 macOS 版本可能有不同行为

❌ **无备份机制**:
- 数据损坏无法恢复
- 无版本管理
- 无导入/导出功能

❌ **平台不一致**:
- localStorage 路径因平台而异
- macOS 与 Windows 行为可能不同
- 不符合桌面应用的用户期望

#### 问题 2: 分散的存储键

目前有 2 个独立的 localStorage key:
- `json-tool-preferences` (autoValidate, formattingOptions)
- `json-tool-theme` (theme)

问题:
- 不利于统一管理
- 无法原子性更新
- 版本迁移困难

#### 问题 3: 缺少错误恢复

当前实现:
```typescript
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item) as T  // ⚠️ 如果 JSON 损坏会崩溃
  } catch (error) {
    console.error(`读取 localStorage 失败 (key: ${key}):`, error)
    return defaultValue  // ✅ 但会返回默认值
  }
}
```

问题:
- 损坏的 JSON 会导致 parse 失败
- 虽然有 try-catch,但用户体验差
- 无法知道偏好何时被重置

---

## 🏗️ 技术方案

### 方案选择: Tauri Store 插件 vs localStorage

#### Option 1: 继续使用 localStorage (不推荐)

优点:
- ✅ 无需额外依赖
- ✅ 前端代码简单

缺点:
- ❌ 不可靠(见问题 1)
- ❌ 不符合桌面应用规范
- ❌ 无备份机制
- ❌ 无法满足验收标准 1

#### Option 2: Tauri Store 插件 (推荐 ⭐)

优点:
- ✅ 专为 Tauri 设计,可靠持久化
- ✅ 存储到用户数据目录 (macOS: `~/Library/Application Support`)
- ✅ 自动创建备份
- ✅ 支持 JSON 序列化
- ✅ 原生性能
- ✅ 平台一致性

缺点:
- ⚠️ 需要添加依赖 (`tauri-plugin-store`)
- ⚠️ 需要迁移现有 localStorage 代码

**决策**: 选择 **Option 2 - Tauri Store 插件**

理由:
1. 符合桌面应用最佳实践
2. 可靠的持久化机制
3. 满足所有验收标准
4. 长期可维护性更好

---

## 🏗️ 架构设计

### 1. 统一偏好数据模型

#### 完整的偏好接口

```typescript
// src/types/preferences.ts

import type { FormattingOptions } from './formatting'
import type { ThemeMode } from './theme'

/**
 * 完整的用户偏好配置
 *
 * 这是应用所有偏好设置的单一数据源
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
 * 偏好存储键 (Tauri Store 文件名)
 */
export const PREFERENCES_STORE_KEY = 'preferences.json'
```

#### 设计原则

1. **单一数据源** (Single Source of Truth):
   - 所有偏好集中在一个接口
   - 避免分散存储

2. **版本化**:
   - 包含 `version` 字段
   - 支持未来的迁移和升级

3. **可扩展**:
   - 预留 `window` 和 `advanced` 字段
   - 方便后续添加新功能

4. **类型安全**:
   - 完整的 TypeScript 类型定义
   - 避免运行时错误

---

### 2. Tauri Store 集成

#### 2.1 Rust 后端配置

**文件**: `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri-plugin-store = "2.1.0"  # 添加 Store 插件
```

**文件**: `src-tauri/src/lib.rs`

```rust
use tauri_plugin_store::StoreBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())  // 注册 Store 插件
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // ... 现有命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 2.2 前端服务封装

**文件**: `src/services/preferencesService.ts`

```typescript
import { Store } from '@tauri-apps/plugin-store'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES, PREFERENCES_STORE_KEY } from '../types/preferences'

/**
 * 偏好存储服务
 *
 * 封装 Tauri Store 插件,提供类型安全的偏好管理
 */
class PreferencesService {
  private store: Store | null = null
  private isInitialized = false

  /**
   * 初始化 Store (懒加载)
   */
  private async ensureStore(): Promise<Store> {
    if (this.store && this.isInitialized) {
      return this.store
    }

    try {
      this.store = await Store.load(PREFERENCES_STORE_KEY)
      this.isInitialized = true
      return this.store
    } catch (error) {
      console.error('初始化 Store 失败:', error)
      throw new Error('无法初始化偏好存储')
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
        // 首次启动,使用默认值
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

      return saved
    } catch (error) {
      console.error('读取偏好失败:', error)
      // 损坏或错误时返回默认值
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
      const updated: UserPreferences = {
        ...current,
        ...partial,
        // 深度合并 formatting
        formatting: {
          ...current.formatting,
          ...(partial.formatting || {}),
        },
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
      if (!parsed.version || !parsed.theme) {
        throw new Error('无效的偏好配置格式')
      }

      const merged: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      }

      await this.setPreferences(merged)
      return merged
    } catch (error) {
      console.error('导入偏好失败:', error)
      throw new Error('导入偏好失败: JSON 格式错误')
    }
  }

  /**
   * 偏好版本迁移
   *
   * @param old - 旧版本偏好
   * @returns 新版本偏好
   */
  private migratePreferences(old: UserPreferences): UserPreferences {
    // 当前版本: 1.0.0
    // 未来版本迁移逻辑在这里实现

    // 示例: 从 0.9.x 迁移到 1.0.0
    // if (old.version.startsWith('0.9')) {
    //   return {
    //     ...old,
    //     version: '1.0.0',
    //     // 添加新字段的默认值
    //   }
    // }

    // 默认: 合并到当前版本
    return {
      ...DEFAULT_PREFERENCES,
      ...old,
      version: DEFAULT_PREFERENCES.version,
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
}

// 单例导出
export const preferencesService = new PreferencesService()
```

#### 关键特性

✅ **懒加载**: Store 仅在首次使用时初始化
✅ **错误恢复**: 损坏的偏好自动回退到默认值
✅ **版本迁移**: 支持未来版本升级
✅ **部分更新**: `updatePreferences` 支持合并更新
✅ **导入导出**: 用户可备份和恢复偏好
✅ **类型安全**: 完整的 TypeScript 类型

---

### 3. 重构前端 Hook

#### 3.1 统一的 usePreferences Hook

**文件**: `src/hooks/usePreferences.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { preferencesService } from '../services/preferencesService'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES } from '../types/preferences'
import type { FormattingOptions } from '../types/formatting'
import type { ThemeMode } from '../types/theme'

/**
 * 统一的偏好管理 Hook
 *
 * 使用 Tauri Store 插件持久化偏好
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化: 从 Store 加载偏好
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
    return await preferencesService.exportPreferences()
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

    // 便捷访问器
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
```

#### 3.2 简化 useTheme Hook

**文件**: `src/hooks/useTheme.ts`

```typescript
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
```

---

### 4. 迁移策略

#### 4.1 localStorage → Tauri Store 迁移

**目标**: 无缝迁移,用户无感知

**策略**:

1. **首次启动检测**:
   - 检查 Tauri Store 是否有数据
   - 如果没有,检查 localStorage
   - 如果 localStorage 有数据,迁移到 Tauri Store

2. **迁移实现**:

```typescript
// src/utils/migration.ts

import { preferencesService } from '../services/preferencesService'
import { getFromStorage, removeFromStorage } from './localStorage'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES } from '../types/preferences'

/**
 * 从 localStorage 迁移到 Tauri Store
 */
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    // 检查 Tauri Store 是否已有数据
    const existing = await preferencesService.getPreferences()

    // 如果 Store 有数据且版本正确,跳过迁移
    if (existing.version === DEFAULT_PREFERENCES.version) {
      console.log('Tauri Store 已有数据,跳过迁移')
      return
    }

    console.log('开始从 localStorage 迁移...')

    // 读取旧的 localStorage 数据
    const oldPreferences = getFromStorage('json-tool-preferences', null)
    const oldTheme = getFromStorage('json-tool-theme', null)

    if (!oldPreferences && !oldTheme) {
      console.log('localStorage 无数据,使用默认值')
      await preferencesService.setPreferences(DEFAULT_PREFERENCES)
      return
    }

    // 构建新的偏好对象
    const migrated: UserPreferences = {
      version: DEFAULT_PREFERENCES.version,
      theme: oldTheme || DEFAULT_PREFERENCES.theme,
      autoValidate: oldPreferences?.autoValidate ?? DEFAULT_PREFERENCES.autoValidate,
      formatting: oldPreferences?.formattingOptions || DEFAULT_PREFERENCES.formatting,
    }

    // 保存到 Tauri Store
    await preferencesService.setPreferences(migrated)

    // 清理旧的 localStorage (可选)
    removeFromStorage('json-tool-preferences')
    removeFromStorage('json-tool-theme')

    console.log('迁移成功:', migrated)
  } catch (error) {
    console.error('迁移失败:', error)
    // 失败时使用默认值
    await preferencesService.setPreferences(DEFAULT_PREFERENCES)
  }
}
```

3. **应用启动时调用**:

```typescript
// src/App.tsx

import { useEffect } from 'react'
import { migrateFromLocalStorage } from './utils/migration'

function App() {
  // 应用启动时执行一次迁移
  useEffect(() => {
    migrateFromLocalStorage()
  }, [])

  // ... 其余代码
}
```

---

## 📁 文件清单

### 新增文件

1. **`src/types/preferences.ts`**
   - 统一的偏好类型定义
   - UserPreferences 接口
   - DEFAULT_PREFERENCES 常量

2. **`src/services/preferencesService.ts`**
   - Tauri Store 封装
   - 偏好读写逻辑
   - 版本迁移
   - 导入导出功能

3. **`src/utils/migration.ts`**
   - localStorage → Tauri Store 迁移
   - 一次性迁移脚本

4. **`docs/task15-design.md`**
   - 本设计文档

### 修改文件

1. **`src-tauri/Cargo.toml`**
   - 添加 `tauri-plugin-store` 依赖

2. **`src-tauri/src/lib.rs`**
   - 注册 Store 插件

3. **`src/hooks/usePreferences.ts`**
   - 重构为使用 Tauri Store
   - 添加 isLoading 和 error 状态

4. **`src/hooks/useTheme.ts`**
   - 简化为仅负责主题应用和系统监听
   - 不再负责持久化

5. **`src/App.tsx`**
   - 集成 usePreferences Hook
   - 启动时执行迁移

6. **`package.json`**
   - 添加 `@tauri-apps/plugin-store` 依赖

### 可选删除

1. **`src/utils/localStorage.ts`**
   - 仅在迁移时使用
   - 迁移完成后可考虑删除(或保留作为回退)

---

## 🧪 测试计划

### 功能测试

#### 1. 基础持久化测试

- [ ] 修改主题,重启应用,主题保持
- [ ] 修改自动验证,重启应用,设置保持
- [ ] 修改缩进选项,重启应用,设置保持
- [ ] 修改尾部换行符,重启应用,设置保持

#### 2. 损坏恢复测试

- [ ] 删除 `preferences.json`,应用启动正常,使用默认值
- [ ] 修改 `preferences.json` 为无效 JSON,应用启动正常,自动恢复
- [ ] 修改 `preferences.json` 缺少必要字段,应用正常补全

#### 3. 迁移测试

- [ ] 从 localStorage 迁移到 Tauri Store
- [ ] 迁移后旧数据保留
- [ ] 迁移后新数据正确
- [ ] 多次启动不重复迁移

#### 4. 导入导出测试

- [ ] 导出偏好为 JSON
- [ ] 导入 JSON 恢复偏好
- [ ] 导入无效 JSON 提示错误

### 边界情况测试

- [ ] Store 初始化失败时的行为
- [ ] 并发更新偏好的一致性
- [ ] 磁盘空间不足时的错误处理
- [ ] 偏好文件权限错误的处理

### 平台测试

- [ ] macOS 13+ (Ventura)
- [ ] macOS 12 (Monterey)
- [ ] macOS 11 (Big Sur)

---

## 🔄 用户流程

### 流程 1: 首次启动 (全新安装)

```
应用启动
  ↓
检查 Tauri Store (不存在)
  ↓
检查 localStorage (无数据)
  ↓
创建 preferences.json 并写入默认值
  ↓
应用启动完成,显示默认设置
```

### 流程 2: 从 localStorage 迁移

```
应用启动 (用户从旧版本升级)
  ↓
检查 Tauri Store (不存在)
  ↓
检查 localStorage (有数据)
  ↓
读取 localStorage 数据
  ↓
转换为新格式
  ↓
保存到 preferences.json
  ↓
清理 localStorage (可选)
  ↓
应用启动完成,保留用户设置
```

### 流程 3: 正常启动

```
应用启动
  ↓
检查 Tauri Store (存在)
  ↓
读取 preferences.json
  ↓
验证版本和数据完整性
  ↓
应用到 UI
  ↓
应用启动完成
```

### 流程 4: 用户更改设置

```
用户修改主题
  ↓
调用 setTheme('dark')
  ↓
updatePreferences({ theme: 'dark' })
  ↓
合并到现有偏好
  ↓
保存到 preferences.json
  ↓
UI 立即更新 (无需重启)
```

### 流程 5: 偏好损坏恢复

```
应用启动
  ↓
读取 preferences.json
  ↓
JSON 解析失败 (损坏)
  ↓
捕获错误
  ↓
返回默认偏好
  ↓
覆盖写入新的 preferences.json
  ↓
应用启动完成 (用户无感知)
```

---

## ⚠️ 注意事项

### 1. 性能考虑

- **懒加载**: Store 仅在首次访问时初始化
- **批量更新**: 使用 `updatePreferences` 而非多次调用单个 setter
- **避免过度保存**: 仅在用户确认修改时保存,而非每次输入时

### 2. 数据安全

- **原子性**: Tauri Store 保证写入的原子性
- **备份**: Store 插件自动创建 `.bak` 备份文件
- **权限**: 偏好文件存储在用户数据目录,权限安全

### 3. 兼容性

- **向后兼容**: 迁移脚本保证从 localStorage 平滑过渡
- **向前兼容**: 版本字段支持未来升级
- **降级处理**: 新版本偏好在旧版本中忽略未知字段

### 4. 用户体验

- **无感知迁移**: 用户无需手动操作
- **错误提示**: 导入失败时明确提示原因
- **默认安全**: 任何错误都回退到安全默认值

---

## 📊 验收检查清单

### 核心功能

- [ ] ✅ 偏好保存到 Tauri Store
- [ ] ✅ 应用重启后偏好恢复
- [ ] ✅ 偏好损坏时自动恢复默认值
- [ ] ✅ 设置更改立即生效,无需重启
- [ ] ✅ 从 localStorage 自动迁移

### 高级功能

- [ ] ✅ 导出偏好为 JSON
- [ ] ✅ 导入 JSON 恢复偏好
- [ ] ✅ 重置所有偏好
- [ ] ✅ 版本迁移机制

### 代码质量

- [ ] ✅ TypeScript 类型完整
- [ ] ✅ 无 ESLint 错误
- [ ] ✅ 完整的错误处理
- [ ] ✅ 清晰的注释和文档

### 用户体验

- [ ] ✅ 迁移过程无感知
- [ ] ✅ 错误提示清晰
- [ ] ✅ 性能无明显下降
- [ ] ✅ 跨平台一致性

---

## 🚀 实施步骤

### Phase 1: 后端集成 (20 分钟)

1. 修改 `Cargo.toml` 添加 `tauri-plugin-store`
2. 修改 `lib.rs` 注册插件
3. 运行 `cargo build` 验证

### Phase 2: 前端依赖 (10 分钟)

1. 添加 `@tauri-apps/plugin-store` 到 `package.json`
2. 运行 `npm install`

### Phase 3: 类型定义 (15 分钟)

1. 创建 `src/types/preferences.ts`
2. 定义 UserPreferences 接口
3. 定义 DEFAULT_PREFERENCES

### Phase 4: 服务层 (40 分钟)

1. 创建 `src/services/preferencesService.ts`
2. 实现 Store 封装
3. 实现读写、导入导出功能

### Phase 5: Hook 重构 (30 分钟)

1. 重构 `src/hooks/usePreferences.ts`
2. 简化 `src/hooks/useTheme.ts`
3. 移除 localStorage 依赖

### Phase 6: 迁移逻辑 (25 分钟)

1. 创建 `src/utils/migration.ts`
2. 实现 localStorage → Store 迁移
3. 在 App.tsx 中集成

### Phase 7: 测试与调试 (30 分钟)

1. 功能测试
2. 迁移测试
3. 边界情况测试
4. 性能测试

### Phase 8: 文档与验收 (20 分钟)

1. 编写完成报告
2. 更新 TODO.md
3. 代码审查

**预计总时长**: 3 小时

---

## 📝 风险评估

### 低风险 ✅

- Tauri Store 插件成熟稳定
- 迁移逻辑简单清晰
- 有完善的错误恢复机制

### 中风险 ⚠️

- 用户可能手动修改 `preferences.json`
  - **缓解**: 验证和自动修复机制
- Store 初始化可能失败
  - **缓解**: 回退到内存存储
- 迁移可能遗漏数据
  - **缓解**: 完整的测试覆盖

### 需要测试 🧪

- 不同 macOS 版本的兼容性
- 大量偏好数据的性能
- 并发更新的一致性

---

## 🎯 核心价值

### 1. 可靠性

- 使用桌面应用标准的持久化机制
- 符合用户对桌面应用的期望

### 2. 健壮性

- 完善的错误恢复机制
- 任何错误都不会导致应用崩溃

### 3. 可维护性

- 统一的偏好管理
- 清晰的数据模型
- 支持版本迁移

### 4. 用户体验

- 无感知迁移
- 立即生效的设置
- 清晰的错误提示

---

## 🔗 相关任务

- **Task 7**: 格式化操作与偏好 (已完成)
- **Task 12**: 主题与外观设置 (已完成)
- **Task 16**: 日志与问题报告 (待实现,可能依赖本任务)

---

**文档版本**: 1.0
**审核状态**: 待审核
**预计开始**: 2025-10-24
**预计完成**: 2025-10-24

---

## 附录: Tauri Store 存储位置

### macOS
```
~/Library/Application Support/com.json-tools.app/preferences.json
```

### Windows (未来)
```
%APPDATA%\com.json-tools.app\preferences.json
```

### Linux (未来)
```
~/.config/com.json-tools.app/preferences.json
```

**备份文件**: 同目录下自动创建 `preferences.json.bak`
