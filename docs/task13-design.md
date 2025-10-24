# Task 13: 负载指标与状态指示器 - 设计文档

## 概述

为 JSON Formatter & Validator 应用实现完整的负载指标系统和增强的状态指示器，提供实时更新的 JSON 数据统计和清晰的验证状态反馈。

## 需求分析

### 验收标准

1. ✅ **指标在用户编辑 JSON 时实时更新**
2. ✅ **验证状态清楚地指示成功、待处理或错误状态**
3. ✅ **无论滚动位置如何，指示器都保持可见**

### 当前实现状态

**已完成**:
- ✅ 基础行数统计 (lineCount)
- ✅ 基础字符数统计 (charCount)
- ✅ 验证状态指示器 (idle/validating/success/error)

**缺失**:
- ❌ 字节大小显示（B/KB/MB 格式化）
- ❌ JSON 结构指标（深度、对象数、数组数、键数）
- ❌ 压缩比显示
- ❌ 处理时间统计
- ❌ 更丰富的验证状态详情
- ❌ 指标在滚动时的固定显示

## 技术设计

### 1. 指标类型系统

创建完整的指标类型定义 `types/metrics.ts`：

```typescript
/**
 * JSON 基础指标
 */
export interface JsonMetrics {
  // 基础统计
  lines: number           // 行数
  chars: number           // 字符数
  bytes: number           // 字节数

  // 结构统计
  depth: number           // JSON 嵌套深度
  objects: number         // 对象数量
  arrays: number          // 数组数量
  keys: number            // 键总数

  // 性能统计
  processingTime?: number // 处理耗时（毫秒）

  // 格式化统计
  compressionRatio?: number // 压缩比（格式化 vs 压缩后）
}

/**
 * 验证状态详情
 */
export interface ValidationStatusDetail {
  status: 'idle' | 'validating' | 'success' | 'error'
  message?: string
  timestamp?: Date
  duration?: number // 验证耗时（毫秒）
}
```

### 2. 指标计算工具

创建 `utils/metricsCalculator.ts`：

```typescript
/**
 * 计算 JSON 结构指标
 */
export function calculateJsonMetrics(jsonString: string): JsonMetrics {
  const lines = jsonString.split('\n').length
  const chars = jsonString.length
  const bytes = new Blob([jsonString]).size

  let depth = 0
  let objects = 0
  let arrays = 0
  let keys = 0

  try {
    const data = JSON.parse(jsonString)

    // 递归计算深度和结构统计
    const traverse = (obj: any, currentDepth: number) => {
      depth = Math.max(depth, currentDepth)

      if (Array.isArray(obj)) {
        arrays++
        obj.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            traverse(item, currentDepth + 1)
          }
        })
      } else if (typeof obj === 'object' && obj !== null) {
        objects++
        const objKeys = Object.keys(obj)
        keys += objKeys.length

        objKeys.forEach(key => {
          const value = obj[key]
          if (typeof value === 'object' && value !== null) {
            traverse(value, currentDepth + 1)
          }
        })
      }
    }

    traverse(data, 1)
  } catch {
    // JSON 解析失败，只返回基础指标
  }

  return {
    lines,
    chars,
    bytes,
    depth,
    objects,
    arrays,
    keys,
  }
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 计算压缩比
 */
export function calculateCompressionRatio(
  formatted: string,
  minified: string
): number {
  const formattedSize = new Blob([formatted]).size
  const minifiedSize = new Blob([minified]).size

  if (formattedSize === 0) return 0

  return ((formattedSize - minifiedSize) / formattedSize) * 100
}
```

### 3. MetricsDisplay 组件

创建专门的指标显示组件 `components/MetricsDisplay.tsx`：

