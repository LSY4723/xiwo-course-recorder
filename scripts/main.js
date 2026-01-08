// DOM元素
const courseSelectionPanel = document.getElementById('courseSelection');
const recordingControlPanel = document.getElementById('recordingControl');
const recordingStatusPanel = document.getElementById('recordingStatus');

const coursesLoading = document.getElementById('coursesLoading');
const coursesList = document.getElementById('coursesList');
const coursesError = document.getElementById('coursesError');
const reloadCoursesBtn = document.getElementById('reloadCoursesBtn');

const currentCourseName = document.getElementById('currentCourseName');
const selectedCourseInfo = document.getElementById('selectedCourseInfo');
const recordingCourseName = document.getElementById('recordingCourseName');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

const displaySelector = document.getElementById('displaySelector');
const recordAudioToggle = document.getElementById('recordAudioToggle');
const pushStreamToggle = document.getElementById('pushStreamToggle');

const startRecordingBtn = document.getElementById('startRecordingBtn');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const stopRecordingBtn2 = document.getElementById('stopRecordingBtn2');

const recordingStartTime = document.getElementById('recordingStartTime');
const recordingDuration = document.getElementById('recordingDuration');
const recordingOutputPath = document.getElementById('recordingOutputPath');

const appStatus = document.getElementById('appStatus');
const currentTime = document.getElementById('currentTime');

// 全局变量
let currentCourse = null;
let isRecording = false;
let isPaused = false;
let recordingTimer = null;
let recordingStartTimestamp = null;
let recordingPausedTimestamp = null;
let totalPausedTime = 0;

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
    console.log('主页面初始化开始...');
    
    // 设置当前用户
    const user = JSON.parse(localStorage.getItem('xiwo-current-user') || '{}');
    if (user.name) {
        userName.textContent = user.name;
        console.log('当前用户:', user.name);
    } else {
        console.warn('未找到当前用户信息');
        // 尝试从登录信息中获取
        const loginData = localStorage.getItem('xiwo-login-data');
        if (loginData) {
            try {
                const loginObj = JSON.parse(loginData);
                if (loginObj.user && loginObj.user.name) {
                    userName.textContent = loginObj.user.name;
                    localStorage.setItem('xiwo-current-user', JSON.stringify(loginObj.user));
                }
            } catch (e) {
                console.error('解析登录信息失败:', e);
            }
        }
    }
    
    // 初始化显示器选择
    try {
        initDisplaySelector();
        console.log('显示器选择初始化完成');
    } catch (e) {
        console.error('显示器选择初始化失败:', e);
    }
    
    // 加载课程列表
    try {
        console.log('开始加载课程列表...');
        await loadCourses();
    } catch (e) {
        console.error('加载课程列表异常:', e);
    }
    
    // 设置当前时间
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // 检查录制状态
    try {
        await checkRecordingStatus();
    } catch (e) {
        console.error('检查录制状态失败:', e);
    }
    
    // 注册IPC监听器
    registerIpcListeners();
    
    // 界面初始化完成后的检查
    setTimeout(() => {
        checkAndFixDisplay();
    }, 1000);
    
    console.log('主页面初始化完成');
});

