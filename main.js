const { app, BrowserWindow, systemPreferences, dialog, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');

// 配置日志系统
log.transports.file.level = 'debug';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// 确保日志目录存在
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
log.transports.file.file = path.join(logDir, 'main.log');

// 重定向console输出到日志
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;
console.debug = log.debug;

// 全局变量
let ffmpegProcess = null;
let isRecording = false;
let currentRecordingPath = null;

// 注册自定义协议以安全加载本地资源
app.whenReady().then(() => {
  // 注册自定义协议
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app:///', '');
    const filePath = path.join(__dirname, url);
    callback({ path: filePath });
  });
});

// 创建预加载脚本
function createPreloadScript() {
  const preloadContent = `
    const { contextBridge, ipcRenderer, screen } = require('electron');
    
    contextBridge.exposeInMainWorld('electronAPI', {
      // 权限相关
      checkScreenCapturePermission: () => ipcRenderer.invoke('check-screen-capture-permission'),
      requestScreenCapturePermission: () => ipcRenderer.invoke('request-screen-capture-permission'),
      checkAccessibilityPermission: () => ipcRenderer.invoke('check-accessibility-permission'),
      requestAccessibilityPermission: () => ipcRenderer.invoke('request-accessibility-permission'),
      
      // 屏幕相关
      getDisplays: () => screen.getAllDisplays(),
      
      // 文件系统相关
      readFile: (path) => ipcRenderer.invoke('read-file', path),
      writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
      
      // 系统相关
      login: (credentials) => ipcRenderer.invoke('login', credentials),
      loginSuccess: (user) => ipcRenderer.send('login-success', user),
      getUserName: () => ipcRenderer.invoke('get-user-name'),
      logout: () => ipcRenderer.invoke('logout'),
      
      // 课程数据相关
      loadCourses: () => ipcRenderer.invoke('load-courses'),
      loadMockCourses: () => ipcRenderer.invoke('load-mock-courses'),
      getCourses: () => ipcRenderer.invoke('get-courses'),
      selectCourse: (course) => ipcRenderer.invoke('select-course', course),
      
      // 录制相关
      startRecording: (options) => ipcRenderer.invoke('start-recording', options),
      stopRecording: () => ipcRenderer.invoke('stop-recording'),
      pauseRecording: () => ipcRenderer.invoke('pause-recording'),
      resumeRecording: () => ipcRenderer.invoke('resume-recording'),
      getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),
      detectAvfoundationDevices: () => ipcRenderer.invoke('detect-avfoundation-devices'),
      testFfmpeg: () => ipcRenderer.invoke('test-ffmpeg'),
      
      // 窗口相关
      hideWindow: () => ipcRenderer.invoke('hide-window'),
      showWindow: () => ipcRenderer.invoke('show-window'),
    });
  `;
  
  try {
    fs.writeFileSync(path.join(__dirname, 'preload.js'), preloadContent);
    console.log('预加载脚本已创建');
  } catch (error) {
    console.error('创建预加载脚本失败:', error);
  }
}

