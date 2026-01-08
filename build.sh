#!/bin/bash

echo "=== 希沃课程录制系统构建脚本 ==="

# 检查Node.js和npm是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装成功"
else
    echo "✅ 依赖已安装"
fi

# 检查FFmpeg是否已安装
if [ ! -f "ffmpeg/ffmpeg" ] && [ ! -f "ffmpeg/ffmpeg.exe" ]; then
    echo "⚠️  未找到FFmpeg可执行文件"
    echo "请按照 ffmpeg/README.md 安装FFmpeg"
    read -p "是否继续构建? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 清理之前的构建产物
if [ -d "dist" ]; then
    echo "🧹 清理之前的构建产物..."
    rm -rf dist
fi

# 构建应用
echo "🚀 开始构建应用..."

# 根据当前平台选择构建命令
case "$(uname -s)" in
    Darwin*) 
        echo "构建 macOS 版本..."
        npm run build:mac
        ;;
    Linux*) 
        echo "构建 Linux 版本..."
        npm run build:linux
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) 
        echo "构建 Windows 版本..."
        npm run build:win
        ;;
    *) 
        echo "未知平台，尝试通用构建..."
        npm run build
        ;;
esac

# 检查构建结果
if [ $? -eq 0 ] && [ -d "dist" ]; then
    echo "🎉 构建成功！"
    echo "📦 构建产物位于: dist/"
    ls -lh dist/
else
    echo "❌ 构建失败"
    exit 1
fi

# 显示后续步骤
echo -e "\n📋 后续步骤:"
echo "1. 测试应用: 运行 dist/ 目录中的应用程序"
echo "2. 分发应用: 将构建产物分发给用户"
echo "3. 签名应用: 如果需要发布到应用商店，请进行代码签名"
echo -e "\nℹ️  提示:"
echo "- 如果构建失败，请查看错误日志"
echo "- 可以尝试删除 node_modules 和 package-lock.json 后重新安装"
echo "- 网络问题可以配置国内镜像: .npmrc 文件已配置国内镜像"