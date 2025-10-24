# Task 7: Formatting Actions & Preferences - 设计文档

> **任务名称**: 格式化操作与偏好设置
> **创建时间**: 2025-10-24
> **状态**: ✅ 已实现(在 Task 4 和 Task 5 中完成)

---

## 📋 需求分析

### 功能描述
公开用于格式化、压缩、缩进选择和尾部换行符偏好的 UI 控件,跨会话持久化设置。

### 验收标准

1. ✅ **格式化和压缩按钮对当前输入一致操作**
   - 格式化按钮使用当前的缩进和尾部换行符设置
   - 压缩按钮移除所有空白
   - 两个按钮在所有情况下行为一致

2. ✅ **缩进选择和尾部换行符切换被存储并在应用重启时恢复**
   - 支持 2 空格或 4 空格缩进
   - 尾部换行符可开关
   - 设置保存到 localStorage
   - 应用重启后自动恢复

3. ✅ **偏好通过本地存储持久化**
   - 使用 localStorage API
   - 实时保存,无需手动操作
   - 支持默认值回退

---

## 🎨 UI/UX 设计

### 工具栏布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [验证] [格式化] [压缩] [清空]  │ 缩进: [2空格▾] ☑尾部换行 ☑自动验证 │ ⬤ 状态  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 控件说明

1. **操作按钮区** (左侧)
   - 验证: 触发 JSON 验证
   - 格式化: 美化 JSON (使用当前偏好设置)
   - 压缩: 移除所有空白
   - 清空: 清除输入和输出

2. **偏好设置区** (中间)
   - 缩进下拉框: 选择 2 或 4 空格
   - 尾部换行复选框: 开关尾部换行符
   - 自动验证复选框: 开关自动验证

3. **状态指示区** (右侧)
   - 显示当前验证状态

---

## 🏗️ 技术实现

### 1. 数据结构

#### FormattingOptions 接口
```typescript
export interface FormattingOptions {
  indent: 2 | 4              // 缩进空格数
  trailing_newline: boolean  // 是否添加尾部换行符
}
```

#### UserPreferences 接口
```typescript
export interface UserPreferences {
  autoValidate: boolean              // 自动验证开关
  formattingOptions: FormattingOptions  // 格式化选项
}
```

### 2. 偏好管理 Hook

#### usePreferences Hook
```typescript
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return getFromStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES)
  })

  useEffect(() => {
    setToStorage(PREFERENCES_KEY, preferences)
  }, [preferences])

  return {
    preferences,
    autoValidate,
    formattingOptions,
    setAutoValidate,
    setFormattingOptions,
    resetPreferences,
  }
}
```

**特性**:
- 初始化时从 localStorage 读取
- 偏好变化时自动保存
- 提供便捷的更新函数
- 支持重置为默认值

### 3. localStorage 工具

#### 存储工具函数
```typescript
// 保存到 localStorage
export function setToStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
  } catch (error) {
    console.error(`Failed to save to localStorage: ${error}`)
  }
}

// 从 localStorage 读取
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`Failed to read from localStorage: ${error}`)
    return defaultValue
  }
}
```

**容错机制**:
- JSON 解析失败时返回默认值
- localStorage 不可用时使用内存存储
- 错误静默处理,不影响应用运行

### 4. 格式化与压缩集成

#### App.tsx 集成
```typescript
const { formattingOptions, setFormattingOptions } = usePreferences()

const handleFormat = async () => {
  const result = await jsonService.formatJson(inputJson, formattingOptions)
  // 使用当前偏好设置格式化
}

const handleMinify = async () => {
  const result = await jsonService.minifyJson(inputJson)
  // 压缩不受偏好设置影响
}
```

### 5. UI 控件实现

#### Toolbar 组件
```typescript
<select
  value={formattingOptions.indent}
  onChange={(e) =>
    onFormattingOptionsChange({
      ...formattingOptions,
      indent: parseInt(e.target.value) as 2 | 4,
    })
  }
>
  <option value={2}>2 空格</option>
  <option value={4}>4 空格</option>
</select>

<input
  type="checkbox"
  checked={formattingOptions.trailing_newline}
  onChange={(e) =>
    onFormattingOptionsChange({
      ...formattingOptions,
      trailing_newline: e.target.checked,
    })
  }
/>
```

---

## 📁 文件清单

### 已实现文件

1. **`src/types/formatting.ts`**
   - `FormattingOptions` 接口
   - `FormattingResult` 类型
   - 类型守卫函数

2. **`src/hooks/usePreferences.ts`**
   - `UserPreferences` 接口
   - `usePreferences` Hook
   - 偏好管理逻辑

3. **`src/utils/localStorage.ts`**
   - `setToStorage` 函数
   - `getFromStorage` 函数
   - 容错处理

4. **`src/components/Toolbar.tsx`**
   - 格式化和压缩按钮
   - 缩进选择下拉框
   - 尾部换行符复选框
   - 自动验证复选框

5. **`src/App.tsx`**
   - 集成 `usePreferences` Hook
   - 格式化和压缩函数
   - 偏好设置传递