// 检查并修复界面显示问题
function checkAndFixDisplay() {
    try {
        // 检查是否有面板处于激活状态
        const activePanel = document.querySelector('.panel.active');
        if (!activePanel) {
            console.log('未找到激活的面板，默认显示课程选择面板');
            courseSelectionPanel.classList.add('active');
        }
        
        // 如果有当前课程但没有显示录制面板
        if (currentCourse && !recordingControlPanel.classList.contains('active') && !recordingStatusPanel.classList.contains('active')) {
            console.log('检测到已选择课程但未显示录制面板，自动切换');
            switchToPanel('recordingControl');
        }
        
        // 检查录制按钮状态
        if (currentCourse && startRecordingBtn.classList.contains('hidden')) {
            startRecordingBtn.classList.remove('hidden');
            stopRecordingBtn.classList.add('hidden');
            startRecordingBtn.disabled = false;
        }
        
        // 强制显示录制控制面板（备用方案）
        if (currentCourse) {
            courseSelectionPanel.style.display = 'none';
            recordingControlPanel.style.display = 'flex';
            recordingStatusPanel.style.display = 'none';
            
            // 确保录制按钮可见
            startRecordingBtn.style.display = 'flex';
            stopRecordingBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('检查界面显示失败:', error);
    }
}

// 初始化显示器选择
function initDisplaySelector() {
    const displays = window.electronAPI.getDisplays();
    
    displaySelector.innerHTML = '';
    
    displays.forEach((display, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `显示器 ${index + 1} (${display.size.width}×${display.size.height})`;
        displaySelector.appendChild(option);
    });
    
    // 默认选择主显示器
    const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
    const primaryIndex = displays.findIndex(d => d.id === primaryDisplay.id);
    if (primaryIndex !== -1) {
        displaySelector.value = primaryIndex;
    }
}

// 加载课程列表
async function loadCourses() {
  try {
    coursesLoading.classList.remove('hidden');
    coursesList.classList.add('hidden');
    coursesError.classList.add('hidden');
    
    console.log('开始加载课程列表...');
    const result = await window.electronAPI.getCourses();
    console.log('课程列表加载结果:', result);
    
    if (result.success && result.courses && Array.isArray(result.courses)) {
      renderCourses(result.courses);
      coursesLoading.classList.add('hidden');
      coursesList.classList.remove('hidden');
      appStatus.textContent = '就绪';
      console.log(`成功加载 ${result.courses.length} 门课程`);
    } else {
      throw new Error(result.error || '获取课程列表失败，没有返回有效的课程数据');
    }
  } catch (error) {
    console.error('加载课程失败:', error);
    coursesLoading.classList.add('hidden');
    coursesError.classList.remove('hidden');
    appStatus.textContent = '加载失败';
    
    // 显示错误信息
    const errorMsg = document.getElementById('coursesErrorMessage');
    if (errorMsg) {
      errorMsg.textContent = error.message || '无法获取课程列表，请稍后重试';
    }
    
    // 自动尝试加载演示课程
    console.log('尝试自动加载演示课程...');
    setTimeout(() => {
      loadMockCourses();
    }, 1000);
  }
}

// 渲染课程列表
function renderCourses(courses) {
    coursesList.innerHTML = '';
    
    courses.forEach((course) => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.dataset.courseId = course.id;
        
        courseCard.innerHTML = `
            <div class="course-title">${course.name}</div>
            <div class="course-teacher">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 10.5C8.38071 10.5 9.5 9.38071 9.5 8C9.5 6.61929 8.38071 5.5 7 5.5C5.61929 5.5 4.5 6.61929 4.5 8C4.5 9.38071 5.61929 10.5 7 10.5Z" stroke="#909399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 13C9.31371 13 11 11.3137 11 9H3C3 11.3137 4.68629 13 7 13Z" stroke="#909399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${course.teacher}
            </div>
            <div class="course-time">
                <div class="course-time-item">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="6" cy="6" r="5" stroke="#C0C4CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 3V6L8 8" stroke="#C0C4CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${course.startTime}
                </div>
                <div class="course-time-item">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="6" cy="6" r="5" stroke="#C0C4CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 3V6L8 8" stroke="#C0C4CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${course.endTime}
                </div>
            </div>
            <div class="select-btn"></div>
        `;
        
        courseCard.addEventListener('click', () => selectCourse(course));
        coursesList.appendChild(courseCard);
    });
}