```typescript
interface MetricsDisplayProps {
  metrics: JsonMetrics
  mode?: 'compact' | 'detailed' // 紧凑模式或详细模式
}

export function MetricsDisplay({ metrics, mode = 'compact' }: MetricsDisplayProps) {
  if (mode === 'compact') {
    // 紧凑模式：只显示核心指标
    return (
      <div className="metrics-compact">
        <span className="metric-item">{metrics.lines} 行</span>
        <span className="metric-item">{formatBytes(metrics.bytes)}</span>
      </div>
    )
  }

  // 详细模式：显示所有指标
  return (
    <div className="metrics-detailed">
      <div className="metrics-group">
        <h4>基础信息</h4>
        <div className="metric-item">
          <span className="metric-label">行数:</span>
          <span className="metric-value">{metrics.lines}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">字符数:</span>
          <span className="metric-value">{metrics.chars.toLocaleString()}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">大小:</span>
          <span className="metric-value">{formatBytes(metrics.bytes)}</span>
        </div>
      </div>

      {metrics.depth > 0 && (
        <div className="metrics-group">
          <h4>结构信息</h4>
          <div className="metric-item">
            <span className="metric-label">嵌套深度:</span>
            <span className="metric-value">{metrics.depth}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">对象数:</span>
            <span className="metric-value">{metrics.objects}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">数组数:</span>
            <span className="metric-value">{metrics.arrays}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">键总数:</span>
            <span className="metric-value">{metrics.keys}</span>
          </div>
        </div>
      )}

      {metrics.processingTime && (
        <div className="metrics-group">
          <h4>性能信息</h4>
          <div className="metric-item">
            <span className="metric-label">处理时间:</span>
            <span className="metric-value">{metrics.processingTime}ms</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4. 增强的状态指示器

优化 Toolbar 中的验证状态指示器：

**当前实现**:
```typescript
<div className={`status-indicator status-${validationStatus}`}>
  {validationStatus === 'idle' && '⚪ 未验证'}
  {validationStatus === 'validating' && '⏳ 验证中...'}
  {validationStatus === 'success' && '✓ JSON 有效'}
  {validationStatus === 'error' && '✗ JSON 无效'}
</div>
```

**增强后**:
```typescript
<div className={`status-indicator status-${validationStatus}`}>
  <span className="status-icon">{getStatusIcon(validationStatus)}</span>
  <span className="status-text">{getStatusText(validationStatus)}</span>
  {validationDuration && (
    <span className="status-duration">({validationDuration}ms)</span>
  )}
</div>
```

### 5. 固定位置的指标显示

确保指标在滚动时保持可见：

**方案 A: 固定 Panel Header**
```css
.panel-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}
```

**方案 B: 固定 Toolbar**
```css
.toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--bg-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

**推荐**: 方案 B（固定 Toolbar），因为：
1. Toolbar 已包含验证状态指示器
2. 用户滚动时仍能看到所有控制按钮
3. 实现更简单，不影响 Panel 布局

### 6. 实时更新机制

在 `App.tsx` 中实现指标的实时计算：

```typescript
// 计算输入指标
const inputMetrics = useMemo(() => {
  return calculateJsonMetrics(inputJson)
}, [inputJson])

// 计算输出指标
const outputMetrics = useMemo(() => {
  return calculateJsonMetrics(outputState.value)
}, [outputState.value])

// 计算压缩比（当两者都有效时）
const compressionRatio = useMemo(() => {
  if (inputJson && outputState.value && !outputState.isStale) {
    return calculateCompressionRatio(inputJson, outputState.value)
  }
  return undefined
}, [inputJson, outputState])
```

### 7. UI 设计

#### 紧凑模式（Panel Header）

```
┌─────────────────────────────────────────────┐
│ 输入              [42 行] [1.2 KB]    [复制] │
├─────────────────────────────────────────────┤
│                                             │
│  {                                          │
│    "key": "value"                           │
│  }                                          │
│                                             │
└─────────────────────────────────────────────┘
```

#### 详细模式（悬停或可展开）

```
┌─────────────────────────────────────────────┐
│ 输入            [详细指标 ▼]          [复制] │
├─────────────────────────────────────────────┤
│ 基础信息:                                   │
│   行数: 42                                  │
│   字符数: 1,234                             │
│   大小: 1.2 KB                              │
│                                             │
│ 结构信息:                                   │
│   嵌套深度: 3                               │
│   对象数: 5                                 │
│   数组数: 2                                 │
│   键总数: 15                                │
└─────────────────────────────────────────────┘
```

