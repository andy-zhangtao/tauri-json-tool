# Task 11: 键盘快捷键 - 设计文档

## 概述

为 JSON Formatter & Validator 应用实现完整的键盘快捷键系统，包括所有主要操作的快捷键映射、应用内帮助文档、以及 macOS 平台兼容性。

## 需求分析

### 验收标准

1. ✅ **快捷键列表在应用内记录** - 通过工具提示和帮助视图
2. ✅ **即使按钮未聚焦，快捷键也会触发相应的操作** - 全局监听
3. ✅ **快捷键遵循操作系统约定，不与默认系统绑定冲突** - 使用 Cmd+Shift 组合避免冲突

## 技术设计

### 1. 快捷键配置系统

创建集中化的快捷键配置文件 `types/shortcuts.ts`，定义：

- **快捷键动作类型**: `ShortcutAction` 枚举
- **快捷键定义**: `ShortcutDefinition` 接口
- **平台检测**: `isMacOS()` 函数
- **显示文本生成**: `getShortcutText()` 函数
- **分类管理**: 按功能分组（编辑、格式化、文件、帮助）

#### 快捷键映射表

| 动作 | 快捷键 (macOS) | 快捷键 (Windows/Linux) | 分类 | 功能描述 |
|------|---------------|----------------------|------|---------|
| 验证 | ⌘⇧V | Ctrl+Shift+V | 编辑 | 验证 JSON |
| 格式化 | ⌘⇧F | Ctrl+Shift+F | 格式化 | 格式化 JSON |
| 压缩 | ⌘⇧M | Ctrl+Shift+M | 格式化 | 压缩 JSON |
| 清除 | ⌘⇧K | Ctrl+Shift+K | 编辑 | 清除输入 |
| 导入 | ⌘⌥I | Ctrl+Alt+I | 文件 | 导入文件 |
| 导出 | ⌘⇧E | Ctrl+Shift+E | 文件 | 导出文件 |
| 复制输入 | ⌘⇧I | Ctrl+Shift+I | 编辑 | 复制输入 |
| 复制输出 | ⌘⇧O | Ctrl+Shift+O | 编辑 | 复制输出 |
| 帮助 | ⌘/ | Ctrl+/ | 帮助 | 显示快捷键 |

### 2. 快捷键实现

#### 扩展现有的 `useKeyboardShortcuts` Hook

现有的 Hook 已经非常完善，支持：
- 跨平台修饰键检测（metaKey 自动映射到 Cmd/Ctrl）
- 输入框内外的智能处理
- 事件冒泡控制

在 `App.tsx` 中注册所有快捷键：

```typescript
useKeyboardShortcuts([
  // 验证
  { key: 'v', metaKey: true, shiftKey: true, handler: handleValidate },
  // 格式化
  { key: 'f', metaKey: true, shiftKey: true, handler: handleFormat },
  // 压缩
  { key: 'm', metaKey: true, shiftKey: true, handler: handleMinify },
  // 清除
  { key: 'k', metaKey: true, shiftKey: true, handler: handleClear },
  // 导入
  { key: 'i', metaKey: true, altKey: true, handler: handleImport },
  // 导出
  { key: 'e', metaKey: true, shiftKey: true, handler: handleExport },
  // 复制输入
  { key: 'i', metaKey: true, shiftKey: true, handler: handleCopyInput },
  // 复制输出
  { key: 'o', metaKey: true, shiftKey: true, handler: handleCopyOutput },
  // 帮助
  { key: '/', metaKey: true, handler: () => setShowShortcutsHelp(true) },
])
```

### 3. 快捷键帮助系统

#### ShortcutsHelp 组件

模态对话框组件，显示所有可用快捷键：

**功能特性**:
- 按分类分组显示（编辑、格式化、文件、帮助）
- 自动检测平台并显示正确的修饰键符号（⌘/Ctrl）
- 精美的视觉设计（动画、悬停效果）
- ESC 键或点击遮罩关闭
- 响应式设计（移动端友好）

