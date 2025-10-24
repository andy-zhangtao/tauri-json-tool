# Task 6: Error Highlighting & Messaging - 设计文档

> **任务名称**: 错误高亮与消息
> **创建时间**: 2025-10-24
> **状态**: 设计中

---

## 📋 需求分析

### 功能描述

显示详细的错误反馈,包括突出显示无效的 JSON 片段,并在问题解决之前保留先前的有效输出。

### 验收标准

1. **错误消息包含行/列信息(如果可用)**
   - 解析错误时显示精确的行号和列号
   - 错误消息格式清晰易读
   - 支持不同类型的错误(语法错误、结构错误等)

2. **输入视图突出显示与错误关联的区域**
   - 错误所在行高亮显示
   - 错误列位置用下划线或背景色标记
   - 支持滚动到错误位置
   - 视觉上明显但不刺眼

3. **在错误期间,先前的格式化输出保持可见但标记为过时**
   - 输出区域显示上次成功的结果
   - 添加"过时"标记或半透明遮罩
   - 提示用户当前输出不是最新状态

---

## 🎨 UI/UX 设计

### 1. 错误消息增强

#### 当前状态
```
⚠ 错误: 缺少逗号分隔符 (第 3 行, 第 12 列)
```

#### 增强后设计
```
┌─────────────────────────────────────────────────┐
│ ⚠ JSON 解析错误                                 │
│                                                 │
│ 错误类型: 语法错误                               │
│ 错误信息: Expected comma or closing bracket     │
│ 错误位置: 第 3 行, 第 12 列                      │
│                                                 │
│ > 2 |   "name": "John"                          │
│ > 3 |   "age": 30          ← 错误在这里          │
│ > 4 | }                                          │
│                                                 │
│ 建议: 在 "John" 后添加逗号                       │
└─────────────────────────────────────────────────┘
```

### 2. 输入区域错误高亮

#### 方案对比

**方案 A: 整行高亮(推荐)**
- 优点: 实现简单,兼容性好,视觉明显
- 缺点: 精度较低,长行可能不明显
- 实现: 使用 `background-color` 高亮错误行

**方案 B: 精确列高亮**
- 优点: 精准定位错误字符
- 缺点: 需要富文本编辑器或自定义渲染
- 实现: 使用 Monaco Editor / CodeMirror

**方案 C: 行号标记 + 行高亮(推荐)**
- 优点: 平衡精度和实现复杂度
- 缺点: 需要实现行号显示
- 实现: 自定义行号组件 + CSS 高亮

#### 最终选择: 方案 A (MVP) + 方案 C (未来增强)

**MVP 实现(方案 A)**:
- 使用 `::before` 伪元素在 textarea 上叠加高亮层
- 计算错误行的位置并绘制背景色
- 简单高效,无需引入第三方库

**未来增强(方案 C)**:
- 引入 Monaco Editor 或 CodeMirror
- 支持语法高亮、代码折叠等高级功能

### 3. 输出区域"过时"状态

#### 视觉设计
```
┌─────────────────────────────────┐
│ 输出                      ⚠过时 │
├─────────────────────────────────┤
│ {                               │
│   "name": "John",               │
│   "age": 30                     │  ← 半透明遮罩(opacity: 0.6)
│ }                               │
│                                 │
│ ⓘ 此输出基于之前的有效输入       │
└─────────────────────────────────┘
```

#### 状态标识
- 标题栏添加 "⚠ 过时" 标记
- 输出内容添加半透明遮罩
- 底部添加提示信息
- 使用黄色/橙色强调过时状态

---

## 🏗️ 技术实现

### 1. 数据结构设计

#### 扩展 ValidationResult 类型
```typescript
export type ValidationResult =
  | {
      type: 'Success'
      data: unknown
      size: number
    }
  | {
      type: 'Error'
      message: string
      line?: number
      column?: number
      context?: ErrorContext  // 新增:错误上下文
    }

// 错误上下文
export interface ErrorContext {
  beforeLines: string[]  // 错误前几行
  errorLine: string      // 错误所在行
  afterLines: string[]   // 错误后几行
  errorChar?: string     // 错误字符
  suggestion?: string    // 修复建议
}
```

#### 输出状态管理
```typescript
interface OutputState {
  value: string
  isStale: boolean      // 是否过时
  lastValidTime?: Date  // 最后有效时间
}
```

### 2. 错误高亮实现(MVP)

#### 方案: CSS 背景高亮

由于 `<textarea>` 无法直接高亮文本,我们使用叠加层方案:

```typescript
interface ErrorHighlight {
  line: number
  column?: number
  length?: number
}

// 计算错误行的像素位置
function calculateErrorLinePosition(
  textarea: HTMLTextAreaElement,
  lineNumber: number
): { top: number; height: number } {
  const lines = textarea.value.split('\n')
  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight)

  return {
    top: (lineNumber - 1) * lineHeight,
    height: lineHeight,
  }
}
```

