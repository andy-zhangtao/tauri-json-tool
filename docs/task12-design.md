# Task 12: Theme & Appearance Settings - 设计文档

> **任务名称**: 主题与外观设置
> **创建时间**: 2025-10-24
> **状态**: 设计中
> **优先级**: 中

---

## 📋 需求分析

### 功能描述

提供浅色/深色主题,默认遵循系统偏好,并允许手动切换。

### 验收标准

1. ✅ **应用在启动时检测操作系统主题并应用匹配主题** (已完成)
2. ⏳ **手动切换覆盖系统主题并持久化偏好** (待实现)
3. ✅ **对比度符合文本和控件的可访问性指南** (已完成)

### 当前实现状态

**已完成** ✅:
- 自动检测系统主题 (`@media (prefers-color-scheme)`)
- 深色主题配色 (默认)
- 浅色主题配色
- 响应式布局
- 可访问性对比度

**待实现** ⏳:
- 手动主题切换 UI
- 主题偏好持久化
- 主题状态管理
- 动画过渡效果

---

## 🎯 设计目标

### 核心目标

1. **提供手动主题切换功能**,允许用户覆盖系统设置
2. **持久化用户的主题偏好**,跨会话保持用户选择
3. **平滑的主题切换动画**,提升用户体验
4. **清晰的 UI 控件**,直观显示当前主题状态

### 非目标

- ❌ 不支持自定义主题颜色
- ❌ 不支持多于三种主题(仅支持:自动/浅色/深色)
- ❌ 不需要高级主题编辑器

---

## 🏗️ 技术方案

### 1. 主题模式设计

#### 主题类型定义

```typescript
// src/types/theme.ts

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
```

#### 设计原则

1. **三种模式**:
   - `system`: 遵循系统设置,动态响应系统变化
   - `light`: 强制浅色,忽略系统设置
   - `dark`: 强制深色,忽略系统设置

2. **双层设计**:
   - `mode`: 用户选择的模式(持久化)
   - `appliedTheme`: 实际应用的主题(计算得出)

3. **响应式**:
   - `system` 模式下,监听系统主题变化
   - 手动模式下,不响应系统变化

---

### 2. 主题管理 Hook

#### useTheme Hook 实现

```typescript
// src/hooks/useTheme.ts

import { useState, useEffect, useCallback } from 'react'
import { getFromStorage, setToStorage } from '../utils/localStorage'
import type { ThemeMode, AppliedTheme, ThemeConfig } from '../types/theme'

const THEME_STORAGE_KEY = 'json-tool-theme'
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

  // 设置主题模式
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
    setAppliedTheme(computeAppliedTheme(mode))
  }, [])

  // 切换主题 (在三种模式间循环)
  const toggleTheme = useCallback(() => {
    const nextMode: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    }
    setTheme(nextMode[themeMode])
  }, [themeMode, setTheme])

  return {
    themeMode,
    appliedTheme,
    setTheme,
    toggleTheme,
  }
}
```

#### Hook 特性

- ✅ **持久化**: 自动保存到 localStorage
- ✅ **响应式**: system 模式下监听系统变化
- ✅ **DOM 更新**: 自动应用主题到 `<html data-theme="...">`
- ✅ **类型安全**: 完整的 TypeScript 类型
- ✅ **性能优化**: useCallback 避免重复创建函数

---

### 3. CSS 主题实现

#### 基于 data-theme 属性

**优化方案**: 使用 `[data-theme]` 属性选择器替代 `@media` 查询

```css
/* src/styles.css */

/* 深色主题 (默认) */
:root,
[data-theme='dark'] {
  --bg-primary: #1a1b26;
  --bg-secondary: #24283b;
  --bg-tertiary: #414868;
  --text-primary: #c0caf5;
  --text-secondary: #a9b1d6;
  --text-muted: #565f89;
  --border-color: #2a2e3e;
  --accent-primary: #7aa2f7;
  --accent-success: #9ece6a;
  --accent-error: #f7768e;
  --accent-warning: #e0af68;
}

/* 浅色主题 */
[data-theme='light'] {
  --bg-primary: #f5f5f7;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e5e5ea;
  --text-primary: #1d1d1f;
  --text-secondary: #515154;
  --text-muted: #86868b;
  --border-color: #d2d2d7;
  --accent-primary: #007aff;
  --accent-success: #34c759;
  --accent-error: #ff3b30;
  --accent-warning: #ff9500;
}

/* 主题切换动画 */
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}

/* 对某些元素禁用过渡 (避免影响交互) */
button,
input,
select,
textarea {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease,
              transform 0.2s ease;
}
```

#### 优势对比

**之前 (仅 @media)**:
- ❌ 无法手动覆盖
- ❌ 无法持久化用户选择
- ✅ 自动响应系统变化

