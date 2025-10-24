# Task 9: File Import & Export - 设计文档

**任务名称**: File Import & Export
**设计日期**: 2025-10-24
**设计版本**: 1.0

---

## 🎯 设计目标

为 JSON Formatter & Validator 应用添加文件导入导出功能,使用户能够:
- 从文件系统导入 JSON 文件进行验证和格式化
- 将处理后的 JSON 导出到文件系统
- 获得流畅的文件操作体验,符合 macOS 原生应用习惯

---

## 📐 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户界面层                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 导入按钮  │  │ 导出按钮  │  │ 输入面板  │  │ 输出面板  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端服务层 (TS)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              fileService.ts                          │  │
│  │  • importJsonFile()                                  │  │
│  │  • exportJsonFile()                                  │  │
│  └────┬──────────────────────────────────────────┬──────┘  │
└───────┼──────────────────────────────────────────┼─────────┘
        │                                          │
        │  Tauri IPC (invoke)                      │
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tauri 命令层 (Rust)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  lib.rs                                              │  │
│  │  • import_json_file(file_path) -> FileReadResult     │  │
│  │  • export_json_file(file_path, content) -> String    │  │
│  └────┬──────────────────────────────────────────┬──────┘  │
└───────┼──────────────────────────────────────────┼─────────┘
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   文件服务层 (Rust)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  services/file_io.rs                                 │  │
│  │  • read_json_file(path) -> Result<FileReadResult>    │  │
│  │  • write_json_file(path, content) -> Result<String>  │  │
│  │  • can_write_file(path) -> bool                      │  │
│  └────┬──────────────────────────────────────────┬──────┘  │
└───────┼──────────────────────────────────────────┼─────────┘
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tauri 插件层                               │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │ tauri-plugin-    │      │ tauri-plugin-fs  │           │
│  │ dialog           │      │                  │           │
│  │ • open()         │      │ • 文件系统访问    │           │
│  │ • save()         │      │                  │           │
│  └────┬─────────────┘      └────┬─────────────┘           │
└───────┼──────────────────────────┼─────────────────────────┘
        │                          │
        ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    操作系统文件系统                           │
│  • macOS 原生文件对话框                                       │
│  • 文件读写操作                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 组件设计

### 1. 前端服务: `fileService.ts`

#### 职责
- 封装文件导入导出的前端逻辑
- 调用 Tauri Dialog API 显示文件对话框
- 调用后端 Tauri 命令执行文件操作
- 处理用户取消操作

#### 接口设计

```typescript
class FileService {
  // 导入 JSON 文件
  async importJsonFile(options?: ImportOptions): Promise<FileReadResult | null>

  // 导出 JSON 文件
  async exportJsonFile(content: string, options?: ExportOptions): Promise<string | null>
}

interface ImportOptions {
  filters?: Array<{ name: string; extensions: string[] }>
  title?: string
}

interface ExportOptions {
  defaultFileName?: string
  filters?: Array<{ name: string; extensions: string[] }>
  title?: string
}

interface FileReadResult {
  content: string
  file_name: string
}
```

#### 设计决策
- **单例模式**: 导出 `fileService` 实例,避免重复创建
- **可选配置**: 提供默认值,简化调用
- **null 返回**: 用户取消时返回 `null`,不抛出错误
- **类型安全**: 完整的 TypeScript 类型定义

---

### 2. 后端服务: `file_io.rs`

#### 职责
- 执行实际的文件读写操作
- 验证文件格式和大小
- 提供详细的错误信息

#### 接口设计

```rust
// 文件读取
pub fn read_json_file(file_path: &str) -> Result<FileReadResult, String>

// 文件写入
pub fn write_json_file(file_path: &str, content: &str) -> Result<String, String>

// 权限检查
pub fn can_write_file(file_path: &str) -> bool

pub struct FileReadResult {
    pub content: String,
    pub file_name: String,
}
```

