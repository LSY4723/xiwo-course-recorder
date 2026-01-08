# FFmpeg 配置说明

本目录用于存放 FFmpeg 可执行文件，应用需要使用 FFmpeg 来处理屏幕录制和视频编码。

## 获取 FFmpeg

### 官方下载

您可以从 FFmpeg 官方网站下载适合您系统的版本：
- 官网：https://ffmpeg.org/download.html
- GitHub：https://github.com/FFmpeg/FFmpeg/releases

### 版本要求

建议使用 FFmpeg 5.0 或更高版本以获得最佳兼容性和性能。

## 安装指南

### Windows 系统

1. 下载 Windows 版本的 FFmpeg（通常是一个 zip 文件）
2. 解压 zip 文件
3. 将 `bin` 目录下的 `ffmpeg.exe` 复制到当前目录
4. 确保最终路径为 `./ffmpeg/ffmpeg.exe`

### macOS 系统

#### 方法 1：使用 Homebrew
```bash
brew install ffmpeg
cp $(which ffmpeg) ./ffmpeg/ffmpeg
```

#### 方法 2：手动下载
1. 下载 macOS 版本的 FFmpeg
2. 解压下载的文件
3. 将 `ffmpeg` 可执行文件复制到当前目录

### Linux 系统

#### 方法 1：使用包管理器
```bash
# Debian/Ubuntu
sudo apt update
sudo apt install ffmpeg
cp $(which ffmpeg) ./ffmpeg/ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
cp $(which ffmpeg) ./ffmpeg/ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
cp $(which ffmpeg) ./ffmpeg/ffmpeg
```

#### 方法 2：手动下载
1. 下载适合您发行版的 FFmpeg 版本
2. 解压并将可执行文件复制到当前目录

## 验证安装

安装完成后，您可以通过以下命令验证 FFmpeg 是否正确安装：

### Windows
```cmd
ffmpeg\ffmpeg.exe -version
```

### macOS/Linux
```bash
./ffmpeg/ffmpeg -version
```

如果安装成功，您将看到 FFmpeg 的版本信息和支持的编码格式。

## 支持的功能

本应用使用 FFmpeg 的以下功能：
- **屏幕捕获**：
  - Windows: gdigrab
  - macOS: avfoundation
  - Linux: x11grab
- **音频捕获**:
  - Windows: dshow
  - macOS: avfoundation
  - Linux: pulse
- **视频编码**: H.264 (libx264)
- **音频编码**: AAC
- **流媒体输出**: FLV 格式输出到 RTMP 服务器

## 常见问题

### Q: 为什么需要单独安装 FFmpeg？

A: FFmpeg 是一个独立的开源项目，由于其体积较大且许可证原因，Electron 应用通常不会内置 FFmpeg，需要用户单独安装。

### Q: FFmpeg 太大，有没有更轻量的替代方案？

A: 您可以尝试使用编译过的轻量版本，但可能会失去一些编码支持。建议使用完整版本以获得最佳体验。

### Q: 我可以使用系统已安装的 FFmpeg 吗？

A: 是的，您可以在 main.js 中修改 FFmpeg 的路径配置，指向系统已安装的版本。

### Q: 安装后仍然提示找不到 FFmpeg？

A: 
1. 检查文件路径是否正确
2. 检查文件权限（特别是 Linux/macOS）
3. 尝试重新启动应用
4. 查看应用日志获取详细错误信息

## 性能优化建议

1. **使用硬件加速**: 确保您的 FFmpeg 版本支持硬件加速编码
2. **调整参数**: 根据您的需求调整视频质量、帧率等参数
3. **关闭不必要的功能**: 例如不需要音频时可以关闭音频捕获
4. **清理磁盘**: 确保有足够的磁盘空间用于临时文件

## 技术支持

如果您在安装或使用 FFmpeg 时遇到问题，可以参考以下资源：
- FFmpeg 官方文档：https://ffmpeg.org/documentation.html
- FFmpeg 论坛：https://ffmpeg.org/forums/
- GitHub Issues：https://github.com/FFmpeg/FFmpeg/issues