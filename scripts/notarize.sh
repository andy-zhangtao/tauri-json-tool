#!/bin/bash

# JSON Formatter & Validator - 公证脚本
# 用途: 将签名的应用提交给 Apple 进行公证 (Notarization)

set -e

echo "========================================="
echo "  JSON Formatter & Validator"
echo "  Apple 公证流程"
echo "========================================="
echo ""

# 配置变量
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/dist-signed"
DMG_FILE=$(ls "$OUTPUT_DIR"/*.dmg 2>/dev/null | head -1)

if [ -z "$DMG_FILE" ]; then
    echo "❌ 错误: 未找到 DMG 文件"
    echo "请先运行: ./scripts/build-signed.sh"
    exit 1
fi

echo "📦 DMG 文件: $(basename "$DMG_FILE")"
echo ""

# 检查环境变量
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "⚠️  缺少公证所需的环境变量!"
    echo ""
    echo "请设置以下环境变量:"
    echo ""
    echo "1. 使用 App Store Connect API Key (推荐):"
    echo "   export APPLE_API_KEY_PATH=\"/path/to/AuthKey_XXXXX.p8\""
    echo "   export APPLE_API_KEY_ID=\"XXXXX\""
    echo "   export APPLE_API_ISSUER=\"xxxx-xxxx-xxxx-xxxx-xxxx\""
    echo ""
    echo "2. 或使用 Apple ID + 应用专用密码:"
    echo "   export APPLE_ID=\"your@email.com\""
    echo "   export APPLE_PASSWORD=\"abcd-efgh-ijkl-mnop\"  # 应用专用密码"
    echo "   export APPLE_TEAM_ID=\"N33BWHJDRQ\""
    echo ""
    echo "💡 如何获取应用专用密码:"
    echo "   访问 https://appleid.apple.com/account/manage"
    echo "   在"安全"部分生成"应用专用密码""
    echo ""
    exit 1
fi

# 提交公证
echo "📤 [1/3] 提交应用到 Apple 公证服务..."
echo "   (这可能需要几分钟...)"
echo ""

if [ -n "$APPLE_API_KEY_PATH" ]; then
    # 使用 API Key
    xcrun notarytool submit "$DMG_FILE" \
        --key "$APPLE_API_KEY_PATH" \
        --key-id "$APPLE_API_KEY_ID" \
        --issuer "$APPLE_API_ISSUER" \
        --wait
else
    # 使用 Apple ID + 密码
    xcrun notarytool submit "$DMG_FILE" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" \
        --wait
fi

NOTARIZE_STATUS=$?

if [ $NOTARIZE_STATUS -eq 0 ]; then
    echo ""
    echo "✅ [2/3] 公证成功!"
    echo ""
    echo "📎 [3/3] 装订公证票据到 DMG..."
    xcrun stapler staple "$DMG_FILE"

    echo ""
    echo "✅ 验证公证..."
    xcrun stapler validate "$DMG_FILE"

    echo ""
    echo "========================================="
    echo "🎉 公证完成!"
    echo "========================================="
    echo ""
    echo "📦 已公证的 DMG: $(basename "$DMG_FILE")"
    echo ""
    echo "✅ 此 DMG 现在可以分发给任何用户"
    echo "   用户双击即可安装,无需额外步骤"
    echo ""
else
    echo ""
    echo "❌ 公证失败!"
    echo ""
    echo "请检查公证日志获取详细信息:"
    echo "  xcrun notarytool log <submission-id> --apple-id $APPLE_ID --password $APPLE_PASSWORD --team-id $APPLE_TEAM_ID"
    echo ""
    exit 1
fi