// IPC 主进程处理
function setupIpcHandlers() {
  // 登录处理
  ipcMain.handle('login', (event, credentials) => {
    console.log('登录请求:', credentials);
    // 这里应该实现实际的登录验证逻辑
    // 目前使用模拟登录
    if (credentials.username && credentials.password) {
      // 模拟登录成功
      return {
        success: true,
        user: {
          id: 1,
          name: credentials.username,
          role: 'teacher'
        },
        token: 'mock-token-' + Date.now()
      };
    } else {
      // 登录失败
      return {
        success: false,
        error: '用户名或密码不能为空'
      };
    }
  });

  // 登录成功事件
  ipcMain.on('login-success', (event, user) => {
    console.log('用户登录成功:', user);
    // 关闭登录窗口
    event.sender.close();
    // 创建主窗口
    createMainWindow();
  });

  // 权限检查
  ipcMain.handle('check-screen-capture-permission', () => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.getMediaAccessStatus('screen') === 'granted';
  });

  ipcMain.handle('request-screen-capture-permission', async () => {
    if (process.platform !== 'darwin') return true;
    try {
      const granted = await systemPreferences.askForMediaAccess('screen');
      return granted;
    } catch (error) {
      console.error('请求屏幕录制权限失败:', error);
      return false;
    }
  });

  ipcMain.handle('check-accessibility-permission', () => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.isTrustedAccessibilityClient(false);
  });

  ipcMain.handle('request-accessibility-permission', () => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.isTrustedAccessibilityClient(true);
  });

  // 文件系统操作
  ipcMain.handle('read-file', (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error('读取文件失败:', error);
      throw error;
    }
  });

  ipcMain.handle('write-file', (event, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('写入文件失败:', error);
      return false;
    }
  });

  // 录制操作
  ipcMain.handle('start-recording', (event, options) => {
    console.log('开始录制:', options);
    
    // 检查是否已经在录制
    if (isRecording) {
      return {
        success: false,
        error: '已经在录制中'
      };
    }
    
    // 检查FFmpeg是否存在
    if (!checkFfmpegExists()) {
      return {
        success: false,
        error: 'FFmpeg 不存在或无执行权限，请参考 ffmpeg/README.md 安装'
      };
    }
    
    // 检查屏幕录制权限（macOS）
    if (process.platform === 'darwin') {
      try {
        const screenCaptureStatus = systemPreferences.getMediaAccessStatus('screen');
        if (screenCaptureStatus !== 'granted') {
          return {
            success: false,
            error: '屏幕录制权限未授予，请在系统设置中启用'
          };
        }
      } catch (error) {
        console.warn('检查屏幕录制权限失败:', error.message);
      }
    }
    
    try {
      // 验证和处理参数
      const displayIndex = isNaN(options.displayIndex) ? 0 : parseInt(options.displayIndex);
      const recordAudio = options.recordAudio === true;
      const pushStream = options.pushStream === true;
      const streamUrl = options.streamUrl || '';
      
      const ffmpegPath = getFfmpegPath();
      const outputPath = generateOutputPath();
      currentRecordingPath = outputPath;
      
      // 构建FFmpeg命令参数
      const args = [];
      
      // 添加屏幕捕获参数
      const screenArgs = getScreenCaptureArgs(displayIndex);
      args.push(...screenArgs);
      
      // 添加音频捕获参数（如果需要）
      if (recordAudio) {
        try {
          if (process.platform === 'darwin') {
            // 在macOS上，我们需要修改屏幕捕获参数来包含音频
            // 找到-i参数的位置
            const iIndex = args.indexOf('-i');
            if (iIndex !== -1 && iIndex + 1 < args.length) {
              // 将原来的 "1:none" 改为 "1:0" 以包含音频
              const inputArg = args[iIndex + 1];
              if (inputArg.endsWith(':none')) {
                args[iIndex + 1] = inputArg.replace(':none', ':0');
              }
            }
          } else {
            // 其他平台添加单独的音频捕获
            args.push(...getAudioCaptureArgs());
          }
        } catch (error) {
          console.warn('音频捕获配置失败:', error.message);
        }
      }
      
      // 添加编码参数
      args.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y'
      );

// 添加输出路径
      if (options.pushStream && options.streamUrl) {
        // 修复tee复用器参数格式，避免SIGABRT错误
        // 使用更简单的格式，避免复杂的map参数导致FFmpeg内部错误
        args.push(
            '-f', 'tee',
            `[onfail=ignore]${options.streamUrl}|[onfail=ignore]${outputPath}`
        );
      } else {
        // 只输出到文件
        args.push(outputPath);
      }

      
      log.info('FFmpeg 命令:', args.join(' '));
      
      // 启动FFmpeg进程
      log.info('启动FFmpeg进程，路径:', ffmpegPath);
      log.info('当前工作目录:', process.cwd());
      log.info('当前用户:', process.env.USER);
      log.info('当前UID/GID:', process.getuid(), '/', process.getgid());
      
      try {
        if (fs.existsSync(ffmpegPath)) {
          const stats = fs.statSync(ffmpegPath);
          log.info('FFmpeg文件权限:', stats.mode.toString(8));
          log.info('是否可执行:', (stats.mode & 0o111) !== 0);
        } else {
          log.error('FFmpeg文件不存在:', ffmpegPath);
          throw new Error('FFmpeg文件不存在');
        }
      } catch (err) {
        log.error('检查FFmpeg文件失败:', err);
        throw err;
      }
      
      // 添加更多调试参数
      const debugArgs = [
        '-loglevel', 'verbose',  // 更详细的日志
        '-report'  // 生成详细报告文件
      ];
      
      const fullArgs = [...debugArgs, ...args];
      
      log.debug('完整FFmpeg参数:', fullArgs);
      
      ffmpegProcess = spawn(ffmpegPath, fullArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: process.env.PATH + ':' + path.dirname(ffmpegPath) },
        detached: false
      });
      isRecording = true;
      
      log.info('FFmpeg进程已启动，PID:', ffmpegProcess.pid);
      
      // 捕获FFmpeg输出
      let stderrBuffer = '';
      ffmpegProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          log.debug('FFmpeg stdout:', output);
        }
      });
      
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          stderrBuffer += output + '\n';
          // 只显示关键错误信息，避免日志过多
          if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
            log.error('FFmpeg error:', output);
          } else if (output.includes('warning') || output.includes('Warning')) {
            log.warn('FFmpeg warning:', output);
          } else {
            log.debug('FFmpeg stderr:', output);
          }
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        log.error('FFmpeg 启动失败:', error);
        log.error('错误类型:', error.code);
        log.error('错误原因:', error.message);
        
        // 常见错误处理
        if (error.code === 'ENOENT') {
          log.error('FFmpeg 可执行文件不存在，请检查路径:', ffmpegPath);
          log.error('是否存在该文件:', fs.existsSync(ffmpegPath));
          if (fs.existsSync(ffmpegPath)) {
            log.error('文件存在但无法执行，可能是架构不兼容');
          }
        } else if (error.code === 'EACCES') {
          log.error('FFmpeg 没有执行权限，请执行: chmod +x', ffmpegPath);
          try {
            const stats = fs.statSync(ffmpegPath);
            log.error('文件权限:', stats.mode.toString(8));
            log.error('是否可执行:', (stats.mode & 0o111) !== 0);
          } catch (e) {
            log.error('无法获取文件权限:', e.message);
          }
        } else if (error.code === 'EPERM') {
          log.error('没有足够的权限进行屏幕录制，请在系统设置中授予权限');
          // 提供具体的设置步骤
          log.error('设置步骤:');
          log.error('1. 打开系统设置 -> 隐私与安全性 -> 屏幕录制');
          log.error('2. 确保您的应用程序已被勾选');
          log.error('3. 如果没有看到应用程序，点击"+"按钮添加');
          log.error('4. 重启应用程序');
        } else if (error.code === 'ETIMEDOUT') {
          log.error('FFmpeg 启动超时');
        }
        
        isRecording = false;
        ffmpegProcess = null;
      });
      
      ffmpegProcess.on('close', (code, signal) => {
        log.info('FFmpeg 进程结束，退出码:', code, '信号:', signal);
        
        // 保存完整的stderr输出到文件
        if (stderrBuffer) {
          const logDir = path.join(app.getPath('userData'), 'logs');
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          const logPath = path.join(logDir, `ffmpeg_stderr_${Date.now()}.log`);
          fs.writeFileSync(logPath, stderrBuffer);
          log.info('FFmpeg完整日志已保存到:', logPath);
          log.debug('FFmpeg stderr内容:', stderrBuffer);
        }
        
        isRecording = false;
        ffmpegProcess = null;
        
        if (signal) {
          log.error('FFmpeg 被信号终止:', signal);
          
          if (signal === 'SIGSEGV') {
            log.error('FFmpeg 段错误崩溃 (SIGSEGV)');
            console.error('可能原因:');
            console.error('1. FFmpeg版本与系统不兼容');
            console.error('2. 参数组合有问题');
            console.error('3. 硬件驱动问题');
            console.error('4. 内存损坏');
            console.error('解决方案:');
            console.error('1. 尝试使用不同版本的FFmpeg');
            console.error('2. 简化参数，逐步添加');
            console.error('3. 更新系统和驱动');
            console.error('4. 运行内存诊断工具');
          } else if (signal === 'SIGABRT') {
            console.error('FFmpeg 被系统终止 (SIGABRT)');
            console.error('可能原因:');
            console.error('1. 系统安全策略拦截');
            console.error('2. 屏幕录制权限不足');
            console.error('3. 系统完整性保护限制');
            console.error('4. FFmpeg内部断言失败');
            console.error('解决方案:');
            console.error('1. 检查并授予屏幕录制权限');
            console.error('2. 检查系统完整性保护设置');
            console.error('3. 尝试使用非静态编译的FFmpeg');
            console.error('4. 查看FFmpeg生成的report文件');
          } else if (signal === 'SIGKILL') {
            console.error('FFmpeg 被强制杀死 (SIGKILL)');
            console.error('可能原因: 系统资源不足或OOM killer');
          }
          
          // macOS特定建议
          if (process.platform === 'darwin') {
            console.error('macOS 特定排查:');
            console.error('1. 检查屏幕录制权限是否正确授予');
            console.error('2. 尝试在终端中手动运行FFmpeg命令');
            console.error('3. 检查系统完整性保护状态');
            console.error('4. 尝试重新安装FFmpeg');
          }
        } else if (code !== 0 && code !== null) {
          console.error('FFmpeg 异常退出，退出码:', code);
          
          // 常见退出码含义
          if (code === 1) {
            console.error('FFmpeg 遇到一般错误');
          } else if (code === 2) {
            console.error('FFmpeg 遇到严重错误');
          } else if (code === 126) {
            console.error('无法执行FFmpeg，权限不足');
          } else if (code === 127) {
            console.error('找不到FFmpeg可执行文件');
          } else if (code === 130) {
            console.error('FFmpeg 被用户中断 (Ctrl+C)');
          }
        } else if (code === 0) {
          console.log('FFmpeg 录制成功完成');
        }
      });
      
      return {
        success: true,
        status: 'started',
        outputPath: outputPath
      };
      
    } catch (error) {
      console.error('开始录制失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('stop-recording', () => {
    console.log('停止录制');
    
    if (!isRecording || !ffmpegProcess) {
      return {
        success: false,
        error: '没有正在进行的录制'
      };
    }
    
    try {
      // 向FFmpeg进程发送q命令优雅停止
      ffmpegProcess.stdin.write('q\n');
      
      // 设置超时强制终止
      setTimeout(() => {
        if (ffmpegProcess && !ffmpegProcess.killed) {
          console.warn('FFmpeg 未响应，强制终止');
          ffmpegProcess.kill('SIGKILL');
        }
      }, 5000);
      
      const outputPath = currentRecordingPath;
      currentRecordingPath = null;
      
      return {
        success: true,
        status: 'stopped',
        outputPath: outputPath
      };
      
    } catch (error) {
      console.error('停止录制失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('pause-recording', () => {
    console.log('暂停录制');
    
    if (!isRecording || !ffmpegProcess) {
      return {
        success: false,
        error: '没有正在进行的录制'
      };
    }
    
    try {
      // 向FFmpeg进程发送p命令暂停
      ffmpegProcess.stdin.write('p\n');
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('暂停录制失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('resume-recording', () => {
    console.log('恢复录制');
    
    if (!isRecording || !ffmpegProcess) {
      return {
        success: false,
        error: '没有正在进行的录制'
      };
    }
    
    try {
      // 向FFmpeg进程发送p命令恢复
      ffmpegProcess.stdin.write('p\n');
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('恢复录制失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 测试FFmpeg基本功能
  ipcMain.handle('test-ffmpeg', async () => {
    return new Promise((resolve) => {
      const ffmpegPath = getFfmpegPath();
      
      // 测试FFmpeg版本
      const versionProcess = spawn(ffmpegPath, ['-version']);
      
      versionProcess.on('error', (error) => {
        resolve({
          success: false,
          error: 'FFmpeg测试失败',
          details: error.message
        });
      });
      
      versionProcess.on('close', (code) => {
        if (code === 0) {
          // 测试设备检测
          if (process.platform === 'darwin') {
            detectAvfoundationDevices().then(devices => {
              resolve({
                success: true,
                message: 'FFmpeg工作正常',
                devices: devices
              });
            }).catch(error => {
              resolve({
                success: true,
                message: 'FFmpeg工作正常，但设备检测失败',
                details: error.message
              });
            });
          } else {
            resolve({
              success: true,
              message: 'FFmpeg工作正常'
            });
          }
        } else {
          resolve({
            success: false,
            error: 'FFmpeg版本测试失败',
            exitCode: code
          });
        }
      });
    });
  });

  // 窗口操作
  ipcMain.handle('open-dev-tools', (event) => {
    event.sender.openDevTools();
    return true;
  });

  // 系统信息
  ipcMain.handle('get-user-name', () => {
    // 这里可以从系统或配置中获取用户名
    return '用户';
  });

  ipcMain.handle('logout', () => {
    console.log('用户退出登录');
    // 这里可以添加退出登录的逻辑
    return true;
  });

  // 课程数据
  ipcMain.handle('load-courses', () => {
    // 这里应该从实际数据源加载课程
    console.log('加载课程列表');
    return [];
  });

  ipcMain.handle('get-courses', () => {
    // 兼容前端使用'get-courses'的调用
    console.log('加载课程列表 (兼容get-courses调用)');
    return {
      success: true,
      courses: [
       {
                   id: 'mock-001',
                   name: '前端开发入门（演示）',
                   teacher: '张老师',
                   startTime: '2026-01-06 09:00',
                   endTime: '2026-01-06 11:00',
                   streamUrl: 'rtmp://wspush.qingbeikeji.com/live/peiyou2792072stumodeldevrandom'
               },
               {
                   id: 'mock-002',
                   name: 'Python数据分析（演示）',
                   teacher: '李老师',
                   startTime: '2026-01-07 14:00',
                   endTime: '2026-01-07 16:00',
                   streamUrl: 'rtmp://wspush.qingbeikeji.com/live/peiyou2792072modeldevrandom'
               }
      ]
    };
  });

  ipcMain.handle('load-mock-courses', () => {
    // 返回演示课程数据
    return [
      {
                  id: 'mock-001',
                  name: '前端开发入门（演示）',
                  teacher: '张老师',
                  startTime: '2026-01-06 09:00',
                  endTime: '2026-01-06 11:00',
                  streamUrl: 'rtmp://wspush.qingbeikeji.com/live/peiyou2792072stumodeldevrandom'
              },
              {
                  id: 'mock-002',
                  name: 'Python数据分析（演示）',
                  teacher: '李老师',
                  startTime: '2026-01-07 14:00',
                  endTime: '2026-01-07 16:00',
                  streamUrl: 'rtmp://wspush.qingbeikeji.com/live/peiyou2792072modeldevrandom'
              }
    ];
  });

  // 选择课程
  ipcMain.handle('select-course', (event, course) => {
    console.log('选择课程:', course);
    // 这里可以添加选择课程的逻辑
    return {
      success: true
    };
  });

  // 获取录制状态
  ipcMain.handle('get-recording-status', () => {
    console.log('获取录制状态');
    // 返回当前录制状态
    return {
      isRecording: isRecording,
      currentCourse: null,
      currentRecordingPath: currentRecordingPath
    };
  });

  // 检测AVFoundation设备（仅macOS）
  ipcMain.handle('detect-avfoundation-devices', async () => {
    if (process.platform !== 'darwin') {
      return {
        success: true,
        devices: []
      };
    }
    
    try {
      const devices = await detectAvfoundationDevices();
      return {
        success: true,
        devices: devices
      };
    } catch (error) {
      console.error('检测AVFoundation设备失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 窗口控制
  ipcMain.handle('hide-window', (event) => {
    event.sender.getOwnerBrowserWindow().hide();
    return true;
  });

  ipcMain.handle('show-window', (event) => {
    event.sender.getOwnerBrowserWindow().show();
    return true;
  });
}

// 检查并请求所有必要权限
async function checkAndRequestAllPermissions() {
  let hasAllPermissions = true;

  if (process.platform === 'darwin') {
    // 检查屏幕录制权限
    const screenCaptureStatus = systemPreferences.getMediaAccessStatus('screen');
    if (screenCaptureStatus !== 'granted') {
      try {
        const granted = await systemPreferences.askForMediaAccess('screen');
        if (!granted) {
          dialog.showMessageBoxSync({
            type: 'warning',
            title: '屏幕录制权限',
            message: '需要屏幕录制权限才能正常工作',
            detail: '请在系统设置中手动授予权限:\n1. 打开系统设置 > 隐私与安全性\n2. 选择屏幕录制\n3. 勾选您的应用程序'
          });
          hasAllPermissions = false;
        }
      } catch (error) {
        console.error('请求屏幕录制权限失败:', error);
        hasAllPermissions = false;
      }
    }

    // 检查辅助功能权限
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!isTrusted) {
      dialog.showMessageBoxSync({
        type: 'warning',
        title: '辅助功能权限',
        message: '需要辅助功能权限才能正常工作',
        detail: '请在系统设置中手动授予权限:\n1. 打开系统设置 > 隐私与安全性\n2. 选择辅助功能\n3. 勾选您的终端应用（如Terminal或iTerm2）\n4. 勾选您的应用程序'
      });
      hasAllPermissions = false;
    }
  }

  return hasAllPermissions;
}

function createWindow() {
  // 创建预加载脚本
  createPreloadScript();

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // 加载登录页面
  mainWindow.loadFile('login.html').catch(err => {
    console.error('加载登录页面失败:', err);
    // 尝试加载主页面
    mainWindow.loadFile('main.html').catch(err2 => {
      console.error('加载主页面也失败:', err2);
      // 显示错误页面
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
        <head><title>加载失败</title></head>
        <body>
          <h1>无法加载应用</h1>
          <p>错误: ${err.message}</p>
          <p>请检查HTML文件是否存在</p>
        </body>
        </html>
      `)}`);
    });
  });

  // 打开开发者工具（开发环境）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function createMainWindow() {
  // 创建预加载脚本
  createPreloadScript();

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // 加载主页面
  mainWindow.loadFile('main.html').catch(err => {
    console.error('加载主页面失败:', err);
    // 显示错误页面
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <html>
      <head><title>加载失败</title></head>
      <body>
        <h1>无法加载主页面</h1>
        <p>错误: ${err.message}</p>
        <p>请检查HTML文件是否存在</p>
      </body>
      </html>
    `)}`);
  });

  // 打开开发者工具（开发环境）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  // 设置IPC处理器
  setupIpcHandlers();

  // 检查权限
  const hasAllPermissions = await checkAndRequestAllPermissions();

  if (hasAllPermissions) {
    console.log('所有权限已授予，创建主窗口');
    createWindow();
  } else {
    console.log('部分权限未授予，仍创建窗口供用户设置');
    createWindow();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// FFmpeg 相关函数
function getFfmpegPath() {
  let ffmpegPath = '';
  
  switch (process.platform) {
    case 'win32':
      ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
      break;
    case 'darwin':
    case 'linux':
      ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg');
      break;
    default:
      ffmpegPath = 'ffmpeg';
  }
  
  log.debug('FFmpeg路径计算:', ffmpegPath);
  log.debug('__dirname:', __dirname);
  log.debug('是否存在:', fs.existsSync(ffmpegPath));
  
  if (fs.existsSync(ffmpegPath)) {
    try {
      const stats = fs.statSync(ffmpegPath);
      log.debug('文件权限:', stats.mode.toString(8));
      log.debug('是否可执行:', (stats.mode & 0o111) !== 0);
    } catch (err) {
      log.error('获取文件信息失败:', err);
    }
  }
  
  return ffmpegPath;
}

function detectAvfoundationDevices() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin') {
      resolve([]);
      return;
    }
    
    const ffmpegPath = getFfmpegPath();
    const args = ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''];
    
    const process = spawn(ffmpegPath, args);
    let output = '';
    
    process.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      const devices = [];
      const lines = output.split('\n');
      
      let inVideoDevices = false;
      let inAudioDevices = false;
      
      lines.forEach(line => {
        if (line.includes('AVFoundation video devices:')) {
          inVideoDevices = true;
          inAudioDevices = false;
        } else if (line.includes('AVFoundation audio devices:')) {
          inVideoDevices = false;
          inAudioDevices = true;
        } else if (inVideoDevices && line.trim().startsWith('[')) {
          // 解析视频设备
          const match = line.match(/\[(\d+)\] (.*)/);
          if (match) {
            devices.push({
              type: 'video',
              index: parseInt(match[1]),
              name: match[2].trim()
            });
          }
        } else if (inAudioDevices && line.trim().startsWith('[')) {
          // 解析音频设备
          const match = line.match(/\[(\d+)\] (.*)/);
          if (match) {
            devices.push({
              type: 'audio',
              index: parseInt(match[1]),
              name: match[2].trim()
            });
          }
        }
      });
      
      resolve(devices);
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

function checkFfmpegExists() {
  const ffmpegPath = getFfmpegPath();
  try {
    fs.accessSync(ffmpegPath, fs.constants.X_OK);
    return true;
  } catch (error) {
    console.error('FFmpeg 不存在或无执行权限:', error.message);
    return false;
  }
}

function getScreenCaptureArgs(displayIndex = 0) {
  const args = [];
  
  switch (process.platform) {
    case 'win32':
      // Windows 屏幕捕获
      args.push('-f', 'gdigrab', '-i', 'desktop');
      break;
    case 'darwin':
      // macOS 屏幕捕获
      // 在macOS上，AVFoundation设备索引从1开始，0是默认输入
      // 格式: "1:0" 表示第一个屏幕，不包含音频
      args.push('-f', 'avfoundation', '-framerate', '30', '-pixel_format', 'uyvy422', '-i', `${displayIndex + 1}:none`);
      break;
    case 'linux':
      // Linux 屏幕捕获
      args.push('-f', 'x11grab', '-i', `${process.env.DISPLAY}.0`);
      break;
    default:
      throw new Error('不支持的操作系统');
  }
  
  return args;
}

function getAudioCaptureArgs() {
  const args = [];
  
  switch (process.platform) {
    case 'win32':
      // Windows 音频捕获
      args.push('-f', 'dshow', '-i', 'audio="麦克风 (Realtek Audio)"');
      break;
    case 'darwin':
      // macOS 音频捕获
      // 单独的音频捕获设备
      args.push('-f', 'avfoundation', '-i', `:0`);
      break;
    case 'linux':
      // Linux 音频捕获
      args.push('-f', 'pulse', '-i', 'default');
      break;
    default:
      throw new Error('不支持的操作系统');
  }
  
  return args;
}

function generateOutputPath() {
  const date = new Date();
  const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
  
  const outputDir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  return path.join(outputDir, `recording_${timestamp}.mp4`);
}