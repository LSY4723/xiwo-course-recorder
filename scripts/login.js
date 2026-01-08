// DOM元素
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const btnText = document.querySelector('.btn-text');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const rememberMeCheckbox = document.getElementById('rememberMe');

// 加载记住的密码
window.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('xiwo-username');
    const savedPassword = localStorage.getItem('xiwo-password');
    const rememberMe = localStorage.getItem('xiwo-remember-me') === 'true';
    
    if (savedUsername && rememberMe) {
        usernameInput.value = savedUsername;
        rememberMeCheckbox.checked = rememberMe;
        if (savedPassword) {
            passwordInput.value = savedPassword;
        }
    }
});

// 表单提交处理
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // 前端验证
    if (!username) {
        showError('请输入用户名');
        usernameInput.focus();
        return;
    }
    
    if (!password) {
        showError('请输入密码');
        passwordInput.focus();
        return;
    }
    
    // 显示加载状态
    setLoadingState(true);
    hideError();
    
    try {
        // 调用主进程的登录API
        const result = await window.electronAPI.login({ username, password });
        
        if (result.success) {
            // 保存记住的密码
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('xiwo-username', username);
                localStorage.setItem('xiwo-remember-me', 'true');
                if (password) {
                    localStorage.setItem('xiwo-password', password);
                }
            } else {
                localStorage.removeItem('xiwo-username');
                localStorage.removeItem('xiwo-password');
                localStorage.setItem('xiwo-remember-me', 'false');
            }
            
            // 保存当前用户信息
            localStorage.setItem('xiwo-current-user', JSON.stringify(result.user));
            localStorage.setItem('xiwo-token', result.token);
            
            // 通知主进程登录成功
            window.electronAPI.loginSuccess(result.user);
            
            // 关闭当前登录窗口
            window.close();
        } else {
            showError(result.error || '登录失败，请检查用户名和密码');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showError('登录失败，请稍后重试');
    } finally {
        setLoadingState(false);
    }
});

// 显示错误信息
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // 3秒后自动隐藏错误
    setTimeout(() => {
        hideError();
    }, 3000);
}

// 隐藏错误信息
function hideError() {
    errorMessage.classList.add('hidden');
}

// 设置加载状态
function setLoadingState(isLoading) {
    loginBtn.disabled = isLoading;
    
    if (isLoading) {
        loadingSpinner.classList.remove('hidden');
        btnText.classList.add('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
        btnText.classList.remove('hidden');
    }
}

// 键盘事件处理
document.addEventListener('keydown', (e) => {
    // ESC键关闭错误提示
    if (e.key === 'Escape') {
        hideError();
    }
    
    // Ctrl+Enter提交表单
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// 输入框事件处理
usernameInput.addEventListener('input', () => {
    if (!errorMessage.classList.contains('hidden')) {
        hideError();
    }
});

passwordInput.addEventListener('input', () => {
    if (!errorMessage.classList.contains('hidden')) {
        hideError();
    }
});

// 记住密码复选框事件
rememberMeCheckbox.addEventListener('change', () => {
    if (!rememberMeCheckbox.checked) {
        localStorage.removeItem('xiwo-password');
    }
});

// 切换密码可见性
passwordInput.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    // 3秒后恢复密码类型
    setTimeout(() => {
        if (passwordInput.type !== 'password') {
            passwordInput.type = 'password';
        }
    }, 3000);
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 页面可见时，可以刷新一些状态
        console.log('Login page became visible');
    }
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('Login page error:', e.error);
    showError('页面发生错误，请刷新重试');
});

// 导出函数给外部使用
window.XiwoLogin = {
    showError,
    hideError,
    setLoadingState
};

console.log('Login page initialized');