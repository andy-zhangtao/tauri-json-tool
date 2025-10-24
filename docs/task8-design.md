# Task 8: Clipboard Utilities - 设计文档

> **任务名称**: 剪贴板工具
> **创建时间**: 2025-10-24
> **状态**: 设计中

---

## 📋 需求分析

### 功能描述

为原始输入和格式化输出提供复制操作,确保与系统剪贴板的可靠交互。

### 验收标准

1. **复制按钮将正确内容传输到剪贴板并提供用户反馈**
   - 复制输入按钮复制原始 JSON 内容
   - 复制输出按钮复制格式化后的 JSON 内容
   - 复制成功后显示视觉反馈(提示文字或图标变化)
   - 复制失败时显示错误提示

2. **操作尊重所有支持的操作系统的剪贴板权限**
   - macOS/Windows/Linux 剪贴板 API 兼容
   - 处理剪贴板权限被拒绝的情况
   - 优雅降级,提供备选方案

3. **复制操作可通过键盘快捷键使用**
   - Cmd/Ctrl + C: 复制选中文本(原生行为)
   - Cmd/Ctrl + Shift + I: 复制输入内容
   - Cmd/Ctrl + Shift + O: 复制输出内容
   - 快捷键在所有操作系统上遵循平台约定

---

## 🎨 UI/UX 设计

### 1. UI 布局增强

#### 当前布局
```
┌─────────────────┐  ┌─────────────────┐
│ 输入            │  │ 输出            │
├─────────────────┤  ├─────────────────┤
│ [textarea]      │  │ [textarea]      │
│                 │  │                 │
└─────────────────┘  └─────────────────┘
```

#### 增强后布局
```
┌─────────────────┐  ┌─────────────────┐
│ 输入      [📋复制]│  │ 输出      [📋复制]│
├─────────────────┤  ├─────────────────┤
│ [textarea]      │  │ [textarea]      │
│                 │  │                 │
│ 10 行 | 245 字符│  │ 12 行 | 312 字符│
└─────────────────┘  └─────────────────┘
```

### 2. 复制按钮设计

#### 位置选项

**方案 A: 面板标题栏右侧(推荐)**
```
┌────────────────────────────┐
│ 输入               [📋 复制] │
├────────────────────────────┤
```
- 优点: 不占用主要内容区,视觉清晰
- 缺点: 需要移动鼠标到顶部
- 适用: 桌面应用场景

**方案 B: 面板底部右侧**
```
├────────────────────────────┤
│ 10 行 | 245 字符   [📋 复制] │
└────────────────────────────┘
```
- 优点: 靠近状态栏,逻辑统一
- 缺点: 可能与统计信息混淆
- 适用: 移动端优先场景

**最终选择: 方案 A (标题栏右侧)**

#### 按钮状态

1. **默认状态**
   - 图标: 📋 或复制图标
   - 文字: "复制"
   - 颜色: 中性灰色

2. **悬停状态**
   - 背景: 浅色高亮
   - 光标: pointer
   - 工具提示: "复制到剪贴板 (Cmd+Shift+I)"

3. **复制中状态** (可选)
   - 图标: ⏳ 或加载动画
   - 禁用点击
   - 持续时间: < 100ms (通常不可见)

4. **成功状态** (临时)
   - 图标: ✓ 或 "已复制"
   - 颜色: 绿色
   - 持续时间: 2 秒后恢复默认

5. **失败状态** (临时)
   - 图标: ✗
   - 颜色: 红色
   - 工具提示: 显示错误原因
   - 持续时间: 3 秒后恢复默认

### 3. 用户反馈机制

#### 方案对比

**Toast 通知** (推荐)
```
┌─────────────────────┐
│ ✓ 已复制到剪贴板    │
└─────────────────────┘
```
- 优点: 不干扰布局,标准交互模式
- 缺点: 需要额外组件
- 实现: 简单的绝对定位 div + 动画

**按钮状态变化** (备选)
- 优点: 无需额外组件
- 缺点: 用户可能错过反馈
- 实现: 修改按钮图标和文字

**最终选择: 按钮状态变化 + Toast 通知(可选)**
- MVP 阶段: 仅使用按钮状态变化
- 未来增强: 添加 Toast 通知

---

## 🏗️ 技术实现

### 1. Tauri 剪贴板 API

#### writeText 命令

Tauri 提供了内置的剪贴板 API:

```typescript
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

// 写入文本到剪贴板
await writeText('复制的内容')
```

#### 权限配置

在 `src-tauri/tauri.conf.json` 中配置权限:

```json
{
  "plugins": {
    "clipboard-manager": {
      "all": false,
      "writeText": true,
      "readText": false
    }
  }
}
```

**权限说明**:
- `writeText`: 允许写入文本到剪贴板
- `readText`: 允许读取剪贴板内容(本任务不需要)
- `all`: 允许所有剪贴板操作(出于安全考虑设为 false)

### 2. 前端实现

#### 剪贴板服务封装

创建 `src/services/clipboardService.ts`:

```typescript
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

export interface CopyResult {
  success: boolean
  error?: string
}

class ClipboardService {
  /**
   * 复制文本到剪贴板
   */
  async copyToClipboard(text: string): Promise<CopyResult> {
    if (!text) {
      return {
        success: false,
        error: '内容为空,无法复制',
      }
    }

    try {
      await writeText(text)
      return { success: true }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)

      // 尝试回退到原生 Clipboard API
      return this.fallbackCopy(text)
    }
  }

  /**
   * 回退方案: 使用浏览器原生 Clipboard API
   */
  private async fallbackCopy(text: string): Promise<CopyResult> {
    try {
      await navigator.clipboard.writeText(text)
      return { success: true }
    } catch (error) {
      console.error('Fallback copy failed:', error)
      return {
        success: false,
        error: '复制失败,请检查剪贴板权限',
      }
    }
  }
}

export const clipboardService = new ClipboardService()
```

**设计要点**:
1. **错误处理**: 捕获所有可能的异常
2. **回退机制**: Tauri API 失败时使用浏览器 API
3. **空值检查**: 防止复制空内容
4. **类型安全**: 使用 TypeScript 接口

#### useCopyToClipboard Hook

创建 `src/hooks/useCopyToClipboard.ts`:

```typescript
import { useState, useCallback } from 'react'
import { clipboardService } from '../services/clipboardService'

type CopyState = 'idle' | 'copying' | 'success' | 'error'

export interface UseCopyToClipboardResult {
  copyState: CopyState
  copyToClipboard: (text: string) => Promise<void>
  resetCopyState: () => void
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const copyToClipboard = useCallback(async (text: string) => {
    setCopyState('copying')

    const result = await clipboardService.copyToClipboard(text)

    if (result.success) {
      setCopyState('success')

      // 2 秒后重置状态
      setTimeout(() => {
        setCopyState('idle')
      }, 2000)
    } else {
      setCopyState('error')

      // 3 秒后重置状态
      setTimeout(() => {
        setCopyState('idle')
      }, 3000)
    }
  }, [])

  const resetCopyState = useCallback(() => {
    setCopyState('idle')
  }, [])

  return {
    copyState,
    copyToClipboard,
    resetCopyState,
  }
}
```

**Hook 特性**:
- 管理复制状态 (idle/copying/success/error)
- 自动重置状态 (成功后 2 秒,失败后 3 秒)
- 提供手动重置函数

### 3. 组件集成

#### JsonPanel 组件增强

修改 `src/components/JsonPanel.tsx`:

```typescript
interface JsonPanelProps {
  title: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  error?: string
  errorLocation?: ErrorLocation
  isStale?: boolean
  staleMessage?: string
  lineCount?: number
  charCount?: number
  onCopy?: () => void  // 新增: 复制回调
  copyState?: 'idle' | 'copying' | 'success' | 'error'  // 新增: 复制状态
}

export function JsonPanel({
  title,
  value,
  onCopy,
  copyState = 'idle',
  // ... 其他 props
}: JsonPanelProps) {
  // 复制按钮渲染
  const renderCopyButton = () => {
    if (!onCopy) return null

    const getCopyButtonContent = () => {
      switch (copyState) {
        case 'copying':
          return '⏳ 复制中...'
        case 'success':
          return '✓ 已复制'
        case 'error':
          return '✗ 失败'
        default:
          return '📋 复制'
      }
    }

    return (
      <button
        className={`copy-button copy-button-${copyState}`}
        onClick={onCopy}
        disabled={copyState === 'copying' || !value}
        title="复制到剪贴板"
      >
        {getCopyButtonContent()}
      </button>
    )
  }

  return (
    <div className="json-panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {renderCopyButton()}
      </div>
      {/* ... 其他内容 */}
    </div>
  )
}
```