// 选择课程
async function selectCourse(course) {
    try {
        // 清除之前的选择
        document.querySelectorAll('.course-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 设置当前选择
        const courseCard = document.querySelector(`[data-course-id="${course.id}"]`);
        if (courseCard) {
            courseCard.classList.add('selected');
        }
        
        currentCourse = course;
        
        // 通知主进程
        const result = await window.electronAPI.selectCourse(course);
        
        if (result.success) {
            currentCourseName.textContent = `当前课程: ${course.name}`;
            selectedCourseInfo.textContent = `正在录制: ${course.name}`;
            recordingCourseName.textContent = course.name;
            
            // 重置按钮状态
            startRecordingBtn.classList.remove('hidden');
            stopRecordingBtn.classList.add('hidden');
            startRecordingBtn.disabled = false;
            
            // 切换到录制控制面板
            switchToPanel('recordingControl');
            appStatus.textContent = '已选择课程，准备录制';
            
            // 添加成功提示
            showNotification('课程选择成功', `您已选择课程：${course.name}\n\n现在可以设置录制参数并开始录制了`, 'success');
            
            // 滚动到录制按钮位置
            setTimeout(() => {
                const startBtn = document.getElementById('startRecordingBtn');
                if (startBtn) {
                    startBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 高亮录制按钮
                    startBtn.classList.add('highlight');
                    setTimeout(() => {
                        startBtn.classList.remove('highlight');
                    }, 2000);
                }
            }, 500);
        }
    } catch (error) {
        console.error('选择课程失败:', error);
        showNotification('选择课程失败', error.message, 'error');
    }
}

// 切换面板
function switchToPanel(panelName) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 显示目标面板
    const targetPanel = document.getElementById(panelName);
    if (targetPanel) {
        targetPanel.classList.add('active');
        
        // 如果是录制控制面板，添加引导提示
        if (panelName === 'recordingControl') {
            addRecordingGuide();
        }
    } else {
        console.error(`面板 ${panelName} 未找到`);
    }
}

// 添加录制引导提示
function addRecordingGuide() {
    // 移除已有的引导
    const existingGuide = document.getElementById('recordingGuide');
    if (existingGuide) {
        existingGuide.remove();
    }
    
    // 创建引导元素
    const guide = document.createElement('div');
    guide.id = 'recordingGuide';
    guide.innerHTML = `
        <div class="guide-content">
            <div class="guide-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 7V13L15.5 15.5L16.91 14.09L12 9.17L7.09 14.09L8.5 15.5L12 13V7Z" fill="#4080FF"/>
                </svg>
                <h3>录制准备就绪</h3>
            </div>
            <p>您可以根据需要调整以下设置：</p>
            <ul>
                <li><strong>显示器选择</strong>：选择要录制的屏幕</li>
                <li><strong>录制音频</strong>：开启/关闭麦克风录制</li>
                <li><strong>实时推流</strong>：开启/关闭网宿云推流</li>
            </ul>
            <div class="guide-action">
                <span>设置完成后，点击开始录制按钮</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13L13 10L10 7" stroke="#67C23A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 10H13" stroke="#67C23A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <button id="closeGuide" class="close-guide-btn">知道了</button>
        </div>
    `;
    
    // 添加样式
    guide.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        max-width: 320px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // 添加到页面
    document.body.appendChild(guide);
    
    // 绑定关闭事件
    document.getElementById('closeGuide').addEventListener('click', () => {
        guide.remove();
    });
    
    // 自动关闭
    setTimeout(() => {
        if (guide.parentNode) {
            guide.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => guide.remove(), 300);
        }
    }, 8000);
}