#### 增强的状态指示器

```
┌─────────────────────────────────────────────┐
│ [验证] [格式化] [压缩] [清空]               │
│                                             │
│ 自动验证 ☑  |  ✓ JSON 有效 (23ms)          │
└─────────────────────────────────────────────┘
```

## 实现步骤

### Phase 1: 基础设施

1. ✅ 创建 `types/metrics.ts` - 指标类型定义
2. ✅ 创建 `utils/metricsCalculator.ts` - 指标计算工具
3. ✅ 添加单元测试（可选但推荐）

### Phase 2: 组件实现

4. ✅ 创建 `components/MetricsDisplay.tsx` - 指标显示组件
5. ✅ 更新 `components/JsonPanel.tsx` - 集成 MetricsDisplay
6. ✅ 更新 `components/Toolbar.tsx` - 增强状态指示器

### Phase 3: 集成与优化

7. ✅ 更新 `App.tsx` - 实时指标计算和传递
8. ✅ 更新 `styles.css` - 指标显示样式和固定位置
9. ✅ 性能优化（useMemo、防抖）

### Phase 4: 测试与文档

10. ✅ 功能测试（实时更新、滚动可见性）
11. ✅ 性能测试（大文件处理）
12. ✅ 创建设计文档和完成报告

## 文件结构

```
src/
├── types/
│   └── metrics.ts             # 指标类型定义 (新增)
├── utils/
│   └── metricsCalculator.ts   # 指标计算工具 (新增)
├── components/
│   ├── MetricsDisplay.tsx     # 指标显示组件 (新增)
│   ├── JsonPanel.tsx          # 更新: 集成 MetricsDisplay
│   └── Toolbar.tsx            # 更新: 增强状态指示器
├── App.tsx                    # 更新: 实时指标计算
└── styles.css                 # 更新: 指标和固定位置样式
```

## 性能考虑

### 1. 指标计算性能

- **问题**: JSON 遍历可能很慢（大文件）
- **解决方案**:
  - 使用 `useMemo` 缓存计算结果
  - 设置大小限制（> 5MB 时简化计算）
  - 考虑 Web Worker（未来优化）

### 2. 实时更新性能

- **问题**: 每次输入都重新计算
- **解决方案**:
  - 已有的防抖机制（500ms）
  - 基础指标（行数、字符数）无需防抖
  - 结构指标（深度、对象数）使用防抖

### 3. 渲染性能

- **问题**: 频繁更新导致重渲染
- **解决方案**:
  - `React.memo` 优化组件
  - 条件渲染（只在有效 JSON 时显示结构指标）

## 可访问性

1. **语义化 HTML**: 使用 `<dl>`, `<dt>`, `<dd>` 标签
2. **ARIA 标签**: 指标含义清晰
3. **对比度**: 符合 WCAG AA 标准
4. **屏幕阅读器**: 指标有文本描述

## 潜在改进

### 短期（可选）

1. **指标导出**: 将指标导出为 CSV/JSON
2. **指标历史**: 记录历史指标变化
3. **指标对比**: 对比输入和输出指标

### 长期（未来版本）

1. **自定义指标**: 用户选择显示哪些指标
2. **指标图表**: 可视化指标变化趋势
3. **性能分析**: 详细的性能剖析工具

## 总结

Task 13 将为应用添加完整的负载指标系统，包括：

- **丰富的指标**: 字节大小、JSON 深度、对象/数组/键数量、处理时间、压缩比
- **实时更新**: 用户编辑时立即更新所有指标
- **清晰的状态**: 增强的验证状态指示器，显示处理时间
- **固定可见**: Toolbar 固定在顶部，指标始终可见
- **性能优化**: useMemo 缓存、防抖、条件渲染

这将使应用更加专业，为用户提供深入的 JSON 数据洞察。