**现在 (data-theme + @media 回退)**:
- ✅ 可手动覆盖
- ✅ 可持久化
- ✅ 保留自动响应 (system 模式)
- ✅ 向后兼容

---

### 4. UI 组件设计

#### 主题切换按钮

**位置**: 工具栏右侧,状态指示器旁边

```
┌──────────────────────────────────────────────────────┐
│ [导入] [导出] | [验证] [格式化] | [选项] | [状态] [🌓] │
└──────────────────────────────────────────────────────┘
```

#### 组件实现

```typescript
// src/components/ThemeToggle.tsx

import { useTheme } from '../hooks/useTheme'
import type { ThemeMode } from '../types/theme'

/**
 * 主题图标映射
 */
const THEME_ICONS: Record<ThemeMode, string> = {
  system: '🖥️',  // 或 '⚙️'
  light: '☀️',
  dark: '🌙',
}

/**
 * 主题标签映射
 */
const THEME_LABELS: Record<ThemeMode, string> = {
  system: '自动',
  light: '浅色',
  dark: '深色',
}

export function ThemeToggle() {
  const { themeMode, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`当前主题: ${THEME_LABELS[themeMode]} (点击切换)`}
      aria-label={`切换主题，当前为${THEME_LABELS[themeMode]}模式`}
    >
      <span className="theme-icon">{THEME_ICONS[themeMode]}</span>
      <span className="theme-label">{THEME_LABELS[themeMode]}</span>
    </button>
  )
}
```

#### 样式

```css
/* 主题切换按钮 */
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.theme-toggle:hover {
  background-color: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.theme-toggle:active {
  transform: translateY(0);
}

.theme-icon {
  font-size: 16px;
  line-height: 1;
}

.theme-label {
  font-size: 13px;
}

/* 响应式:小屏幕只显示图标 */
@media (max-width: 768px) {
  .theme-label {
    display: none;
  }
}
```

---

### 5. 集成到应用

#### App.tsx 集成

```typescript
// src/App.tsx

import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'

function App() {
  // 初始化主题 (确保 Hook 在顶层调用)
  useTheme()

  // ... 其他逻辑

  return (
    <div className="app">
      <header className="app-header">
        <h1>JSON Formatter & Validator</h1>
        <p className="app-subtitle">专业的 JSON 验证与格式化工具</p>
      </header>

      <Toolbar
        // ... 现有 props
        themeToggle={<ThemeToggle />}
      />

      {/* ... 其余内容 */}
    </div>
  )
}
```

#### Toolbar 组件更新

```typescript
// src/components/Toolbar.tsx

interface ToolbarProps {
  // ... 现有 props
  themeToggle?: React.ReactNode  // 新增: 主题切换组件
}

export function Toolbar({
  // ... 现有 props
  themeToggle,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        {/* 文件操作 */}
        <button onClick={onImport}>导入</button>
        <button onClick={onExport}>导出</button>
      </div>

      <div className="toolbar-section">
        {/* JSON 操作 */}
        <button onClick={onValidate}>验证</button>
        <button onClick={onFormat}>格式化</button>
        <button onClick={onMinify}>压缩</button>
        <button onClick={onClear}>清空</button>
      </div>

      <div className="toolbar-section">
        {/* 状态与主题 */}
        <div className={`status-indicator status-${validationStatus}`}>
          {validationStatus}
        </div>
        {themeToggle}
      </div>
    </div>
  )
}
```

---

## 🔄 用户流程

### 流程 1: 首次启动 (system 模式)

```
应用启动
  ↓
读取 localStorage (无记录,使用默认 'system')
  ↓
检测系统主题偏好
  ↓
应用对应主题 (dark 或 light)
  ↓
设置 data-theme 属性
  ↓
CSS 变量生效
```

### 流程 2: 手动切换主题

```
用户点击主题切换按钮
  ↓
调用 toggleTheme()
  ↓
更新 themeMode (system → light → dark → system)
  ↓
计算 appliedTheme
  ↓
更新 data-theme 属性
  ↓
CSS 平滑过渡到新主题
  ↓
保存到 localStorage
```

### 流程 3: 系统主题变化 (system 模式)

```
系统主题从 light 变为 dark
  ↓
MediaQuery 监听器触发
  ↓
更新 appliedTheme (light → dark)
  ↓
更新 data-theme 属性
  ↓
CSS 平滑过渡
```

### 流程 4: 持久化恢复

```
用户关闭应用
  ↓
themeMode 已保存在 localStorage ('dark')
  ↓
用户再次打开应用
  ↓
useTheme Hook 读取 localStorage
  ↓
直接应用 'dark' 主题
  ↓
忽略系统设置
```

---

## 📁 文件清单

### 新增文件

