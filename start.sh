#!/bin/bash

# 希沃课程录制系统启动脚本
# 支持 Linux 和 macOS 系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示标题
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    希沃课程录制系统启动器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo -e "${YELLOW}请从以下地址安装 Node.js：${NC}"
    echo -e "${YELLOW}https://nodejs.org/zh-cn/download/ ${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"

# 检查 npm 是否已安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm ${NPM_VERSION}${NC}"

# 检查 FFmpeg 是否已安装
FFMPEG_PATH="ffmpeg/ffmpeg"
if [ "$(uname -s)" = "Darwin" ]; then
    FFMPEG_PATH="ffmpeg/ffmpeg"
elif [ "$(uname -s)" = "Linux" ]; then
    FFMPEG_PATH="ffmpeg/ffmpeg"
fi

if [ ! -f "$FFMPEG_PATH" ]; then
    echo -e "${YELLOW}⚠️  FFmpeg 未找到${NC}"
    echo -e "${YELLOW}请参考 ffmpeg/README.md 安装 FFmpeg${NC}"
    echo ""
    echo -e "${YELLOW}是否继续启动？(y/N)${NC}"
    read -r response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        exit 0
    fi
else
    FFMPEG_VERSION=$("$FFMPEG_PATH" -version | head -n 1)
    echo -e "${GREEN}✅ FFmpeg 已安装${NC}"
    echo -e "${BLUE}   $FFMPEG_VERSION${NC}"
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Node.js 依赖未安装${NC}"
    echo -e "${YELLOW}是否安装依赖？(y/N)${NC}"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo -e "${BLUE}📦 正在安装依赖...${NC}"
        npm install
        echo -e "${GREEN}✅ 依赖安装完成${NC}"
    fi
fi

# 检查环境变量
echo ""
echo -e "${BLUE}🚀 正在启动应用...${NC}"

# 启动应用
if [ -d "node_modules" ]; then
    npm start
else
    echo -e "${RED}❌ 依赖未安装，无法启动应用${NC}"
    exit 1
fi