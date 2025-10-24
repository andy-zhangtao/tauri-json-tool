#!/bin/bash

# JSON Formatter & Validator - 签名打包脚本
# 用途: 构建、签名并生成 macOS 分发包

set -e  # 遇到错误立即退出

echo "========================================="
echo "  JSON Formatter & Validator"
echo "  macOS 签名打包流程"
echo "========================================="
echo ""

# 配置变量
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
BUNDLE_DIR="$TAURI_DIR/target/release/bundle"
OUTPUT_DIR="$PROJECT_ROOT/dist-signed"
VERSION=$(grep '"version"' "$TAURI_DIR/tauri.conf.json" | head -1 | sed 's/.*: "\(.*\)".*/\1/')
APP_NAME="JSON Formatter & Validator"
IDENTITY="Developer ID Application: Zhangtao zhang (N33BWHJDRQ)"

echo "📋 构建信息:"
echo "   版本: $VERSION"
echo "   签名身份: $IDENTITY"
echo "   输出目录: $OUTPUT_DIR"
echo ""

# 步骤 1: 清理旧构建产物
echo "🧹 [1/5] 清理旧构建产物..."
rm -rf "$BUNDLE_DIR"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 步骤 2: 构建前端
echo "🔨 [2/5] 构建前端资源..."
cd "$PROJECT_ROOT"
npm run build

# 步骤 3: 构建并签名 Tauri 应用
echo "📦 [3/5] 构建并签名 macOS 应用..."
cd "$PROJECT_ROOT"
npm run tauri:build

# 步骤 4: 验证签名
echo "✅ [4/5] 验证应用签名..."
APP_PATH="$BUNDLE_DIR/macos/$APP_NAME.app"
if [ -d "$APP_PATH" ]; then
    echo "   检查应用: $APP_PATH"
    codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep -E "(Authority|TeamIdentifier|Identifier)"

    # 验证签名完整性
    if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
        echo "   ✓ 签名验证通过"
    else
        echo "   ✗ 签名验证失败"
        exit 1
    fi
else
    echo "   ✗ 未找到应用包: $APP_PATH"
    exit 1
fi

# 步骤 5: 生成校验和并复制产物
echo "📝 [5/5] 生成校验和并整理产物..."

# 复制 .app 包
if [ -d "$APP_PATH" ]; then
    cp -R "$APP_PATH" "$OUTPUT_DIR/"
    echo "   ✓ 已复制 .app 包"
fi

# 复制 DMG
DMG_PATH="$BUNDLE_DIR/dmg/$APP_NAME"_"$VERSION"_"*_aarch64.dmg"
if ls $DMG_PATH 1> /dev/null 2>&1; then
    cp $DMG_PATH "$OUTPUT_DIR/"
    echo "   ✓ 已复制 DMG"
else
    # 尝试其他可能的命名
    DMG_PATH="$BUNDLE_DIR/dmg/"*.dmg
    if ls $DMG_PATH 1> /dev/null 2>&1; then
        cp $DMG_PATH "$OUTPUT_DIR/"
        echo "   ✓ 已复制 DMG"
    fi
fi

# 生成校验和
cd "$OUTPUT_DIR"
for file in *.dmg; do
    if [ -f "$file" ]; then
        shasum -a 256 "$file" > "$file.sha256"
        echo "   ✓ 生成校验和: $file.sha256"
    fi
done

echo ""
echo "========================================="
echo "✅ 构建完成!"
echo "========================================="
echo ""
echo "📂 产物位置: $OUTPUT_DIR"
echo ""
echo "📦 生成的文件:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "🔒 签名验证通过,可以分发"
echo ""
echo "⚠️  注意: 虽然应用已签名,但未公证 (notarized)"
echo "   用户首次打开时可能需要:"
echo "   1. 右键点击 → 打开"
echo "   2. 或前往 系统设置 → 隐私与安全性 → 允许"
echo ""
echo "💡 如需公证,请运行: ./scripts/notarize.sh"
echo ""
