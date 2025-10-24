# Task 17: Packaging & Distribution - 设计文档

> **任务状态**: ✅ 已完成
> **开始日期**: 2025-10-24
> **完成日期**: 2025-10-24
> **负责人**: Development Team

---

## 📋 任务概述

**目标**: 配置 Tauri 打包流程,实现 macOS 应用的代码签名、公证和分发包生成。

**验收标准**:
- ✅ `tauri build` 生成签名的 macOS 工件 (.app, .dmg)
- ✅ 发布工件包含版本化元数据和 SHA256 校验和
- ✅ 提供公证流程的自动化脚本

---

## 🏗️ 系统设计

### 1. 代码签名架构

```
证书链:
┌─────────────────────────────────────┐
│ Apple Root CA                       │  ← 系统根证书
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Developer ID Certification          │  ← Apple 中间证书 (G2)
│ Authority (G2)                      │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Developer ID Application:           │  ← 开发者证书
│ Zhangtao zhang (N33BWHJDRQ)        │
└─────────────────────────────────────┘
```

**签名目标**:
1. **主二进制文件**: `Contents/MacOS/json-formatter-validator`
2. **应用包**: `JSON Formatter & Validator.app`
3. **DMG 镜像**: `JSON Formatter & Validator_0.1.0_aarch64.dmg`

### 2. Entitlements 配置

关键权限:
- ✅ **网络客户端**: `com.apple.security.network.client` (未来更新检查)
- ✅ **文件读写**: `com.apple.security.files.user-selected.read-write` (导入/导出)
- ✅ **JIT 编译**: `com.apple.security.cs.allow-jit` (WebView 需要)
- ✅ **未签名内存**: `com.apple.security.cs.allow-unsigned-executable-memory` (WebView)
- ✅ **禁用库验证**: `com.apple.security.cs.disable-library-validation` (系统库)

**设计决策**:
- ❌ 不启用 App Sandbox (简化文件访问,适用于桌面工具)
- ✅ 启用 Hardened Runtime (符合 Developer ID 要求)

### 3. 构建流程

```bash
┌──────────────────┐
│ 1. 清理旧构建    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 2. 验证证书链    │ ← security find-identity
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 3. 构建前端      │ ← npm run build
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 4. Tauri 构建    │ ← npm run tauri:build
│    + 自动签名    │    (Tauri 调用 codesign)
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 5. 验证签名      │ ← codesign --verify
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 6. 生成校验和    │ ← shasum -a 256
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 7. 复制到输出    │ ← dist-signed/
└──────────────────┘
```

### 4. 公证流程 (可选)

```bash
┌──────────────────┐
│ 1. 提交到 Apple  │ ← xcrun notarytool submit
│    (等待审核)    │    (通常 5-15 分钟)
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 2. 装订票据      │ ← xcrun stapler staple
│    (嵌入公证信息)│
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 3. 验证公证      │ ← xcrun stapler validate
└──────────────────┘
```

**公证方式**:
- **方式 A**: App Store Connect API Key (.p8 文件) ← 推荐,无需交互
- **方式 B**: Apple ID + 应用专用密码 ← 备用方案

---

## 📁 文件结构

### 新增文件

```
tauri-json-tool/
├── src-tauri/
│   ├── entitlements.plist           # ✅ 权限配置
│   └── tauri.conf.json              # ✅ 更新:添加签名配置
├── scripts/
│   ├── build-signed.sh              # ✅ 签名构建脚本
│   └── notarize.sh                  # ✅ 公证脚本
├── dist-signed/                     # ✅ 构建产物输出目录
│   ├── JSON Formatter & Validator.app
│   ├── JSON Formatter & Validator_0.1.0_aarch64.dmg
│   └── JSON Formatter & Validator_0.1.0_aarch64.dmg.sha256
└── docs/
    ├── task17-design.md             # ✅ 本文档
    └── task17-completion-report.md  # ✅ 完成报告
```

### 修改文件

**src-tauri/tauri.conf.json**:
```json
{
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "10.13",
      "signingIdentity": "Developer ID Application: Zhangtao zhang (N33BWHJDRQ)"
    }
  }
}
```

---

## 🔧 技术实现

### 1. 证书配置

**证书安装清单**:
```bash
# 1. Apple Root CA (系统根证书)
curl -O https://www.apple.com/appleca/AppleIncRootCertificate.cer
security import AppleIncRootCertificate.cer -k ~/Library/Keychains/login.keychain-db

# 2. Developer ID G2 中间证书
curl -O https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer
security import DeveloperIDG2CA.cer -k ~/Library/Keychains/login.keychain-db

# 3. WWDR G3 证书
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
security import AppleWWDRCAG3.cer -k ~/Library/Keychains/login.keychain-db

# 4. 开发者证书 (从 Apple Developer 下载)
# 下载 .cer 文件后双击安装
```

**验证证书链**:
```bash
security find-identity -v -p codesigning
# 输出: Developer ID Application: Zhangtao zhang (N33BWHJDRQ)

security verify-cert -c DeveloperIDG2CA.cer
# 输出: certificate verification successful
```