#### App.tsx 集成

修改 `src/App.tsx`:

```typescript
import { useCopyToClipboard } from './hooks/useCopyToClipboard'

function App() {
  // ... 现有状态

  // 输入复制
  const {
    copyState: inputCopyState,
    copyToClipboard: copyInput,
  } = useCopyToClipboard()

  // 输出复制
  const {
    copyState: outputCopyState,
    copyToClipboard: copyOutput,
  } = useCopyToClipboard()

  const handleCopyInput = useCallback(async () => {
    await copyInput(inputJson)
  }, [inputJson, copyInput])

  const handleCopyOutput = useCallback(async () => {
    await copyOutput(outputState.value)
  }, [outputState.value, copyOutput])

  return (
    <div className="app">
      {/* ... */}
      <JsonPanel
        title="输入"
        value={inputJson}
        onCopy={handleCopyInput}
        copyState={inputCopyState}
        {/* ... 其他 props */}
      />

      <JsonPanel
        title="输出"
        value={outputState.value}
        onCopy={handleCopyOutput}
        copyState={outputCopyState}
        {/* ... 其他 props */}
      />
    </div>
  )
}
```

### 4. 键盘快捷键实现

#### useKeyboardShortcuts Hook

创建 `src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  metaKey?: boolean  // Cmd on macOS, Ctrl on Windows/Linux
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.metaKey === undefined ||
                         shortcut.metaKey === (event.metaKey || event.ctrlKey)
        const ctrlMatch = shortcut.ctrlKey === undefined ||
                         shortcut.ctrlKey === event.ctrlKey
        const shiftMatch = shortcut.shiftKey === undefined ||
                          shortcut.shiftKey === event.shiftKey
        const altMatch = shortcut.altKey === undefined ||
                        shortcut.altKey === event.altKey
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
```

#### App.tsx 快捷键集成

```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  // ... 现有代码

  // 注册键盘快捷键
  useKeyboardShortcuts([
    {
      key: 'i',
      metaKey: true,
      shiftKey: true,
      handler: handleCopyInput,
    },
    {
      key: 'o',
      metaKey: true,
      shiftKey: true,
      handler: handleCopyOutput,
    },
  ])

  // ...
}
```

### 5. 样式实现

#### CSS 样式

添加到 `src/styles.css`:

```css
/* 复制按钮样式 */
.copy-button {
  padding: 4px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-button:hover:not(:disabled) {
  background-color: var(--hover-bg-color);
  border-color: var(--primary-color);
}

.copy-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 复制状态样式 */
.copy-button-success {
  color: var(--success-color);
  border-color: var(--success-color);
}

.copy-button-error {
  color: var(--error-color);
  border-color: var(--error-color);
}

.copy-button-copying {
  opacity: 0.7;
}

/* 面板标题栏布局 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
```

---

## 📁 文件清单

### 新增文件

1. **`src/services/clipboardService.ts`**
   - 剪贴板服务封装
   - Tauri API 调用
   - 回退机制实现

2. **`src/hooks/useCopyToClipboard.ts`**
   - 复制状态管理 Hook
   - 自动重置逻辑
   - 错误处理

3. **`src/hooks/useKeyboardShortcuts.ts`**
   - 键盘快捷键 Hook
   - 跨平台按键处理
   - 事件监听管理

### 修改文件

1. **`src-tauri/tauri.conf.json`**
   - 添加剪贴板插件权限配置

2. **`src-tauri/Cargo.toml`**
   - 添加 `tauri-plugin-clipboard-manager` 依赖

3. **`src/components/JsonPanel.tsx`**
   - 添加 `onCopy` prop
   - 添加 `copyState` prop
   - 渲染复制按钮
   - 更新面板标题栏布局

4. **`src/App.tsx`**
   - 导入 `useCopyToClipboard` Hook
   - 导入 `useKeyboardShortcuts` Hook
   - 实现 `handleCopyInput` 函数
   - 实现 `handleCopyOutput` 函数
   - 注册键盘快捷键
   - 传递复制相关 props 给 JsonPanel

5. **`src/styles.css`**
   - 添加复制按钮样式
   - 添加复制状态样式
   - 更新面板标题栏布局

### 依赖添加

