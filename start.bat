@echo off
chcp 65001 >nul

set "SCRIPT_NAME=希沃课程录制系统启动器"
set "NODE_URL=https://nodejs.org/zh-cn/download/"
set "FFMPEG_GUIDE=ffmpeg\README.md"

echo ========================================
echo          %SCRIPT_NAME%
echo ========================================
echo.

REM 检查 Node.js 是否已安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装
    echo 请从以下地址安装 Node.js：
    echo %NODE_URL%
    pause
    exit /b 1
)

for /f %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM 检查 npm 是否已安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm 未安装
    pause
    exit /b 1
)

for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM 检查 FFmpeg 是否已安装
if not exist "ffmpeg\ffmpeg.exe" (
    echo [WARNING] FFmpeg 未找到
    echo 请参考 %FFMPEG_GUIDE% 安装 FFmpeg
    echo.
    set /p "CONTINUE=是否继续启动？(y/N) "
    if /i not "!CONTINUE!"=="y" (
        exit /b 0
    )
) else (
    for /f %%i in ('ffmpeg\ffmpeg.exe -version 2^>^&1 ^| findstr /i "ffmpeg version"') do set FFMPEG_INFO=%%i
    echo [OK] FFmpeg 已安装
    echo      %FFMPEG_INFO%
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo [WARNING] Node.js 依赖未安装
    set /p "INSTALL_DEPS=是否安装依赖？(y/N) "
    if /i "!INSTALL_DEPS!"=="y" (
        echo [INSTALL] 正在安装依赖...
        npm install
        if %errorlevel% equ 0 (
            echo [OK] 依赖安装完成
        ) else (
            echo [ERROR] 依赖安装失败
            pause
            exit /b 1
        )
    )
)

echo.
echo [START] 正在启动应用...
echo.

REM 启动应用
if exist "node_modules" (
    npm start
) else (
    echo [ERROR] 依赖未安装，无法启动应用
    pause
    exit /b 1
)

pause