1. **`src/types/theme.ts`**
   - 主题类型定义
   - ThemeMode, AppliedTheme, ThemeConfig

2. **`src/hooks/useTheme.ts`**
   - 主题管理 Hook
   - 系统主题检测
   - MediaQuery 监听
   - localStorage 持久化

3. **`src/components/ThemeToggle.tsx`**
   - 主题切换按钮组件
   - 图标和标签显示
   - 可访问性支持

4. **`docs/task12-design.md`**
   - 本设计文档

### 修改文件

1. **`src/styles.css`**
   - 添加 `[data-theme]` 选择器
   - 移除 `@media (prefers-color-scheme)` (可选保留作为回退)
   - 添加主题切换过渡动画
   - 添加 `.theme-toggle` 样式

2. **`src/components/Toolbar.tsx`**
   - 添加 `themeToggle` prop
   - 在工具栏右侧渲染主题切换按钮

3. **`src/App.tsx`**
   - 导入 `useTheme` Hook
   - 导入 `ThemeToggle` 组件
   - 在顶层调用 `useTheme()` 初始化主题
   - 传递 `<ThemeToggle />` 给 Toolbar

4. **`src/hooks/usePreferences.ts`** (可选)
   - 考虑将 theme 集成到 preferences 中
   - 统一偏好管理

---

## 🧪 测试计划

### 功能测试

#### 主题切换测试
- [ ] 点击主题按钮,主题从 system → light
- [ ] 再次点击,主题从 light → dark
- [ ] 再次点击,主题从 dark → system
- [ ] 主题图标和标签正确更新

#### 持久化测试
- [ ] 设置主题为 'light',刷新页面,主题保持 'light'
- [ ] 设置主题为 'dark',关闭并重新打开应用,主题保持 'dark'
- [ ] 设置主题为 'system',刷新页面,主题保持 'system' 并响应系统设置

#### 系统主题响应测试 (system 模式)
- [ ] 设置主题为 'system'
- [ ] 更改系统主题从 light 到 dark,应用主题自动更新
- [ ] 更改系统主题从 dark 到 light,应用主题自动更新
- [ ] 设置主题为 'dark',更改系统主题,应用主题不变

#### CSS 变量测试
- [ ] 切换到 light 主题,所有颜色正确应用
- [ ] 切换到 dark 主题,所有颜色正确应用
- [ ] 主题切换动画平滑,无闪烁

### UI 测试

- [ ] 主题按钮在工具栏正确显示
- [ ] 按钮悬停效果正常
- [ ] 按钮点击效果正常
- [ ] 小屏幕下只显示图标,不显示文字标签
- [ ] 主题图标清晰可辨认

### 可访问性测试

- [ ] 按钮有正确的 `aria-label`
- [ ] 按钮有 `title` 提示信息
- [ ] 键盘可以聚焦和激活按钮
- [ ] 屏幕阅读器正确朗读按钮状态

### 边界情况测试

- [ ] localStorage 被禁用时,主题仍可切换(不持久化)
- [ ] localStorage 数据损坏时,回退到默认 'system'
- [ ] 浏览器不支持 matchMedia 时,回退到 'dark'
- [ ] 快速连续点击主题按钮,状态正确

### 兼容性测试

- [ ] macOS Safari: 主题切换正常
- [ ] macOS Chrome: 主题切换正常
- [ ] macOS Firefox: 主题切换正常
- [ ] 不同 macOS 版本的系统主题检测

---

## ⚠️ 注意事项

### 1. 性能优化

- **避免 FOUC (Flash of Unstyled Content)**:
  - 尽早应用主题(在 React 渲染前)
  - 考虑在 `index.html` 中内联主题检测脚本

- **减少重绘**:
  - 仅在必要时更新 data-theme 属性
  - 使用 CSS 变量而非直接样式操作

### 2. 用户体验

- **平滑过渡**:
  - 使用 CSS transition 实现主题切换动画
  - 过渡时间设为 0.3s (不要太快或太慢)

- **清晰反馈**:
  - 按钮图标和标签清晰表达当前主题
  - Tooltip 提供详细说明

- **智能默认**:
  - 默认 'system' 模式,尊重用户系统设置
  - 仅在用户明确选择时覆盖

### 3. 可访问性

- **对比度**:
  - 确保文本与背景对比度 ≥ 4.5:1
  - 已在现有 CSS 中验证

- **可读性**:
  - 主题切换不影响内容可读性
  - 错误、警告颜色在两种主题下都清晰

- **键盘导航**:
  - 主题按钮可通过 Tab 聚焦
  - 按 Enter 或 Space 激活

### 4. 技术考虑

- **TypeScript 严格模式**:
  - 所有类型定义完整
  - 避免 `any` 类型

- **React 最佳实践**:
  - Hook 依赖项正确
  - 避免不必要的重渲染
  - 使用 useCallback 缓存函数

