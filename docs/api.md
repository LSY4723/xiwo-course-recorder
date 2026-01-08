# API 集成指南

本文档说明如何将希沃课程录制系统与实际的后端 API 集成，替换当前的模拟数据。

## 登录接口集成

### 1. 修改认证逻辑

在 `main.js` 中找到 `authenticateUser` 函数，替换为实际的 API 调用：

```javascript
const authenticateUser = (username, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.post('https://your-api-domain/api/login', {
        username,
        password
      });
      
      if (response.data.success) {
        resolve({
          success: true,
          token: response.data.token,
          user: response.data.user
        });
      } else {
        reject(new Error(response.data.message || '登录失败'));
      }
    } catch (error) {
      reject(new Error(error.response?.data?.message || '网络错误'));
    }
  });
};
```

### 2. 请求头配置

为 API 请求添加认证头：

```javascript
const axiosInstance = axios.create({
  baseURL: 'https://your-api-domain/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('xiwo-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

## 课程列表接口集成

### 1. 修改课程获取逻辑

在 `main.js` 中找到 `getCourses` 函数，替换为实际的 API 调用：

```javascript
const getCourses = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/courses');
      
      if (response.data.success) {
        resolve(response.data.courses);
      } else {
        reject(new Error(response.data.message || '获取课程失败'));
      }
    } catch (error) {
      reject(new Error(error.response?.data?.message || '网络错误'));
    }
  });
};
```

### 2. 课程数据结构

后端 API 应返回以下格式的课程数据：

```json
{
  "success": true,
  "courses": [
    {
      "id": "course-001",
      "name": "前端开发入门",
      "teacher": "张老师",
      "startTime": "2026-01-06 09:00",
      "endTime": "2026-01-06 11:00",
      "streamUrl": "rtmp://push.wscdn.com/live/course001?auth_key=123456",
      "description": "HTML/CSS/JavaScript 基础入门"
    }
  ]
}
```

## 推流地址集成

### 1. 动态获取推流地址

可以在选择课程时动态获取推流地址：

```javascript
const getStreamUrl = (courseId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/courses/${courseId}/stream`);
      
      if (response.data.success) {
        resolve(response.data.streamUrl);
      } else {
        reject(new Error(response.data.message || '获取推流地址失败'));
      }
    } catch (error) {
      reject(new Error(error.response?.data?.message || '网络错误'));
    }
  });
};
```

### 2. 网宿云集成

网宿云推流地址通常格式如下：
```
rtmp://push.wscdn.com/live/stream-key?auth_key=xxx
```

需要在后端实现网宿云的鉴权逻辑，生成有效的推流地址。

## 录制记录上报

### 1. 上报录制开始事件

```javascript
const reportRecordingStart = (courseId, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post('/recordings/start', {
        courseId,
        displayIndex: options.displayIndex,
        recordAudio: options.recordAudio,
        pushStream: options.pushStream,
        startTime: new Date().toISOString()
      });
      
      resolve(response.data);
    } catch (error) {
      reject(error);
    }
  });
};
```

### 2. 上报录制完成事件

```javascript
const reportRecordingEnd = (recordingId, filePath, duration) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post('/recordings/end', {
        recordingId,
        filePath,
        duration,
        endTime: new Date().toISOString()
      });
      
      resolve(response.data);
    } catch (error) {
      reject(error);
    }
  });
};
```

## 错误处理

### 1. 统一错误处理

```javascript
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // 请求已发出，服务器响应状态码不在 2xx 范围
    switch (error.response.status) {
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '权限不足，无法执行此操作';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器内部错误，请稍后重试';
      default:
        return error.response.data.message || `请求失败，状态码：${error.response.status}`;
    }
  } else if (error.request) {
    // 请求已发出，但没有收到响应
    return '网络连接异常，请检查网络设置';
  } else {
    // 其他错误
    return error.message || '请求失败';
  }
};
```

### 2. 重新登录机制

```javascript
const handleUnauthorized = async () => {
  localStorage.removeItem('xiwo-token');
  localStorage.removeItem('xiwo-current-user');
  
  // 显示重新登录提示
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: '登录过期',
    message: '您的登录已过期，请重新登录',
    buttons: ['确定']
  });
  
  if (result.response === 0) {
    // 关闭主窗口，打开登录窗口
    if (mainWindow) {
      mainWindow.close();
    }
    createLoginWindow();
  }
};
```

## 日志上报

### 1. 上报应用日志

```javascript
const reportLog = (level, message, context = {}) => {
  try {
    axiosInstance.post('/logs', {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userId: localStorage.getItem('xiwo-user-id'),
      appVersion: app.getVersion(),
      platform: process.platform
    });
  } catch (error) {
    console.error('Failed to report log:', error);
  }
};
```

## 安全考虑

### 1. HTTPS 要求

确保所有 API 请求使用 HTTPS 协议，防止数据泄露。

### 2. 令牌存储

使用安全的方式存储认证令牌：

```javascript
// 不建议使用 localStorage 存储敏感信息
// 考虑使用 secure-electron-store 或类似库
const store = new SecureElectronStore({
  configName: 'user-preferences',
  encryptionKey: 'your-encryption-key'
});
```

### 3. 输入验证

在前端和后端都进行严格的输入验证，防止 XSS 和 SQL 注入攻击。

## 性能优化

### 1. 请求缓存

```javascript
const cache = new Map();
const cacheTTL = 5 * 60 * 1000; // 5分钟

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};
```

### 2. 批量请求

合并多个 API 请求减少网络开销：

```javascript
const getDashboardData = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const [coursesResponse, userResponse] = await Promise.all([
        axiosInstance.get('/courses'),
        axiosInstance.get('/user/profile')
      ]);
      
      resolve({
        courses: coursesResponse.data.courses,
        user: userResponse.data.user
      });
    } catch (error) {
      reject(error);
    }
  });
};
```

## 测试环境

### 1. 环境切换

```javascript
const isProduction = process.env.NODE_ENV === 'production';
const API_BASE_URL = isProduction 
  ? 'https://your-api-domain/api'
  : 'http://localhost:3000/api';
```

### 2. Mock 数据

在开发环境中使用 mock 数据：

```javascript
if (!isProduction) {
  global.mockCourses = [
    // 模拟课程数据
  ];
}
```

## 部署注意事项

### 1. CORS 配置

在后端配置正确的 CORS 策略，允许 Electron 应用的请求：

```javascript
// Express 示例
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000', // 开发环境
    'electron://your-app-id', // Electron 应用
    'https://your-app-domain' // 网页版本
  ],
  credentials: true
}));
```

### 2. 打包配置

在 `package.json` 中添加环境变量：

```json
{
  "scripts": {
    "start": "cross-env NODE_ENV=development electron .",
    "build": "cross-env NODE_ENV=production electron-builder"
  }
}
```

## 文档更新

### 1. API 文档

确保更新项目文档，包括：
- API 接口列表
- 数据结构定义
- 错误码说明
- 认证机制说明

### 2. 部署指南

编写部署指南，包括：
- 服务器配置要求
- SSL 证书配置
- 负载均衡建议
- 监控和日志配置

## 技术支持

如果您在 API 集成过程中遇到问题，请联系：
- 技术支持邮箱：support@example.com
- 项目仓库：https://github.com/your-repo/xiwo-course-recorder
- 在线文档：https://docs.example.com/xiwo-course-recorder