#### 验证逻辑

**读取验证**:
1. ✅ 文件存在性检查
2. ✅ 文件类型检查(必须是常规文件)
3. ✅ 扩展名检查(必须是 `.json`)
4. ✅ 文件大小检查(≤ 10 MB)
5. ✅ 读取权限检查

**写入验证**:
1. ✅ 父目录存在性检查(不存在则创建)
2. ✅ 扩展名检查(非 `.json` 则拒绝)
3. ✅ 自动添加扩展名(如果缺失)
4. ✅ 写入权限检查

#### 错误处理

```rust
// 错误类型
- "文件不存在: {path}"
- "路径不是文件: {path}"
- "文件必须是 .json 格式,当前: .{ext}"
- "文件缺少扩展名,必须是 .json 文件"
- "文件太大 ({size} MB),最大支持 10 MB"
- "无法获取文件元数据: {error}"
- "读取文件失败: {error}"
- "无法创建目录: {error}"
- "写入文件失败: {error}"
```

---

### 3. Tauri 命令层

#### 命令设计

```rust
#[tauri::command]
async fn import_json_file(file_path: String) -> Result<FileReadResult, String>

#[tauri::command]
async fn export_json_file(file_path: String, content: String) -> Result<String, String>
```

#### 异步处理
- 使用 `tokio::task::spawn_blocking()` 执行文件 I/O
- 避免阻塞 UI 线程
- 支持大文件操作

---

### 4. UI 组件集成

#### Toolbar 更新

```typescript
interface ToolbarProps {
  // ... 现有 props
  onImport: () => void
  onExport: () => void
}
```

**按钮布局**:
```
[导入] [导出] | [验证] [格式化] [压缩] [清空] | [选项...] | [状态]
```

#### App.tsx 集成

```typescript
// 导入处理
const handleImport = async () => {
  const result = await fileService.importJsonFile()
  if (result) {
    setInputJson(result.content)
    // 重置状态
    setErrorMessage('')
    setValidationStatus('idle')
  }
}

// 导出处理
const handleExport = async () => {
  const contentToExport = outputState.value || inputJson
  const savedPath = await fileService.exportJsonFile(contentToExport)
  // 处理结果
}
```

---

## 🔐 安全设计

### 文件系统安全

1. **路径验证**
   - 使用 `std::path::Path` 规范化路径
   - 防止路径遍历攻击

2. **扩展名检查**
   - 强制 `.json` 扩展名
   - 拒绝可执行文件

3. **大小限制**
   - 最大 10 MB
   - 防止内存耗尽

4. **权限检查**
   - 读取前检查可读性
   - 写入前检查可写性

### Tauri 插件权限

- `tauri-plugin-dialog`: 无额外权限配置需要
- `tauri-plugin-fs`: 在 Tauri 2.x 中使用默认沙箱

---

## 🎨 用户体验设计

### 交互流程

#### 导入流程
```
用户点击"导入"
  → 原生文件选择对话框
  → 用户选择 .json 文件
  → 文件内容加载到输入框
  → (可选)自动验证
  → 显示成功/错误消息
```

#### 导出流程
```
用户点击"导出"
  → 检查是否有内容可导出
  → 原生文件保存对话框
  → 用户选择保存位置
  → 文件写入磁盘
  → 显示成功/错误消息
```

### 状态管理

**处理中状态**:
- `isProcessing = true`
- 禁用所有按钮
- 防止并发操作

**错误显示**:
- 使用现有的 `errorMessage` 状态
- 在输入面板下方显示错误
- 自动清除旧错误

---

## 📊 性能考虑

### 异步操作
- 所有文件 I/O 在后台线程执行
- UI 保持响应
- 支持大文件(最大 10 MB)

### 内存管理
- 文件内容直接读入内存
- 单次操作限制 10 MB
- 避免内存碎片