#### 高亮组件结构
```tsx
<div className="json-input-container">
  <div className="error-highlight-layer">
    {errorLine && (
      <div
        className="error-highlight"
        style={{ top: errorTop, height: lineHeight }}
      />
    )}
  </div>
  <textarea className="json-textarea" />
</div>
```

### 3. 错误消息组件

#### ErrorMessage 组件
```tsx
interface ErrorMessageProps {
  error: {
    message: string
    line?: number
    column?: number
    context?: ErrorContext
  }
  onJumpToError?: () => void
}

export function ErrorMessage({ error, onJumpToError }: ErrorMessageProps) {
  return (
    <div className="error-message-panel">
      <div className="error-header">
        <span className="error-icon">⚠</span>
        <span className="error-title">JSON 解析错误</span>
      </div>

      <div className="error-body">
        <div className="error-detail">
          <strong>错误信息:</strong> {error.message}
        </div>

        {error.line && (
          <div className="error-location">
            <strong>错误位置:</strong> 第 {error.line} 行
            {error.column && `, 第 ${error.column} 列`}
            <button onClick={onJumpToError}>跳转</button>
          </div>
        )}

        {error.context && (
          <div className="error-context">
            <CodeSnippet context={error.context} />
          </div>
        )}
      </div>
    </div>
  )
}
```

### 4. 输出过时状态

#### App.tsx 状态管理
```typescript
const [outputState, setOutputState] = useState<OutputState>({
  value: '',
  isStale: false,
})

// 验证成功时更新输出
const handleValidateSuccess = (result: SuccessResult) => {
  setOutputState({
    value: JSON.stringify(result.data, null, 2),
    isStale: false,
    lastValidTime: new Date(),
  })
}

// 验证失败时标记输出为过时
const handleValidateError = (error: ErrorResult) => {
  if (outputState.value) {
    setOutputState({
      ...outputState,
      isStale: true,
    })
  }
  setErrorMessage(error.message)
  setErrorLocation({ line: error.line, column: error.column })
}
```

#### JsonPanel 支持过时状态
```tsx
<JsonPanel
  title="输出"
  value={outputState.value}
  readOnly
  isStale={outputState.isStale}  // 新增 prop
  staleMessage="此输出基于之前的有效输入"
/>
```

---

## 📁 文件变更清单

### 新增文件

1. **`src/components/ErrorMessage.tsx`**
   - 详细错误消息组件
   - 支持显示错误上下文
   - 提供跳转到错误位置功能

2. **`src/components/CodeSnippet.tsx`**
   - 代码片段显示组件
   - 高亮错误行
   - 显示行号

3. **`src/hooks/useErrorHighlight.ts`**
   - 错误高亮逻辑 Hook
   - 计算错误位置
   - 滚动到错误行

4. **`src/utils/errorParser.ts`**
   - 解析后端错误信息
   - 提取上下文信息
   - 生成修复建议

### 修改文件

1. **`src/types/validation.ts`**
   - 添加 `ErrorContext` 接口
   - 扩展 `ValidationResult` 类型

2. **`src/App.tsx`**
   - 添加 `outputState` 状态管理
   - 添加 `errorLocation` 状态
   - 实现输出过时逻辑
   - 集成错误高亮

3. **`src/components/JsonPanel.tsx`**
   - 添加 `isStale` prop
   - 添加 `errorLine` prop
   - 添加 `onScrollToError` prop
   - 渲染错误高亮层
   - 显示过时标记

4. **`src/styles.css`**
   - 添加错误高亮样式 (`.error-highlight`)
   - 添加过时状态样式 (`.stale-output`)
   - 添加错误消息面板样式
   - 添加代码片段样式

---

## 🔄 用户流程

### 流程 1: 错误输入 → 高亮显示

```
用户输入错误的 JSON
    ↓
触发验证(自动或手动)
    ↓
后端返回错误信息(含行/列)
    ↓
前端解析错误位置
    ↓
在输入区域高亮错误行
    ↓
显示详细错误消息
    ↓
用户点击"跳转"按钮
    ↓
滚动到错误位置并聚焦
```

### 流程 2: 保留先前输出

```
用户已有有效输出
    ↓
修改输入导致错误
    ↓
验证失败
    ↓
输出区域标记为"过时"
    ↓
显示半透明遮罩
    ↓
底部提示"此输出基于之前的有效输入"
    ↓
用户修复错误
    ↓
验证成功
    ↓
移除"过时"标记,更新输出
```

---

## 🧪 测试计划

### 单元测试

- [ ] `calculateErrorLinePosition` 函数正确性
- [ ] `errorParser` 解析各种错误格式
- [ ] `useErrorHighlight` Hook 逻辑

### 集成测试

- [ ] 错误高亮在正确的行显示
- [ ] 跳转到错误功能正常工作
- [ ] 输出过时状态正确切换
- [ ] 错误修复后高亮消失

### UI/UX 测试