6. **`src/styles.css`**
   - 工具栏样式
   - 按钮样式
   - 表单控件样式

---

## 🔄 用户流程

### 流程 1: 修改缩进设置

```
用户点击缩进下拉框
    ↓
选择 2 或 4 空格
    ↓
onFormattingOptionsChange 触发
    ↓
setFormattingOptions 更新状态
    ↓
useEffect 自动保存到 localStorage
    ↓
下次格式化使用新设置
```

### 流程 2: 格式化操作

```
用户输入 JSON
    ↓
点击"格式化"按钮
    ↓
handleFormat 使用当前 formattingOptions
    ↓
调用后端格式化服务
    ↓
应用缩进和尾部换行符设置
    ↓
显示格式化结果
```

### 流程 3: 应用重启恢复

```
应用启动
    ↓
usePreferences 初始化
    ↓
getFromStorage 读取 localStorage
    ↓
恢复上次的偏好设置
    ↓
UI 控件显示正确的状态
```

---

## 🧪 测试计划

### 功能测试

- [x] 格式化按钮使用当前缩进设置
- [x] 压缩按钮正常工作
- [x] 缩进切换(2/4空格)立即生效
- [x] 尾部换行符切换立即生效
- [x] 偏好设置保存到 localStorage
- [x] 刷新页面后偏好恢复

### 持久化测试

- [x] 修改缩进并刷新页面
- [x] 修改尾部换行符并刷新页面
- [x] 修改自动验证并刷新页面
- [x] localStorage 不可用时使用默认值

### 集成测试

- [x] 格式化 + 2空格 + 尾部换行
- [x] 格式化 + 4空格 + 无尾部换行
- [x] 压缩不受偏好设置影响
- [x] 多次切换设置正常工作

---

## ⚠️ 注意事项

### 1. 默认值设计

- **缩进**: 2 空格 (业界通用标准)
- **尾部换行符**: true (符合 POSIX 标准)
- **自动验证**: false (避免性能问题)

### 2. 持久化策略

- **存储位置**: localStorage (浏览器本地)
- **存储键**: `json-tool-preferences`
- **存储格式**: JSON 序列化
- **容错**: 解析失败时回退到默认值

### 3. 性能考虑

- **实时保存**: 每次偏好变化立即保存
- **读取优化**: 仅在初始化时读取一次
- **无阻塞**: localStorage 操作不阻塞 UI

### 4. 用户体验

- **即时反馈**: 设置变化立即生效
- **无需保存按钮**: 自动持久化
- **状态可见**: UI 控件始终反映当前设置

---

## 📊 验收检查清单

开发完成后,按以下清单逐项检查:

- [x] ✅ "格式化"按钮使用当前缩进设置
- [x] ✅ "格式化"按钮使用当前尾部换行符设置
- [x] ✅ "压缩"按钮正常工作,不受偏好影响
- [x] ✅ 缩进下拉框可切换 2/4 空格
- [x] ✅ 尾部换行符复选框可开关
- [x] ✅ 缩进设置保存到 localStorage
- [x] ✅ 尾部换行符设置保存到 localStorage
- [x] ✅ 刷新页面后缩进设置恢复
- [x] ✅ 刷新页面后尾部换行符设置恢复
- [x] ✅ localStorage 不可用时使用默认值
- [x] ✅ 偏好设置实时生效,无需手动保存

---

## 🎯 实现总结

### 已完成功能

1. **格式化操作**
   - 格式化按钮完全实现
   - 压缩按钮完全实现
   - 使用后端 Rust 服务

2. **偏好设置 UI**
   - 缩进选择下拉框
   - 尾部换行符复选框
   - 自动验证复选框

3. **持久化机制**
   - localStorage 存储
   - 自动保存和恢复
   - 容错处理

### 技术亮点

1. **React Hooks 架构**
   - 使用 `usePreferences` 统一管理偏好
   - 使用 `useCallback` 优化性能
   - 使用 `useEffect` 自动同步

2. **TypeScript 类型安全**
   - 严格的类型定义
   - 联合类型约束 (`2 | 4`)
   - 类型守卫保证安全

3. **容错设计**
   - localStorage 失败时静默处理
   - JSON 解析失败时使用默认值
   - 保证应用不会崩溃

---

## 📝 补充说明

### 与其他任务的关联

- **Task 3**: 格式化和压缩的后端实现
- **Task 4**: Toolbar UI 组件
- **Task 5**: 自动验证偏好设置
- **Task 15**: 未来可能升级为更完善的偏好系统

### 未来增强

1. **更多格式化选项**
   - 对象键排序
   - 数组格式化风格
   - 注释保留(JSON5)

2. **导入/导出偏好**
   - 导出为 JSON 文件
   - 从文件导入
   - 偏好模板

3. **主题偏好**
   - 深色/浅色主题选择
   - 自定义颜色方案
   - 字体大小调整

---

**文档版本**: 1.0
**审核状态**: ✅ 已验证
**实现时间**: Task 4 & Task 5 (2025-10-23)
**验证时间**: 2025-10-24