// 开始录制
async function startRecording() {
    if (!currentCourse) {
        showNotification('错误', '请先选择课程', 'error');
        return;
    }
    
    try {
        startRecordingBtn.disabled = true;
        appStatus.textContent = '正在开始录制...';
        
        const options = {
            displayIndex: parseInt(displaySelector.value) || 0,
            recordAudio: recordAudioToggle.checked,
            pushStream: pushStreamToggle.checked
        };
        
        // 确保displayIndex是有效的数字
        if (isNaN(options.displayIndex)) {
            options.displayIndex = 0;
        }
        
        // 隐藏当前窗口
        await window.electronAPI.hideWindow();
        
        const result = await window.electronAPI.startRecording(options);
        
        if (result.success || result.status === 'started') {
            isRecording = true;
            isPaused = false;
            recordingStartTimestamp = new Date();
            recordingPausedTimestamp = null;
            totalPausedTime = 0;
            recordingStartTime.textContent = recordingStartTimestamp.toLocaleTimeString();
            recordingOutputPath.textContent = result.outputPath || '录制中...';
            
            // 更新推流状态显示
            const streamingStatus = document.getElementById('streamingStatus');
            if (pushStreamToggle.checked) {
                streamingStatus.innerHTML = '<span class="status-badge connecting">连接中...</span>';
                // 模拟推流连接成功
                setTimeout(() => {
                    if (isRecording && pushStreamToggle.checked) {
                        streamingStatus.innerHTML = '<span class="status-badge online">推流中</span>';
                    }
                }, 2000);
            } else {
                streamingStatus.innerHTML = '<span class="status-badge offline">未推流</span>';
            }
            
            // 显示窗口
            await window.electronAPI.showWindow();
            
            // 更新界面按钮状态
            startRecordingBtn.classList.add('hidden');
            pauseRecordingBtn.classList.remove('hidden');
            stopRecordingBtn.classList.remove('hidden');
            
            // 更新紧急按钮状态
            updateEmergencyControls();
        } else {
            throw new Error(result.error || '开始录制失败');
        }
    } catch (error) {
        console.error('开始录制失败:', error);
        showNotification('录制失败', error.message, 'error');
        appStatus.textContent = '就绪';
        startRecordingBtn.disabled = false;
        // 显示窗口
        window.electronAPI.showWindow();
    }
}

