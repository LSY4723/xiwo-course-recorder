# 希沃课程录制系统

一个基于 Electron + FFmpeg 开发的跨平台课程录制应用，支持屏幕录制、音频采集和实时推流到网宿云。

## 功能特性

### 🎥 核心功能
- **跨平台支持**: 支持 Windows、macOS 和 Linux 系统
- **屏幕录制**: 支持多显示器选择，高清屏幕捕获
- **音频采集**: 支持麦克风音频录制，可自由开启/关闭
- **实时推流**: 支持将录制内容实时推流到网宿云直播服务器
- **课程管理**: 内置课程选择功能，自动关联课程信息
- **文件保存**: 自动保存录制文件到本地文档目录

### 🎨 界面特性
- **现代化 UI**: 采用简洁直观的界面设计
- **响应式布局**: 适配不同屏幕尺寸
- **深色模式**: 自动适配系统深色模式
- **快捷键支持**: 支持键盘快捷操作
- **实时状态反馈**: 显示录制时长、状态等信息

### 🔧 技术特性
- **Electron**: 基于 Chromium 和 Node.js 的跨平台框架
- **FFmpeg**: 专业的音视频处理工具
- **Fluent-FFmpeg**: FFmpeg 的 Node.js 封装
- **原生 API**: 调用系统原生能力实现屏幕捕获
- **模块化设计**: 清晰的代码结构，易于维护和扩展

## 安装步骤

### 1. 环境准备

- **Node.js**: 版本 16.x 或更高
- **Git**: 用于克隆项目
- **FFmpeg**: 需要手动安装 FFmpeg 并配置到项目中

### 2. 克隆项目

```bash
git clone <repository-url>
cd xiwo-course-recorder
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置 FFmpeg

#### Windows 系统
1. 从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载 Windows 版本
2. 解压后将 `ffmpeg.exe` 复制到项目的 `ffmpeg` 目录
3. 确保路径为 `./ffmpeg/ffmpeg.exe`

#### macOS 系统
1. 使用 Homebrew 安装:
```bash
brew install ffmpeg
```
2. 复制 ffmpeg 到项目目录:
```bash
cp $(which ffmpeg) ./ffmpeg/ffmpeg
```

#### Linux 系统
1. 使用包管理器安装:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```
2. 复制 ffmpeg 到项目目录:
```bash
cp $(which ffmpeg) ./ffmpeg/ffmpeg
```

### 5. 运行应用

```bash
npm start
```

## 使用指南

### 登录系统
1. 打开应用后，在登录界面输入用户名和密码
2. 勾选"记住密码"可自动保存登录信息
3. 点击"登录"进入主界面

### 选择课程
1. 登录成功后，系统会自动加载课程列表
2. 找到需要录制的课程，点击课程卡片
3. 系统会自动切换到录制控制面板

### 录制设置
- **显示器选择**: 选择要录制的显示器（支持多显示器）
- **录制音频**: 开启/关闭麦克风音频录制
- **实时推流**: 开启/关闭实时推流到网宿云

### 开始录制
1. 确认录制设置无误后，点击"开始录制"按钮
2. 系统会开始录制屏幕内容，并显示录制状态
3. 录制过程中可以随时点击"停止录制"结束录制

### 录制快捷键
- `Ctrl/Cmd + R`: 开始/停止录制
- `ESC`: 停止当前录制

## 项目结构

```
xiwo-course-recorder/
├── main.js                 # Electron 主进程文件
├── package.json            # 项目配置文件
├── login.html              # 登录界面
├── main.html               # 主界面
├── styles/                 # 样式目录
│   ├── login.css          # 登录界面样式
│   └── main.css           # 主界面样式
├── scripts/                # JavaScript 目录
│   ├── login.js           # 登录界面逻辑
│   └── main.js            # 主界面逻辑
├── ffmpeg/                # FFmpeg 目录
│   └── ffmpeg(ffmpeg.exe) # FFmpeg 可执行文件
├── assets/                 # 资源目录
│   └── icon.png           # 应用图标
└── docs/                   # 文档目录
    └── api.md             # API 文档
```

## 构建打包

### 打包当前平台

```bash
npm run build
```

### 打包指定平台

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### 打包说明
- 打包后的文件将生成在 `dist` 目录
- 支持生成安装包（exe、dmg、deb 等）
- 自动包含 FFmpeg 依赖

## 配置说明

### 网宿推流配置

在 `main.js` 中修改课程的推流地址:

```javascript
streamUrl: 'rtmp://push.wscdn.com/live/your-stream-key'
```

### 录制参数配置

在 `main.js` 的 `startRecording` 函数中修改:

- `framerate`: 帧率（默认 30）
- `video_size`: 视频尺寸（自动获取显示器分辨率）
- `crf`: 视频质量（默认 23，值越小质量越高）
- `b:a`: 音频比特率（默认 128k）

## 常见问题

### Q: FFmpeg 未找到怎么办？

A: 请确保 FFmpeg 已正确安装在项目的 `ffmpeg` 目录下，或者手动设置 FFmpeg 路径:

```javascript
ffmpeg.setFfmpegPath('/path/to/ffmpeg');
```

### Q: 无法录制屏幕怎么办？

A: 
- Windows: 请确保应用有屏幕捕获权限
- macOS: 请在"系统设置-隐私与安全性"中给予屏幕录制权限
- Linux: 可能需要安装额外的依赖（如 x11grab）

### Q: 推流失败怎么办？

A: 
1. 检查推流地址和密钥是否正确
2. 确认网络连接正常
3. 检查网宿云直播配置
4. 查看应用日志获取详细错误信息

### Q: 录制的文件太大怎么办？

A: 
- 降低视频质量（增大 crf 值）
- 降低帧率
- 调整视频分辨率
- 使用更高效的编码格式

## 开发指南

### 技术栈

- **Electron**: 28.0.0+
- **Node.js**: 16.0.0+
- **FFmpeg**: 5.0.0+
- **Fluent-FFmpeg**: 2.1.2+
- **HTML5/CSS3**: 现代 Web 技术

### 开发环境搭建

1. 安装 Node.js 和 npm
2. 克隆项目到本地
3. 安装依赖: `npm install`
4. 运行开发服务器: `npm start`

### 代码规范

- 遵循 ES6+ 语法
- 使用语义化的变量和函数命名
- 代码注释清晰
- 保持代码简洁和模块化

## 更新日志

### v1.0.0 (2026-01-06)

- ✨ 初始版本发布
- ✨ 支持屏幕录制和音频采集
- ✨ 支持实时推流到网宿云
- ✨ 实现课程选择功能
- ✨ 跨平台支持 Windows、macOS、Linux
- ✨ 现代化 UI 界面
- ✨ 快捷键支持
- ✨ 自动保存录制文件

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系:
- 提交 GitHub Issue
- 发送邮件到 <support@example.com>

---

**注意**: 请确保在使用本应用时遵守相关法律法规，未经授权不得录制他人内容。