**UI 结构**:
```
┌─────────────────────────────────────────────┐
│  键盘快捷键                            [✕]  │
├─────────────────────────────────────────────┤
│  编辑操作                                   │
│  ┌────────────────────────────────────────┐ │
│  │ 验证 JSON             [⌘⇧V]           │ │
│  │ 清除输入              [⌘⇧K]           │ │
│  │ 复制输入              [⌘⇧I]           │ │
│  │ 复制输出              [⌘⇧O]           │ │
│  └────────────────────────────────────────┘ │
│  格式化                                     │
│  ┌────────────────────────────────────────┐ │
│  │ 格式化 JSON           [⌘⇧F]           │ │
│  │ 压缩 JSON             [⌘⇧M]           │ │
│  └────────────────────────────────────────┘ │
│  ...                                        │
├─────────────────────────────────────────────┤
│  提示: 按 ⌘/ 或 Ctrl/ 可随时打开此帮助面板  │
└─────────────────────────────────────────────┘
```

#### 工具栏按钮提示

为所有 Toolbar 按钮添加 `title` 属性，显示快捷键提示：
- "验证 JSON 格式 (⌘⇧V)"
- "美化 JSON (⌘⇧F)"
- "压缩 JSON (⌘⇧M)"
- 等等

#### 帮助按钮

在 Toolbar 右侧添加 `?` 图标按钮，点击打开快捷键帮助对话框。

### 4. 样式设计

#### 帮助按钮样式

```css
.btn-icon {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  /* 悬停效果与主题切换按钮一致 */
}
```

#### 帮助对话框样式

```css
.shortcuts-help-overlay {
  /* 半透明黑色遮罩 */
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  /* fadeIn 动画 */
}

.shortcuts-help-dialog {
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  /* slideUp 动画 */
}

.shortcut-keys {
  /* 等宽字体显示快捷键 */
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
}
```

### 5. 平台兼容性

#### macOS 特性

- 使用 ⌘ (Command) 键作为主修饰键
- 使用 macOS 符号: ⌘ (Command), ⌥ (Option), ⇧ (Shift), ⌃ (Control)
- 避免与系统快捷键冲突:
  - ⌘C/V/X/A (系统剪贴板和选择)
  - ⌘Q (退出应用)
  - ⌘W (关闭窗口)
  - ⌘M (最小化)
  - ⌘H (隐藏)

#### Windows/Linux 特性

- 使用 Ctrl 键作为主修饰键
- 使用文本表示: Ctrl, Alt, Shift
- 快捷键组合用 `+` 连接: `Ctrl+Shift+V`

#### 跨平台检测

```typescript
export const isMacOS = (): boolean => {
  return navigator.platform.toLowerCase().includes('mac')
}
```

### 6. 冲突避免策略

1. **使用 Shift 组合键**: 大部分快捷键使用 Cmd/Ctrl + Shift 组合，避免与单修饰键冲突
2. **导入使用 Alt/Option**: ⌘⌥I / Ctrl+Alt+I，与复制输入区分
3. **输入框智能处理**:
   - 复制快捷键（⌘⇧I/O）在输入框内也能工作
   - 其他快捷键在输入框内被忽略
4. **测试覆盖**: 手动测试所有快捷键，确保无冲突

## 文件结构

```
src/
├── types/
│   └── shortcuts.ts           # 快捷键配置和类型定义 (新增)
├── hooks/
│   └── useKeyboardShortcuts.ts # 快捷键 Hook (已存在，无需修改)
├── components/
│   ├── ShortcutsHelp.tsx      # 快捷键帮助对话框 (新增)
│   └── Toolbar.tsx            # 更新: 添加帮助按钮和 title 提示
├── App.tsx                    # 更新: 注册所有快捷键
└── styles.css                 # 更新: 添加帮助对话框样式
```