- **向后兼容**:
  - 保留 @media 作为回退
  - 旧浏览器仍能使用系统主题

---

## 📊 验收检查清单

开发完成后,按以下清单逐项检查:

### 核心功能
- [ ] ✅ 应用启动时检测系统主题并应用
- [ ] ✅ 主题切换按钮正确显示在工具栏
- [ ] ✅ 点击按钮可在三种模式间切换
- [ ] ✅ 主题偏好保存到 localStorage
- [ ] ✅ 刷新/重启应用后主题保持
- [ ] ✅ system 模式下响应系统主题变化
- [ ] ✅ light/dark 模式下忽略系统变化

### UI/UX
- [ ] ✅ 主题切换动画平滑,无闪烁
- [ ] ✅ 按钮图标和标签正确显示当前主题
- [ ] ✅ 按钮悬停和点击效果正常
- [ ] ✅ 小屏幕下只显示图标
- [ ] ✅ 所有 UI 元素在两种主题下都清晰可见

### 代码质量
- [ ] ✅ TypeScript 类型定义完整
- [ ] ✅ 无 ESLint 错误或警告
- [ ] ✅ 代码遵循项目风格
- [ ] ✅ 注释清晰,便于维护

### 可访问性
- [ ] ✅ 按钮有 aria-label
- [ ] ✅ 按钮有 title 提示
- [ ] ✅ 键盘可访问
- [ ] ✅ 对比度符合 WCAG 标准

### 兼容性
- [ ] ✅ macOS 上工作正常
- [ ] ✅ 不同浏览器上工作正常
- [ ] ✅ localStorage 被禁用时优雅降级

---

## 🚀 实施步骤

### Phase 1: 类型定义 (10 分钟)
1. 创建 `src/types/theme.ts`
2. 定义 ThemeMode, AppliedTheme, ThemeConfig

### Phase 2: 主题 Hook (30 分钟)
1. 创建 `src/hooks/useTheme.ts`
2. 实现系统主题检测
3. 实现 MediaQuery 监听
4. 实现 localStorage 持久化
5. 实现 DOM 更新逻辑

### Phase 3: CSS 更新 (20 分钟)
1. 修改 `src/styles.css`
2. 添加 `[data-theme]` 选择器
3. 添加主题切换过渡动画
4. 添加 `.theme-toggle` 样式
5. 测试两种主题的视觉效果

### Phase 4: UI 组件 (20 分钟)
1. 创建 `src/components/ThemeToggle.tsx`
2. 实现图标和标签显示
3. 添加可访问性属性
4. 样式调整

### Phase 5: 集成 (15 分钟)
1. 修改 `src/App.tsx`
2. 修改 `src/components/Toolbar.tsx`
3. 在顶层调用 useTheme Hook
4. 传递 ThemeToggle 组件

### Phase 6: 测试与优化 (25 分钟)
1. 功能测试
2. UI 测试
3. 可访问性测试
4. 边界情况测试
5. 性能优化

**预计总时长**: 2 小时

---

## 📝 补充说明

### 与其他任务的关联

- **Task 7**: 偏好管理系统已实现,可考虑将 theme 集成其中
- **Task 15**: 偏好存储与同步,theme 是其中一部分

### 未来增强

1. **高级主题功能**
   - 自定义主题颜色
   - 导入/导出主题配置
   - 主题预览

2. **更多主题**
   - 高对比度主题(可访问性)
   - 护眼模式
   - 节日主题

3. **动画增强**
   - 主题切换渐变动画
   - 图标旋转效果
   - 涟漪效果

### 技术债务

- **MVP 限制**:
  - 仅支持三种模式
  - 颜色变量固定,不可自定义

- **可选优化**:
  - FOUC 预防脚本
  - 主题预加载
  - CSS-in-JS 方案(如需要)

---

## 🎯 核心价值

### 1. 用户自主权
- 用户可以选择自己喜欢的主题
- 不受系统设置限制

### 2. 个性化体验
- 持久化偏好,跨会话保持
- 平滑的视觉过渡

### 3. 可访问性
- 提供浅色和深色两种高对比度主题
- 支持不同光照环境和用户偏好

---

## 🔍 风险评估

### 低风险 ✅
- 核心功能简单,实现清晰
- 不涉及后端交互
- 不影响现有功能

### 中风险 ⚠️
- localStorage 可能被禁用
  - **缓解**: 提供内存降级方案
- 浏览器不支持 matchMedia
  - **缓解**: 回退到默认主题

### 需要测试 🧪
- 不同浏览器的主题检测
- 快速切换主题的性能
- 与现有 CSS 的兼容性

---

**文档版本**: 1.0
**审核状态**: 待审核
**预计开始**: 2025-10-24
**预计完成**: 2025-10-24