// 停止录制
async function stopRecording() {
    try {
        stopRecordingBtn.disabled = true;
        stopRecordingBtn2.disabled = true;
        appStatus.textContent = '正在停止录制...';
        
        const result = await window.electronAPI.stopRecording();
        
        if (result.success || result.status === 'stopped') {
            isRecording = false;
            isPaused = false;
            
            // 停止计时
            stopRecordingTimer();
            
            // 切换到录制控制面板
            recordingStatusPanel.classList.remove('active');
            recordingControlPanel.classList.add('active');
            
            // 更新按钮状态
            startRecordingBtn.classList.remove('hidden');
            stopRecordingBtn.classList.add('hidden');
            const pauseBtn = document.getElementById('pauseRecordingBtn');
            if (pauseBtn) {
                pauseBtn.classList.add('hidden');
                pauseBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
                    </svg>
                    暂停录制
                `;
            }
            
            appStatus.textContent = '录制完成';
            showNotification('录制已完成', '课程录制已保存', 'success');
            
            // 重置录制状态
            setTimeout(() => {
                appStatus.textContent = '就绪';
            }, 3000);
            
            // 更新紧急按钮状态
            updateEmergencyControls();
            
            // 重置推流状态显示
            const streamingStatus = document.getElementById('streamingStatus');
            streamingStatus.innerHTML = '<span class="status-badge offline">未推流</span>';
        } else {
            throw new Error(result.error || '停止录制失败');
        }
    } catch (error) {
        console.error('停止录制失败:', error);
        showNotification('停止录制失败', error.message, 'error');
        appStatus.textContent = '录制中';
        stopRecordingBtn.disabled = false;
        stopRecordingBtn2.disabled = false;
    }
}

// 开始录制计时器
function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        if (!recordingStartTimestamp) return;
        
        const now = new Date();
        let duration = now - recordingStartTimestamp;
        
        // 减去暂停总时间
        if (totalPausedTime > 0) {
            duration -= totalPausedTime;
        }
        
        // 格式化时长
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        recordingDuration.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// 停止录制计时器
function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    recordingStartTimestamp = null;
    recordingPausedTimestamp = null;
    totalPausedTime = 0;
}

// 暂停录制计时器
function pauseRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

// 恢复录制计时器
function resumeRecordingTimer() {
    if (!recordingTimer) {
        startRecordingTimer();
    }
}

// 暂停录制
async function pauseRecording() {
    if (!isRecording || isPaused) {
        return;
    }
    
    try {
        const pauseBtn = document.getElementById('pauseRecordingBtn');
        pauseBtn.disabled = true;
        
        // 记录暂停时间
        recordingPausedTimestamp = new Date();
        isPaused = true;
        
        // 暂停计时器
        pauseRecordingTimer();
        
        // 调用主进程暂停录制
        await window.electronAPI.pauseRecording();
        
        // 更新按钮状态
        pauseBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            恢复录制
        `;
        
        appStatus.textContent = '录制已暂停';
        showNotification('录制已暂停', '录制已暂停，点击恢复按钮继续录制', 'info');
        
        // 更新推流状态显示
        const streamingStatus = document.getElementById('streamingStatus');
        if (pushStreamToggle.checked) {
            streamingStatus.innerHTML = '<span class="status-badge connecting">推流已暂停</span>';
        }
        
        // 更新紧急按钮状态
        updateEmergencyControls();
        
        pauseBtn.disabled = false;
    } catch (error) {
        console.error('暂停录制失败:', error);
        showNotification('暂停失败', error.message, 'error');
        appStatus.textContent = '录制中';
    }
}

// 恢复录制
async function resumeRecording() {
    if (!isRecording || !isPaused) {
        return;
    }
    
    try {
        const pauseBtn = document.getElementById('pauseRecordingBtn');
        pauseBtn.disabled = true;
        
        // 计算暂停时长并累加到总暂停时间
        if (recordingPausedTimestamp) {
            const resumeTime = new Date();
            totalPausedTime += resumeTime - recordingPausedTimestamp;
            recordingPausedTimestamp = null;
        }
        
        isPaused = false;
        
        // 恢复计时器
        resumeRecordingTimer();
        
        // 调用主进程恢复录制
        await window.electronAPI.resumeRecording();
        
        // 更新按钮状态
        pauseBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
            </svg>
            暂停录制
        `;
        
        appStatus.textContent = '录制中';
        showNotification('录制已恢复', '继续录制课程', 'success');
        
        // 更新推流状态显示
        const streamingStatus = document.getElementById('streamingStatus');
        if (pushStreamToggle.checked) {
            streamingStatus.innerHTML = '<span class="status-badge online">推流中</span>';
        }
        
        // 更新紧急按钮状态
        updateEmergencyControls();
        
        pauseBtn.disabled = false;
    } catch (error) {
        console.error('恢复录制失败:', error);
        showNotification('恢复失败', error.message, 'error');
        appStatus.textContent = '录制已暂停';
    }
}

// 检查录制状态
async function checkRecordingStatus() {
    try {
        const status = await window.electronAPI.getRecordingStatus();
        isRecording = status.isRecording;
        currentCourse = status.currentCourse;
        
        if (isRecording && currentCourse) {
            // 如果正在录制，切换到录制状态面板
            recordingStatusPanel.classList.add('active');
            courseSelectionPanel.classList.remove('active');
            recordingControlPanel.classList.remove('active');
            
            startRecordingBtn.classList.add('hidden');
            stopRecordingBtn.classList.remove('hidden');
            const pauseBtn = document.getElementById('pauseRecordingBtn');
            if (pauseBtn) {
                pauseBtn.classList.remove('hidden');
                if (isPaused) {
                    pauseBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M13 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        恢复录制
                    `;
                } else {
                    pauseBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
                        </svg>
                        暂停录制
                    `;
                }
            }
            
            recordingCourseName.textContent = currentCourse.name;
            recordingStartTime.textContent = new Date().toLocaleTimeString();
            recordingStartTimestamp = new Date();
            
            startRecordingTimer();
            appStatus.textContent = '录制中';
            
            // 更新紧急按钮状态
            updateEmergencyControls();
        } else if (currentCourse) {
            // 如果已经选择了课程但没有在录制，切换到录制控制面板
            recordingControlPanel.classList.add('active');
            courseSelectionPanel.classList.remove('active');
            recordingStatusPanel.classList.remove('active');
            
            startRecordingBtn.classList.remove('hidden');
            stopRecordingBtn.classList.add('hidden');
            const pauseBtn = document.getElementById('pauseRecordingBtn');
            if (pauseBtn) {
                pauseBtn.classList.add('hidden');
                pauseBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
                    </svg>
                    暂停录制
                `;
            }
            startRecordingBtn.disabled = false;
            
            currentCourseName.textContent = `当前课程: ${currentCourse.name}`;
            selectedCourseInfo.textContent = `正在录制: ${currentCourse.name}`;
            recordingCourseName.textContent = currentCourse.name;
            
            appStatus.textContent = '已选择课程，准备录制';
            
            // 更新紧急按钮状态
            updateEmergencyControls();
        }
    } catch (error) {
        console.error('检查录制状态失败:', error);
    }
}

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString();
}

