
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
  