### 2. 签名命令

**手动签名示例**:
```bash
# 签名应用包
codesign -s "Developer ID Application: Zhangtao zhang (N33BWHJDRQ)" \
  --deep --force --options runtime \
  "JSON Formatter & Validator.app"

# 验证签名
codesign -dvv "JSON Formatter & Validator.app"
codesign --verify --deep --strict "JSON Formatter & Validator.app"
```

**Tauri 自动签名**:
Tauri CLI 会自动调用 `codesign`,无需手动干预。配置在 `tauri.conf.json` 中。

### 3. 校验和生成

```bash
# SHA256 校验和
shasum -a 256 "JSON Formatter & Validator_0.1.0_aarch64.dmg" > \
  "JSON Formatter & Validator_0.1.0_aarch64.dmg.sha256"

# 验证
shasum -a 256 -c "JSON Formatter & Validator_0.1.0_aarch64.dmg.sha256"
```

---

## 🎯 验收测试

### 测试用例 1: 签名验证
```bash
codesign -dvv "dist-signed/JSON Formatter & Validator.app"
# 预期: Authority=Developer ID Application...
#      Authority=Developer ID Certification Authority
#      Authority=Apple Root CA
```

### 测试用例 2: DMG 签名验证
```bash
codesign -dvv "dist-signed/JSON Formatter & Validator_0.1.0_aarch64.dmg"
# 预期: Signature size=9049
#      Authority=Developer ID Application...
```

### 测试用例 3: 应用启动
```bash
open "dist-signed/JSON Formatter & Validator.app"
# 预期: 应用正常启动,无 Gatekeeper 警告
```

### 测试用例 4: 校验和验证
```bash
cd dist-signed
shasum -a 256 -c *.sha256
# 预期: JSON Formatter & Validator_0.1.0_aarch64.dmg: OK
```

---

## ⚠️ 已知问题与解决方案

### 问题 1: errSecInternalComponent

**症状**:
```
Warning: unable to build chain to self-signed root
errSecInternalComponent
```

**根因**: 证书链不完整,缺少中间证书或根证书。

**解决方案**:
1. 安装 Apple Root CA
2. 安装 Developer ID G2 CA
3. 安装 WWDR G3 证书
4. 在钥匙串中将所有信任设置改为"使用系统默认"

### 问题 2: 证书"不被信任"

**症状**: 钥匙串显示红色 X,提示"此证书不被信任"。

**根因**: 用户手动设置了"始终信任",但证书链验证失败。

**解决方案**:
1. 打开钥匙串访问
2. 找到证书,双击打开
3. 将"代码签名"信任设置改为**"使用系统默认"**
4. 保存更改

### 问题 3: 私钥缺失

**症状**: 证书存在但无法签名。

**根因**: 只安装了公钥证书 (.cer),没有私钥。

**解决方案**:
- 如果证书是在本机生成: 重新下载并安装 .cer 文件
- 如果证书来自其他 Mac: 从源 Mac 导出 .p12 文件(包含私钥),然后导入

---

## 📊 性能指标

| 操作 | 时间 | 备注 |
|------|------|------|
| 前端构建 | ~0.3s | Vite 生产构建 |
| Rust 编译 | ~20s | Release 模式 |
| 应用签名 | ~2s | codesign 自动执行 |
| DMG 生成 | ~3s | 包含签名 |
| 总构建时间 | **~30s** | 不含公证 |
| 公证等待 | 5-15分钟 | Apple 服务器审核 |

**构建产物大小**:
- .app 包: ~96 KB (仅元数据)
- .dmg 文件: ~3.8 MB
- 总分发大小: **3.8 MB**

---

## 🚀 使用指南

### 基础签名构建

```bash
# 一键构建并签名
./scripts/build-signed.sh

# 输出位置
ls -lh dist-signed/
```

### 完整公证流程

```bash
# 1. 设置环境变量
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"  # 应用专用密码
export APPLE_TEAM_ID="N33BWHJDRQ"

# 2. 构建并签名
./scripts/build-signed.sh

# 3. 提交公证
./scripts/notarize.sh
```

### 分发检查表

- [x] 构建成功,无错误
- [x] 签名验证通过
- [x] 应用可以正常启动
- [x] 校验和文件生成
- [ ] (可选) 公证完成
- [ ] (可选) 上传到分发平台

---

## 📚 参考资料

- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Tauri Bundling Documentation](https://v2.tauri.app/distribute/)
- [xcrun notarytool Usage](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution/customizing_the_notarization_workflow)

---

## 🔄 后续改进

1. **CI/CD 集成** (未实现)
   - GitHub Actions 自动构建
   - 自动公证和发布

2. **跨平台支持** (未实现)
   - Windows 代码签名 (Authenticode)
   - Linux AppImage 打包

3. **自动更新** (未实现)
   - Tauri Updater 插件
   - 版本更新检查

4. **Crash 报告** (未实现)
   - Sentry 集成
   - 崩溃日志上传

---

**文档版本**: 1.0
**最后更新**: 2025-10-24