// 退出登录
async function logout() {
    localStorage.removeItem('xiwo-current-user');
    localStorage.removeItem('xiwo-token');
    
    // 通知主进程
    await window.electronAPI.logout();
    
    // 关闭当前窗口
    window.close();
}

// 注册IPC监听器
function registerIpcListeners() {
    // 注意：在上下文隔离模式下，渲染进程无法直接监听IPC事件
    // 需要通过预加载脚本中暴露的API进行事件监听
    console.log('IPC监听器注册（上下文隔离模式）');
}

// 显示通知
function showNotification(title, message, type = 'info') {
    // 这里可以使用Electron的通知API
    console.log(`${title}: ${message}`);
    
    // 也可以在状态栏显示
    appStatus.textContent = `${title}: ${message}`;
    
    setTimeout(() => {
        if (!isRecording) {
            appStatus.textContent = '就绪';
        } else {
            appStatus.textContent = '录制中';
        }
    }, 5000);
}

// 加载演示课程数据
function loadMockCourses() {
    const mockCourses = [
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
        },
        {
            id: 'mock-003',
            name: '人工智能基础（演示）',
            teacher: '王老师',
            startTime: '2026-01-08 09:00',
            endTime: '2026-01-08 12:00',
            streamUrl: 'rtmp://wspush.qingbeikeji.com/live/peiyou2792072aidevrandom'
        }
    ];
    
    // 显示演示课程
    coursesLoading.classList.add('hidden');
    coursesError.classList.add('hidden');
    coursesList.classList.remove('hidden');
    
    renderCourses(mockCourses);
    appStatus.textContent = '已加载演示课程';
    
    // 保存到本地存储
    localStorage.setItem('mock-courses', JSON.stringify(mockCourses));
    
    showNotification('演示课程加载成功', '已加载3门演示课程，您可以正常进行录制功能测试', 'success');
}

// 事件监听
reloadCoursesBtn.addEventListener('click', loadCourses);
logoutBtn.addEventListener('click', logout);

// 初始化紧急录制按钮
initEmergencyControls();

// 演示课程按钮监听
const loadMockCoursesBtn = document.getElementById('loadMockCoursesBtn');
if (loadMockCoursesBtn) {
    loadMockCoursesBtn.addEventListener('click', loadMockCourses);
} else {
    console.warn('演示课程按钮未找到');
}

startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);
stopRecordingBtn2.addEventListener('click', stopRecording);

// 暂停/恢复按钮监听
const pauseRecordingBtn = document.getElementById('pauseRecordingBtn');
if (pauseRecordingBtn) {
    pauseRecordingBtn.addEventListener('click', () => {
        if (isPaused) {
            resumeRecording();
        } else {
            pauseRecording();
        }
    });
} else {
    console.warn('暂停按钮未找到');
}

// 键盘快捷键（已禁用，仅保留注释）
/* document.addEventListener('keydown', (e) => {
    // Ctrl+R 开始/停止录制
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    // Ctrl+P 暂停/恢复录制
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (isRecording) {
            if (isPaused) {
                resumeRecording();
            } else {
                pauseRecording();
            }
        }
    }
    
    // ESC 停止录制
    if (e.key === 'Escape' && isRecording) {
        e.preventDefault();
        stopRecording();
    }
    
    // Ctrl+L 返回课程列表
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        courseSelectionPanel.classList.add('active');
        recordingControlPanel.classList.remove('active');
        recordingStatusPanel.classList.remove('active');
    }
    
    // Ctrl+F 强制刷新界面
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        checkAndFixDisplay();
        showNotification('界面已刷新', '已尝试修复界面显示问题', 'info');
    }
}); */