## 实现步骤

1. ✅ 创建 `types/shortcuts.ts` - 快捷键配置
2. ✅ 扩展 `App.tsx` - 注册所有快捷键
3. ✅ 创建 `ShortcutsHelp.tsx` - 帮助对话框组件
4. ✅ 更新 `Toolbar.tsx` - 添加帮助按钮和 title 提示
5. ✅ 更新 `styles.css` - 添加样式
6. ✅ 测试所有快捷键

## 测试计划

### 功能测试

| 测试项 | 快捷键 | 预期行为 | 状态 |
|-------|--------|---------|------|
| 验证 JSON | ⌘⇧V | 触发验证功能 | ✅ |
| 格式化 JSON | ⌘⇧F | 触发格式化功能 | ✅ |
| 压缩 JSON | ⌘⇧M | 触发压缩功能 | ✅ |
| 清除输入 | ⌘⇧K | 显示确认对话框并清除 | ✅ |
| 导入文件 | ⌘⌥I | 打开文件选择对话框 | ✅ |
| 导出文件 | ⌘⇧E | 打开保存对话框 | ✅ |
| 复制输入 | ⌘⇧I | 复制输入内容到剪贴板 | ✅ |
| 复制输出 | ⌘⇧O | 复制输出内容到剪贴板 | ✅ |
| 显示帮助 | ⌘/ | 打开快捷键帮助对话框 | ✅ |
| 帮助按钮 | 点击 ? | 打开快捷键帮助对话框 | ✅ |

### 冲突测试

| 测试场景 | 预期行为 | 状态 |
|---------|---------|------|
| 在 textarea 中按 ⌘⇧I | 复制全部输入（而非选中文本） | ✅ |
| 在 textarea 中按 ⌘C | 使用系统默认复制（复制选中文本） | ✅ |
| 在 textarea 中按 ⌘V | 使用系统默认粘贴 | ✅ |
| 焦点在按钮上按 ⌘⇧F | 触发格式化（而非按钮默认行为） | ✅ |

### 可访问性测试

| 测试项 | 预期行为 | 状态 |
|-------|---------|------|
| 工具提示显示 | 悬停按钮显示快捷键提示 | ✅ |
| 帮助对话框 | 支持 ESC 键关闭 | ✅ |
| 键盘导航 | 所有快捷键无需鼠标即可使用 | ✅ |
| 屏幕阅读器 | 按钮有 aria-label | ✅ |

## 性能考虑

1. **事件监听优化**:
   - 单一全局 `keydown` 事件监听器
   - 使用 `useEffect` 依赖项优化重新注册

2. **快捷键匹配**:
   - O(n) 时间复杂度，n 为快捷键数量（9个）
   - 使用 `break` 提前退出循环

3. **帮助对话框**:
   - 懒加载（仅在 `isOpen=true` 时渲染）
   - CSS 动画（GPU 加速）

## 潜在改进

1. **自定义快捷键**: 允许用户自定义快捷键（未来功能）
2. **快捷键录制**: 可视化快捷键录制界面
3. **快捷键冲突检测**: 自动检测并提示冲突
4. **多语言支持**: 快捷键描述的国际化

## 依赖项

- **React Hooks**: `useState`, `useEffect`, `useCallback`
- **现有组件**: `Toolbar`, `JsonPanel`
- **现有 Hooks**: `useKeyboardShortcuts`, `useCopyToClipboard`
- **无新增外部依赖**

## 浏览器兼容性

- ✅ Chrome/Edge (Chromium)
- ✅ Safari (macOS)
- ✅ Firefox
- ⚠️ 移动浏览器（快捷键不适用）

## 总结

Task 11 实现了一个完整、可扩展的键盘快捷键系统，涵盖所有主要操作，提供应用内帮助文档，遵循平台约定，确保无冲突和可访问性。通过集中化配置和可复用组件，系统易于维护和扩展。