1. **package.json**
   ```json
   {
     "dependencies": {
       "@tauri-apps/plugin-clipboard-manager": "^2.0.0"
     }
   }
   ```

2. **Cargo.toml**
   ```toml
   [dependencies]
   tauri-plugin-clipboard-manager = "2.0"
   ```

---

## 🔄 用户流程

### 流程 1: 复制输入内容

```
用户在输入面板输入 JSON
    ↓
点击输入面板的"复制"按钮
    ↓
调用 clipboardService.copyToClipboard(inputJson)
    ↓
Tauri API 写入剪贴板
    ↓
按钮显示"✓ 已复制" (2秒)
    ↓
自动恢复为"📋 复制"
```

### 流程 2: 复制输出内容

```
用户格式化 JSON 后
    ↓
输出面板显示格式化结果
    ↓
点击输出面板的"复制"按钮
    ↓
调用 clipboardService.copyToClipboard(outputJson)
    ↓
Tauri API 写入剪贴板
    ↓
按钮显示"✓ 已复制" (2秒)
    ↓
自动恢复为"📋 复制"
```

### 流程 3: 使用键盘快捷键

```
用户按下 Cmd/Ctrl + Shift + I
    ↓
useKeyboardShortcuts 捕获按键事件
    ↓
调用 handleCopyInput()
    ↓
复制输入内容到剪贴板
    ↓
按钮显示"✓ 已复制"反馈
```

### 流程 4: 复制失败处理

```
用户点击复制按钮
    ↓
Tauri API 调用失败
    ↓
回退到浏览器 Clipboard API
    ↓
浏览器 API 也失败
    ↓
按钮显示"✗ 失败" (3秒)
    ↓
控制台输出错误日志
    ↓
自动恢复为"📋 复制"
```

---

## 🧪 测试计划

### 功能测试

- [ ] 复制输入按钮正确复制输入内容
- [ ] 复制输出按钮正确复制输出内容
- [ ] 输入为空时禁用复制按钮
- [ ] 输出为空时禁用复制按钮
- [ ] 复制成功后显示"✓ 已复制"
- [ ] 复制失败后显示"✗ 失败"
- [ ] 状态自动重置 (成功 2 秒,失败 3 秒)

### 键盘快捷键测试

- [ ] Cmd+Shift+I (macOS) 复制输入
- [ ] Ctrl+Shift+I (Windows/Linux) 复制输入
- [ ] Cmd+Shift+O (macOS) 复制输出
- [ ] Ctrl+Shift+O (Windows/Linux) 复制输出
- [ ] 快捷键不与系统快捷键冲突
- [ ] 按钮禁用时快捷键也应禁用

### 权限测试

- [ ] 剪贴板权限正常授予时工作正常
- [ ] 剪贴板权限被拒绝时回退到浏览器 API
- [ ] 两种 API 都失败时显示错误提示
- [ ] macOS 上权限请求正常显示

### 边界情况测试

- [ ] 复制空字符串
- [ ] 复制超大文本 (5MB)
- [ ] 连续快速点击复制按钮
- [ ] 复制包含特殊字符的 JSON
- [ ] 复制包含 Unicode 字符的 JSON

### 兼容性测试

- [ ] macOS 剪贴板工作正常
- [ ] Windows 剪贴板工作正常(未来)
- [ ] Linux 剪贴板工作正常(未来)
- [ ] 不同浏览器内核的 Tauri 应用

---

## ⚠️ 注意事项

### 1. 安全性考虑

- **剪贴板权限**:
  - 仅请求 `writeText` 权限,不读取剪贴板
  - 遵循最小权限原则

- **数据隐私**:
  - 不记录复制的内容
  - 不发送到远程服务器

### 2. 用户体验

- **即时反馈**:
  - 复制操作应在 100ms 内完成
  - 立即显示视觉反馈

- **状态清晰**:
  - 成功/失败状态明显区分
  - 自动重置避免混淆

- **禁用状态**:
  - 内容为空时禁用复制按钮
  - 正在处理时禁用按钮

### 3. 性能优化

- **大文本处理**:
  - 剪贴板 API 是异步的,不阻塞 UI
  - 超大文本 (>5MB) 可能需要加载提示

- **内存管理**:
  - 不重复存储文本副本
  - 直接传递引用

### 4. 跨平台兼容性

- **按键映射**:
  - macOS: Cmd + Shift + I/O
  - Windows/Linux: Ctrl + Shift + I/O
  - 使用 `metaKey` 自动适配