### 优化策略
- 使用 `spawn_blocking` 避免阻塞
- 最小化状态更新
- 延迟验证(仅在需要时)

---

## 🧪 测试策略

### 单元测试 (Rust)

```rust
#[cfg(test)]
mod tests {
    // 读取测试
    test_read_valid_json_file()
    test_read_nonexistent_file()
    test_read_non_json_file()
    test_read_large_file()

    // 写入测试
    test_write_json_file()
    test_write_json_file_auto_add_extension()
    test_write_invalid_extension()
    test_write_to_readonly_directory()

    // 权限测试
    test_can_write_file()
}
```

### 集成测试

1. **端到端导入测试**
   - 准备测试 JSON 文件
   - 模拟导入操作
   - 验证输入框内容

2. **端到端导出测试**
   - 设置输出内容
   - 模拟导出操作
   - 验证文件内容

### 手动测试清单

- [ ] 导入有效 JSON 文件
- [ ] 导入无效 JSON 文件
- [ ] 导入大文件 (接近 10 MB)
- [ ] 导入非 JSON 文件(应拒绝)
- [ ] 导出格式化的 JSON
- [ ] 导出压缩的 JSON
- [ ] 导出到新文件
- [ ] 导出覆盖现有文件
- [ ] 取消导入操作
- [ ] 取消导出操作
- [ ] 导入后自动验证
- [ ] 错误消息显示

---

## 🔄 兼容性

### Tauri 版本
- ✅ Tauri 2.9.1
- ✅ tauri-plugin-dialog 2.4.0
- ✅ tauri-plugin-fs 2.4.2

### 平台支持
- ✅ macOS 10.13+
- ⏳ Windows (未测试)
- ⏳ Linux (未测试)

### 浏览器兼容性
- N/A (原生应用)

---

## 📝 实现清单

### Phase 1: 后端基础 ✅
- [x] 安装 Tauri 插件依赖
- [x] 创建 `file_io.rs` 服务
- [x] 实现文件读取逻辑
- [x] 实现文件写入逻辑
- [x] 添加验证和错误处理
- [x] 编写单元测试

### Phase 2: Tauri 集成 ✅
- [x] 注册插件到 Tauri Builder
- [x] 创建 `import_json_file` 命令
- [x] 创建 `export_json_file` 命令
- [x] 配置 `tauri.conf.json`

### Phase 3: 前端实现 ✅
- [x] 创建 `fileService.ts`
- [x] 实现导入逻辑
- [x] 实现导出逻辑
- [x] 更新 Toolbar 组件
- [x] 更新 App.tsx 集成

### Phase 4: 测试与优化 ✅
- [x] 运行单元测试
- [x] 手动功能测试
- [x] 错误场景测试
- [x] 性能验证

### Phase 5: 文档 ✅
- [x] 完成设计文档
- [x] 完成实现报告
- [x] 更新 TODO.md

---

## 🚀 未来扩展

### 短期改进
1. **文件格式验证**: 导入时预验证 JSON 格式
2. **进度指示**: 大文件操作显示进度条
3. **错误详情**: 显示更详细的错误堆栈

### 长期规划
1. **批量导入**: 支持多文件导入
2. **拖放支持**: 拖放文件到窗口
3. **最近文件**: 快速访问最近打开的文件
4. **云存储**: 集成 Dropbox/Google Drive
5. **文件监视**: 自动重新加载已更改的文件

---

## 📚 参考资料

- [Tauri Plugin - Dialog API](https://v2.tauri.app/reference/javascript/dialog/)
- [Tauri Plugin - Filesystem API](https://v2.tauri.app/reference/javascript/fs/)
- [Tauri Security Best Practices](https://v2.tauri.app/security/)
- [Rust std::fs Documentation](https://doc.rust-lang.org/std/fs/)

---

**设计者**: Claude (Sonnet 4.5)
**设计版本**: 1.0
**最后更新**: 2025-10-24