// 窗口关闭前的清理
window.addEventListener('beforeunload', () => {
    if (recordingTimer) {
        clearInterval(recordingTimer);
    }
});

// 初始化推流状态显示
function initStreamingStatus() {
    const streamingStatus = document.getElementById('streamingStatus');
    if (streamingStatus) {
        // 初始状态设为未推流
        streamingStatus.innerHTML = '<span class="status-badge offline">未推流</span>';
    }
}

// 错误处理
window.addEventListener('error', (e) => {
    console.error('Main page error:', e.error);
    showNotification('页面错误', '发生未预期的错误', 'error');
});

// 紧急录制按钮功能
function initEmergencyControls() {
    const emergencyStartBtn = document.getElementById('emergencyStartBtn');
    const emergencyPauseBtn = document.getElementById('emergencyPauseBtn');
    const emergencyStopBtn = document.getElementById('emergencyStopBtn');
    
    if (emergencyStartBtn) {
        emergencyStartBtn.addEventListener('click', async () => {
            if (!currentCourse) {
                // 如果没有选择课程，提示用户选择或使用默认设置
                const useDefault = confirm('请先选择课程，或点击确定使用默认设置开始录制');
                if (useDefault) {
                    // 设置一个默认课程
                    currentCourse = {
                        id: 'default-course',
                        name: '默认课程录制',
                        streamUrl: ''
                    };
                    currentCourseName.textContent = '当前课程: 默认课程录制';
                    selectedCourseInfo.textContent = '正在录制: 默认课程录制';
                    recordingCourseName.textContent = '默认课程录制';
                    await startRecording();
                }
            } else {
                await startRecording();
            }
        });
    }
    
    if (emergencyPauseBtn) {
        emergencyPauseBtn.addEventListener('click', () => {
            if (isPaused) {
                resumeRecording();
            } else {
                pauseRecording();
            }
        });
    }
    
    if (emergencyStopBtn) {
        emergencyStopBtn.addEventListener('click', () => {
            stopRecording();
        });
    }
}

// 更新紧急按钮状态
function updateEmergencyControls() {
    const emergencyStartBtn = document.getElementById('emergencyStartBtn');
    const emergencyPauseBtn = document.getElementById('emergencyPauseBtn');
    const emergencyStopBtn = document.getElementById('emergencyStopBtn');
    
    if (isRecording) {
        if (emergencyStartBtn) emergencyStartBtn.style.display = 'none';
        if (emergencyPauseBtn) emergencyPauseBtn.style.display = 'flex';
        if (emergencyStopBtn) emergencyStopBtn.style.display = 'flex';
        
        if (emergencyPauseBtn) {
            if (isPaused) {
                emergencyPauseBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13 5V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    恢复录制
                `;
            } else {
                emergencyPauseBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="3" height="10" fill="white"/>
                        <rect x="11" y="6" width="3" height="10" fill="white"/>
                    </svg>
                    暂停录制
                `;
            }
        }
    } else {
        if (emergencyStartBtn) emergencyStartBtn.style.display = 'flex';
        if (emergencyPauseBtn) emergencyPauseBtn.style.display = 'none';
        if (emergencyStopBtn) emergencyStopBtn.style.display = 'none';
    }
}

// 初始化页面
function initPage() {
    // 初始化显示设置
    initDisplaySettings();
    
    // 初始化紧急控制按钮
    initEmergencyControls();
    
    // 初始化推流状态显示
    initStreamingStatus();
    
    // 更新当前时间
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // 检查录制状态
    checkRecordingStatus();
    
    // 每5秒检查一次录制状态
    setInterval(checkRecordingStatus, 5000);
    
    // 加载课程列表
    loadCourses();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initPage);

console.log('Main page initialized');