- **剪贴板行为**:
  - 不同 OS 的换行符处理
  - 特殊字符编码

### 5. 回退机制

- **Tauri API 失败**:
  - 自动尝试浏览器 Clipboard API
  - 两者都失败时显示错误

- **浏览器兼容性**:
  - 优先使用 Tauri API
  - 浏览器 API 作为备选

---

## 📊 验收检查清单

开发完成后,按以下清单逐项检查:

- [ ] ✅ 输入面板显示复制按钮
- [ ] ✅ 输出面板显示复制按钮
- [ ] ✅ 复制输入按钮正确工作
- [ ] ✅ 复制输出按钮正确工作
- [ ] ✅ 复制成功后显示"✓ 已复制"
- [ ] ✅ 2 秒后状态自动重置
- [ ] ✅ 复制失败显示"✗ 失败"
- [ ] ✅ 3 秒后失败状态重置
- [ ] ✅ 内容为空时按钮禁用
- [ ] ✅ Cmd/Ctrl + Shift + I 复制输入
- [ ] ✅ Cmd/Ctrl + Shift + O 复制输出
- [ ] ✅ 快捷键在 macOS 上正常工作
- [ ] ✅ 剪贴板权限正确配置
- [ ] ✅ Tauri API 正常工作
- [ ] ✅ 回退到浏览器 API 正常工作
- [ ] ✅ 复制大文本 (5MB) 不卡顿
- [ ] ✅ 样式与现有 UI 一致
- [ ] ✅ 按钮悬停有视觉反馈
- [ ] ✅ 无控制台错误或警告

---

## 🚀 实施步骤

### Phase 1: 依赖配置 (15 分钟)

1. 安装 `@tauri-apps/plugin-clipboard-manager`
2. 配置 `tauri.conf.json` 权限
3. 添加 Rust 依赖
4. 测试 Tauri API 可用性

### Phase 2: 剪贴板服务 (30 分钟)

1. 创建 `clipboardService.ts`
2. 实现 `copyToClipboard` 方法
3. 实现回退机制
4. 添加错误处理
5. 单元测试

### Phase 3: Hooks 实现 (45 分钟)

1. 创建 `useCopyToClipboard.ts`
   - 状态管理
   - 自动重置逻辑

2. 创建 `useKeyboardShortcuts.ts`
   - 事件监听
   - 跨平台按键处理
   - 快捷键匹配

### Phase 4: UI 组件集成 (60 分钟)

1. 修改 `JsonPanel.tsx`
   - 添加复制按钮
   - 添加 props
   - 状态显示

2. 修改 `App.tsx`
   - 导入 Hooks
   - 实现复制处理函数
   - 注册快捷键
   - 传递 props

3. 添加 CSS 样式
   - 按钮样式
   - 状态样式
   - 响应式调整

### Phase 5: 测试与优化 (30 分钟)

1. 功能测试
2. 快捷键测试
3. 边界情况测试
4. 性能测试
5. UI/UX 优化

**预计总时长**: 3 小时

---

## 📝 补充说明

### 与其他任务的关联

- **Task 4**: 依赖 JsonPanel 组件
- **Task 9**: 文件导出可能也使用剪贴板服务
- **Task 11**: 键盘快捷键系统的基础

### 未来增强

1. **高级剪贴板功能**
   - 剪贴板历史记录
   - 复制为不同格式 (XML, YAML)
   - 富文本复制

2. **快捷键增强**
   - 自定义快捷键配置
   - 快捷键冲突检测
   - 快捷键帮助面板

3. **用户反馈增强**
   - Toast 通知
   - 音效反馈
   - 复制统计

### 技术债务

- **MVP 限制**:
  - 仅支持纯文本复制
  - 不支持复制为 HTML/RTF

- **备选方案**:
  - 如果 Tauri API 问题,可完全回退到浏览器 API

---

## 🎯 核心价值

### 1. 提升效率
- 一键复制,无需手动选择文本
- 键盘快捷键快速操作

### 2. 降低错误
- 复制格式化后的 JSON,避免手动选择遗漏
- 即时反馈确认操作成功

### 3. 改善体验
- 符合用户预期的交互模式
- 跨平台一致的操作体验

---

**文档版本**: 1.0
**审核状态**: 待审核
**预计开始**: 2025-10-24
