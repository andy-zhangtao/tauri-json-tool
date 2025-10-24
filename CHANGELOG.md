# Changelog

All notable changes to JSON Formatter & Validator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- 自动更新机制
- 更多主题选项
- JSON Schema 验证
- 批量文件处理

---

## [0.1.0] - 2025-10-24

### 🎉 首次发布

这是 JSON Formatter & Validator 的首个正式版本,包含完整的 JSON 验证、格式化和桌面应用功能。

### ✨ 核心功能

#### JSON 处理
- **验证**: 实时 JSON 语法验证,支持最大 5 MB 文件
- **格式化**: 美化 JSON 输出,可配置缩进 (2/4 空格)
- **压缩**: 移除空白字符,生成紧凑 JSON
- **错误高亮**: 精确定位错误行列,提供详细错误信息

#### 用户界面
- **响应式布局**: 自动适配宽屏 (并排) 和窄屏 (垂直堆叠)
- **双面板设计**: 输入/输出面板独立滚动
- **空状态提示**: 友好的引导界面
- **清除确认**: 防止意外丢失未保存内容

#### 文件操作
- **导入**: 支持从本地导入 .json 文件 (最大 10 MB)
- **导出**: 保存格式化后的 JSON 到磁盘
- **剪贴板**: 一键复制输入/输出内容

#### 键盘快捷键
- `⌘V` / `Ctrl+V` - 验证 JSON
- `⌘F` / `Ctrl+F` - 格式化 JSON
- `⌘M` / `Ctrl+M` - 压缩 JSON
- `⌘K` / `Ctrl+K` - 清除内容
- `⌘O` / `Ctrl+O` - 导入文件
- `⌘S` / `Ctrl+S` - 导出文件
- `⌘⇧I` / `Ctrl+Shift+I` - 复制输入
- `⌘⇧O` / `Ctrl+Shift+O` - 复制输出
- `⌘/` / `Ctrl+/` - 显示快捷键帮助

#### 主题与外观
- **三种主题模式**:
  - 自动 (跟随系统)
  - 浅色主题
  - 深色主题
- **平滑切换动画** (0.3s 过渡效果)
- **主题偏好持久化** (localStorage)

#### 负载指标
- **实时统计**:
  - 行数、字符数、字节数
  - JSON 嵌套深度
  - 对象数、数组数、键总数
  - 处理耗时 (毫秒级)
- **双显示模式**: 紧凑 / 详细

#### 性能优化
- **大文件处理**: 支持最大 5 MB JSON 验证
- **智能指标**: 大文件 (>1MB) 跳过结构分析
- **React 懒加载**: 非关键组件延迟加载
- **UI 无阻塞**: 所有 JSON 操作异步执行
- **加载遮罩**: 大文件处理时显示进度

#### 偏好设置
- **自动验证**: 可选的输入防抖验证 (500ms)
- **缩进设置**: 2 或 4 空格
- **尾部换行**: 可选的文件结尾换行符
- **跨会话持久化**: localStorage 存储

### 🏗️ 技术栈

#### 后端 (Rust)
- Tauri 2.9 - 桌面应用框架
- serde_json 1.0 - JSON 解析/序列化
- tokio 1.48 - 异步运行时
- 36 个单元测试,100% 通过

#### 前端 (TypeScript + React)
- React 18.3 - UI 框架
- TypeScript 5.2 - 类型安全
- Vite 5.2 - 构建工具
- 模块化组件架构

#### 构建与分发
- **代码签名**: Developer ID Application 签名
- **公证支持**: 提供公证脚本 (可选)
- **DMG 安装器**: macOS 磁盘镜像
- **校验和**: SHA256 完整性验证

### 📦 分发文件

- `JSON Formatter & Validator.app` - macOS 应用包
- `JSON Formatter & Validator_0.1.0_aarch64.dmg` - 安装器 (3.8 MB)
- `JSON Formatter & Validator_0.1.0_aarch64.dmg.sha256` - 校验和

### 🎯 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本
- **架构**: Apple Silicon (ARM64) / Intel (x86_64)
- **磁盘空间**: ~10 MB

### 🐛 已知问题

无

### 🔒 安全性

- ✅ 代码签名 (Developer ID)
- ✅ Hardened Runtime 启用
- ✅ 沙盒权限最小化
- ⚠️ 未公证 (用户首次打开需右键 → 打开)

### 📝 文档

- 完整的 README
- 19 个任务设计文档
- 14 个任务完成报告
- 问题排查指南
- API 文档 (Rust)

### 🙏 致谢

感谢以下开源项目:
- [Tauri](https://tauri.app/) - 跨平台桌面框架
- [React](https://react.dev/) - UI 库
- [serde_json](https://github.com/serde-rs/json) - Rust JSON 库

---

## 版本说明

### 版本号规则
- **主版本号** (0.x.x): 重大架构变更
- **次版本号** (x.1.x): 新功能添加
- **修订号** (x.x.1): Bug 修复和小改进

### 发布节奏
- **稳定版**: 按需发布
- **Beta 版**: 无计划
- **Nightly 版**: 无计划

---

[Unreleased]: https://github.com/yourusername/tauri-json-tool/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/tauri-json-tool/releases/tag/v0.1.0