- [ ] 错误高亮颜色明显但不刺眼
- [ ] 错误消息格式清晰易读
- [ ] 过时输出视觉反馈明显
- [ ] 长文件滚动到错误位置流畅

### 边界情况测试

- [ ] 错误在第一行
- [ ] 错误在最后一行
- [ ] 错误行号超出实际行数
- [ ] 没有行号信息的错误
- [ ] 输出为空时不显示过时标记

---

## ⚠️ 注意事项

### 1. 性能优化

- **大文件处理**: 错误高亮不应影响大文件的滚动性能
- **重绘优化**: 使用 `transform` 而非 `top/left` 定位高亮层
- **防抖滚动**: 滚动到错误位置时使用平滑动画

### 2. 用户体验

- **视觉平衡**: 错误高亮不应过于醒目,避免干扰阅读
- **即时反馈**: 错误位置应立即高亮,无延迟
- **清晰提示**: 过时状态应有明确的视觉和文字提示

### 3. 兼容性考虑

- **textarea 限制**: `<textarea>` 无法直接高亮,需使用叠加层
- **字体计算**: 不同字体的行高计算可能有误差
- **滚动条影响**: 滚动条宽度可能影响位置计算

### 4. 技术债务

- **MVP 限制**: 当前方案仅支持整行高亮,未来可升级到富文本编辑器
- **备选方案**: 如果叠加层方案效果不佳,考虑引入 CodeMirror

---

## 📊 验收检查清单

开发完成后,按以下清单逐项检查:

- [ ] ✅ 错误消息显示行号和列号
- [ ] ✅ 错误消息格式清晰,包含错误类型和描述
- [ ] ✅ 输入区域错误行高亮显示
- [ ] ✅ 点击"跳转"按钮滚动到错误位置
- [ ] ✅ 输出区域在错误时标记为"过时"
- [ ] ✅ 过时输出显示半透明遮罩
- [ ] ✅ 过时输出显示提示信息
- [ ] ✅ 错误修复后高亮和过时标记消失
- [ ] ✅ 大文件(5MB)错误高亮性能良好
- [ ] ✅ 不同错误类型正确显示
- [ ] ✅ 边界情况(第一行、最后一行)正确处理

---

## 🚀 实施步骤

### Phase 1: 数据结构与工具函数 (30 分钟)

1. 扩展 `ValidationResult` 类型,添加 `ErrorContext`
2. 创建 `errorParser.ts` 解析错误信息
3. 创建 `useErrorHighlight` Hook

### Phase 2: 错误消息组件 (45 分钟)

1. 创建 `ErrorMessage.tsx` 组件
2. 创建 `CodeSnippet.tsx` 组件
3. 添加错误消息样式

### Phase 3: 输入区域错误高亮 (60 分钟)

1. 修改 `JsonPanel.tsx`,添加高亮层
2. 实现错误位置计算逻辑
3. 实现滚动到错误功能
4. 添加高亮样式

### Phase 4: 输出过时状态 (30 分钟)

1. 修改 `App.tsx`,添加 `outputState` 管理
2. 修改 `JsonPanel.tsx`,支持过时状态显示
3. 添加过时状态样式

### Phase 5: 集成与测试 (45 分钟)

1. 集成所有功能到 `App.tsx`
2. 手动测试所有场景
3. 边界情况测试
4. 性能测试
5. UI/UX 优化

**预计总时长**: 3-3.5 小时

---

## 📝 补充说明

### 与其他任务的关联

- **Task 5**: 错误高亮依赖验证状态管理
- **Task 13**: 错误统计可集成到状态指示器
- **Task 14**: 大文件性能优化需考虑高亮渲染

### 未来增强

- **富文本编辑器**: 升级到 Monaco Editor/CodeMirror
- **语法高亮**: 添加 JSON 语法高亮
- **代码折叠**: 支持大文件的代码折叠
- **多错误支持**: 同时显示多个错误位置
- **智能修复建议**: 根据错误类型提供一键修复

### 技术选型

#### MVP 阶段(当前)
- 纯 CSS 叠加层高亮
- 原生 `<textarea>` 组件
- 优点: 轻量、快速、无依赖
- 缺点: 功能有限,精度较低

#### 未来升级
- Monaco Editor (VSCode 编辑器)
- 优点: 功能强大,体验极佳
- 缺点: 包体积大(~2MB)

**决策依据**: MVP 优先,未来根据用户反馈决定是否升级

---

## 🎯 核心价值

### 1. 即时反馈
- 用户输入错误立即看到高亮标记
- 无需猜测错误位置

### 2. 降低认知负担
- 错误消息清晰易懂
- 上下文信息帮助理解问题
- 修复建议减少试错时间

### 3. 保留工作成果
- 错误不清空之前的有效输出
- 用户可对比修改前后差异
- 提升工具容错性

---

**文档版本**: 1.0
**审核状态**: 待审核
**预计开始**: 2025-10-24
