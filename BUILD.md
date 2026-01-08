# 项目打包指南

本文档将指导您如何将希沃课程录制系统打包成 Windows 或 macOS 应用程序。

## 1. 环境准备

### 1.1 安装依赖

确保您已经安装了项目所需的所有依赖：

```bash
npm install
```

### 1.2 安装 FFmpeg

在打包前，请确保您已经正确安装了 FFmpeg 并放置在项目的 `ffmpeg` 目录下。详细安装步骤请参考 `ffmpeg/README.md`。

## 2. Windows 打包

### 2.1 打包命令

使用以下命令打包 Windows 应用：

```bash
# 打包为 exe 安装包
npm run build:win

# 或者直接运行通用打包命令
npm run build
```

### 2.2 打包选项

`electron-builder` 支持多种打包格式：
- **NSIS**: 默认格式，生成 exe 安装包
- **ZIP**: 生成压缩包
- **APPX**: Windows Store 格式

您可以在 `package.json` 中配置打包选项：

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ]
    }
  }
}
```

### 2.3 打包结果

打包完成后，安装包将生成在 `dist` 目录下：
- `dist/希沃课程录制系统 Setup 1.0.0.exe` - 安装程序
- `dist/win-unpacked/` - 免安装版本

## 3. macOS 打包

### 3.1 打包命令

使用以下命令打包 macOS 应用：

```bash
# 打包为 dmg 镜像
npm run build:mac

# 或者直接运行通用打包命令
npm run build
```

### 3.2 打包选项

`electron-builder` 支持多种 macOS 打包格式：
- **DMG**: 默认格式，生成 dmg 镜像
- **ZIP**: 生成压缩包
- **PKG**: 生成 pkg 安装包
- **MAS**: Mac App Store 格式

您可以在 `package.json` 中配置打包选项：

```json
{
  "build": {
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.education",
      "icon": "assets/icon.icns"
    }
  }
}
```

### 3.3 代码签名

如果您需要发布到 Mac App Store 或者避免 Gatekeeper 警告，需要对应用进行代码签名：

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "entitlements.plist",
      "entitlementsInherit": "entitlements.plist"
    }
  }
}
```

### 3.4 打包结果

打包完成后，安装包将生成在 `dist` 目录下：
- `dist/希沃课程录制系统-1.0.0.dmg` - DMG 镜像
- `dist/mac/` - 应用程序目录

## 4. Linux 打包

如果需要 Linux 版本，可以使用以下命令：

```bash
npm run build:linux
```

支持的格式包括：AppImage、Debian、RPM、Snap 等。

## 5. 自定义打包配置

### 5.1 修改应用信息

在 `package.json` 中可以修改应用的基本信息：

```json
{
  "name": "xiwo-course-recorder",
  "version": "1.0.0",
  "description": "希沃课程录制系统",
  "author": "您的名字",
  "build": {
    "appId": "com.xiwo.courserecorder",
    "productName": "希沃课程录制系统",
    "copyright": "Copyright © 2026 您的公司"
  }
}
```

### 5.2 自定义图标

将不同格式的图标放置在 `assets` 目录：
- **Windows**: `assets/icon.ico` (256x256)
- **macOS**: `assets/icon.icns`
- **Linux**: `assets/icon.png` (512x512)

然后在 `package.json` 中配置：

```json
{
  "build": {
    "win": {
      "icon": "assets/icon.ico"
    },
    "mac": {
      "icon": "assets/icon.icns"
    },
    "linux": {
      "icon": "assets/icon.png"
    }
  }
}
```

### 5.3 配置文件关联

如果需要让应用关联特定文件类型：

```json
{
  "build": {
    "win": {
      "fileAssociations": [
        {
          "ext": "xiwo",
          "name": "Xiwo Course File",
          "role": "Editor"
        }
      ]
    }
  }
}
```

## 6. 常见问题

### 6.1 打包失败 - 依赖问题

如果打包时出现依赖相关的错误，可以尝试以下解决方法：

```bash
# 清除 node_modules 和缓存
rm -rf node_modules package-lock.json
npm cache clean --force

# 重新安装依赖
npm install
```

### 6.2 Windows 打包 - 缺少工具

Windows 打包需要安装 Windows SDK 和 .NET Framework。如果遇到错误，请安装：
- [Windows 10 SDK](https://developer.microsoft.com/zh-cn/windows/downloads/windows-10-sdk/)
- [.NET Framework 4.5](https://dotnet.microsoft.com/download/dotnet-framework/net45)

### 6.3 macOS 打包 - 权限问题

如果在 macOS 上打包时遇到权限问题，请运行：

```bash
xcode-select --install
```

### 6.4 FFmpeg 打包问题

确保 FFmpeg 已经正确放置在 `ffmpeg` 目录下，并且在 `package.json` 中配置了 `extraResources`：

```json
{
  "build": {
    "extraResources": [
      {
        "from": "ffmpeg/",
        "to": "ffmpeg/",
        "filter": ["**/*"]
      }
    ]
  }
}
```

## 7. 批量打包脚本

您可以创建一个脚本来自动打包多个平台：

### 7.1 多平台打包脚本 (`build-all.sh`)

```bash
#!/bin/bash

echo "开始打包所有平台..."

# 打包 Windows
npm run build:win

# 打包 macOS
npm run build:mac

# 打包 Linux
npm run build:linux

echo "所有平台打包完成！"
```

## 8. 分发应用

### 8.1 Windows 分发

- **安装包**: 直接分发生成的 exe 安装包
- **绿色版**: 分发 `win-unpacked` 目录，用户可以直接运行 `xiwo-course-recorder.exe`

### 8.2 macOS 分发

- **DMG 镜像**: 分发 dmg 文件，用户可以拖放安装
- **压缩包**: 分发 zip 压缩包
- **Mac App Store**: 如果需要发布到应用商店，需要进行特殊配置

## 9. 版本更新

当需要发布新版本时：

1. 修改 `package.json` 中的 `version` 字段
2. 更新 `CHANGELOG.md` 记录更新内容
3. 重新打包并发布

```bash
# 更新版本号
npm version patch  # 小版本更新 (1.0.0 -> 1.0.1)
npm version minor  # 功能更新 (1.0.0 -> 1.1.0)
npm version major  # 重大更新 (1.0.0 -> 2.0.0)
```

## 10. 自动化打包 (CI/CD)

您可以使用 GitHub Actions、GitLab CI 等工具实现自动化打包：

### GitHub Actions 示例 (`.github/workflows/build.yml`)

```yaml
name: Build Electron App

on:
  push:
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16.x'
    
    - name: Install dependencies
      run: npm install
    
    - name: Build app
      run: npm run build
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v2
      with:
        name: ${{ matrix.os }}-build
        path: dist/
```

## 11. 技术支持

如果在打包过程中遇到问题，请参考以下资源：
- [Electron Builder 文档](https://www.electron.build/)
- [Electron 官方文档](https://www.electronjs.org/docs)
- 项目仓库的 Issues 页面

---

**注意**: 打包后的应用程序会包含 FFmpeg，因此最终安装包大小会比较大（约 200MB 左右）。