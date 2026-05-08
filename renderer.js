const { ipcRenderer } = require('electron');
const path = require('path');

const selectFolderBtn = document.getElementById('select-folder');
const helpBtn = document.getElementById('help-btn');
const languageSelect = document.getElementById('language-select');
const currentFolderEl = document.getElementById('current-folder');
const currentVideoNameEl = document.getElementById('current-video-name');
const videoListEl = document.getElementById('video-list');
const videoPlayer = document.getElementById('video-player');
const playPauseBtn = document.getElementById('play-pause');
const deleteVideoBtn = document.getElementById('delete-video');
const renameVideoBtn = document.getElementById('rename-video');
const exportVideoBtn = document.getElementById('export-video-btn');
const setStartBtn = document.getElementById('set-start');
const setEndBtn = document.getElementById('set-end');
const startTimeDisplay = document.getElementById('start-time-display');
const endTimeDisplay = document.getElementById('end-time-display');
const durationDisplay = document.getElementById('duration-display');
const timelineRange = document.querySelector('.timeline-range');
const timelineProgress = document.querySelector('.timeline-progress');
const startHandle = document.querySelector('.start-handle');
const endHandle = document.querySelector('.end-handle');
const timeline = document.querySelector('.timeline');
const timelineTrack = document.querySelector('.timeline-track');
const exportQueueDiv = document.getElementById('export-queue');

const exportSettingsModal = document.getElementById('export-settings-modal');
const helpModal = document.getElementById('help-modal');
const confirmExportBtn = document.getElementById('confirm-export');
const cancelExportSettingsBtn = document.getElementById('cancel-export-settings');
const closeHelpBtn = document.getElementById('close-help');
const exportFilenameInput = document.getElementById('export-filename');
const exportQualitySelect = document.getElementById('export-quality');
const exportFpsSelect = document.getElementById('export-fps');
const exportPresetSelect = document.getElementById('export-preset');

let currentVideo = null;
let videoFiles = [];
let currentVideoIndex = -1;
let isDraggingStart = false, isDraggingEnd = false;
let trimStart = 0, trimEnd = 0, videoDuration = 0;
let activeTasks = new Map();

let historyStack = [];
let currentHistoryIndex = -1;

const translations = {
  en: {
    'app-title': 'Video Manager (VMG)',
    'select-folder': 'Select Folder',
    'help-button': 'User Guide',
    'video-list': 'Video List',
    'play-pause': 'Play/Pause',
    'delete-video': 'Delete',
    'rename-video': 'Rename',
    'export-video': 'Export',
    'video-trim': 'Video Trimming',
    'duration': 'duration',
    'set-start': 'Set Start',
    'set-end': 'Set End',
    'export-settings': 'Export Settings',
    'filename': 'Filename',
    'save-path': 'Save Path',
    'quality': 'Quality',
    'quality-original': 'Original',
    'fps': 'FPS',
    'preset': 'Speed / Quality',
    'preparing-export': 'Preparing export...',
    'start-export': 'Start Export',
    'cancel': 'Cancel',
    'user-guide': 'User Guide',
    'basic-operations': 'Basic Operations',
    'select-folder-help': 'Select Folder',
    'select-folder-desc': 'Click "Select Folder" to load videos.',
    'switch-video-desc': 'Use left/right arrow keys or click on video name.',
    'playback-control-help': 'Playback',
    'playback-control-desc': 'Space to play/pause, fast forward/rewind buttons.',
    'video-trimming-help': 'Video Trimming & Export',
    'set-trim-points-help': 'Set trim points',
    'set-trim-points-desc': 'Drag white handles on timeline or use "Set Start/End".',
    'apply-trim-help': 'Export',
    'apply-trim-desc': 'Click "Export" to choose quality & frame rate. Tasks run in background.',
    'shortcuts-help': 'Shortcuts',
    'close': 'Close',
    'export-queue': 'Export Queue',
    'no-tasks': 'No export tasks',
    'export-complete': 'Export complete',
    'exporting': 'Exporting',
    'frames': 'frames',
    'ffmpeg-missing': 'FFmpeg not found. Please install it (see User Guide).',
    'shortcut-switch': 'Switch video',
    'shortcut-space': 'Play/Pause',
    'shortcut-zoom': 'Zoom',
    'shortcut-undo': 'Undo trim',
    'keep-aspect': 'Keep aspect ratio (add black bars)',
    'ffmpeg-help': 'FFmpeg Installation (Required)',
    'ffmpeg-desc': 'This software requires FFmpeg for video processing. Please install before using.',
    'ffmpeg-steps-title': 'Installation Steps',
    'ffmpeg-step1': 'Go to FFmpeg download page:',
    'ffmpeg-step2': 'Download:',
    'ffmpeg-step3': 'Extract the archive and locate',
    'ffmpeg-step4': 'Create a folder named "ffmpeg" inside the program directory, then put "ffmpeg.exe" into it.',
    'ffmpeg-example': 'Your Program Folder/\n├─ YourApp.exe\n└─ ffmpeg/\n    └─ ffmpeg.exe',
    'ffmpeg-note': 'Note: No need to modify system PATH. After installation, restart this app. Status bar will show "FFmpeg ready".',
    'ffmpeg-advanced-title': 'Advanced (Optional)',
    'ffmpeg-advanced-desc': 'If you want to use FFmpeg globally, add its folder (e.g., C:\\ffmpeg\\bin) to system PATH environment variable.'
  },
  'zh-CN': {
    'app-title': '视频管理器 (VMG)',
    'select-folder': '选择文件夹',
    'help-button': '使用指南',
    'video-list': '视频列表',
    'play-pause': '播放/暂停',
    'delete-video': '删除',
    'rename-video': '重命名',
    'export-video': '导出视频',
    'video-trim': '视频修剪',
    'duration': '时长',
    'set-start': '设为开始',
    'set-end': '设为结束',
    'export-settings': '导出设置',
    'filename': '文件名',
    'save-path': '保存路径',
    'quality': '画质',
    'quality-original': '原始',
    'fps': '帧率',
    'preset': '编码速度',
    'preparing-export': '准备导出...',
    'start-export': '开始导出',
    'cancel': '取消',
    'user-guide': '使用指南',
    'basic-operations': '基本操作',
    'select-folder-help': '选择文件夹',
    'select-folder-desc': '点击“选择文件夹”加载视频。',
    'switch-video-desc': '使用左右方向键或点击视频名称。',
    'playback-control-help': '播放控制',
    'playback-control-desc': '空格播放/暂停，快进/快退按钮。',
    'video-trimming-help': '视频修剪与导出',
    'set-trim-points-help': '设置修剪点',
    'set-trim-points-desc': '拖动时间轴上的白色手柄或使用“设为开始/结束”。',
    'apply-trim-help': '导出',
    'apply-trim-desc': '点击“导出”选择画质和帧率，任务在后台运行。',
    'shortcuts-help': '快捷键',
    'close': '关闭',
    'export-queue': '导出任务队列',
    'no-tasks': '暂无导出任务',
    'export-complete': '导出完成',
    'exporting': '导出中',
    'frames': '帧',
    'ffmpeg-missing': '未找到 FFmpeg，请查看使用指南安装。',
    'shortcut-switch': '切换视频',
    'shortcut-space': '播放/暂停',
    'shortcut-zoom': '缩放页面',
    'shortcut-undo': '撤销修剪',
    'keep-aspect': '保持宽高比（添加黑边）',
    'ffmpeg-help': 'FFmpeg 安装指南（必需）',
    'ffmpeg-desc': '本软件依赖 FFmpeg 进行视频处理，请先完成安装后再使用。',
    'ffmpeg-steps-title': '安装步骤',
    'ffmpeg-step1': '前往 FFmpeg 下载页面：',
    'ffmpeg-step2': '下载：',
    'ffmpeg-step3': '解压压缩包后，找到：',
    'ffmpeg-step4': '在本程序所在目录创建一个名为 “ffmpeg” 的文件夹，并将 “ffmpeg.exe” 放入其中。',
    'ffmpeg-example': '你的程序目录/\n├─ 程序.exe\n└─ ffmpeg/\n    └─ ffmpeg.exe',
    'ffmpeg-note': '注意事项：无需配置系统 PATH 环境变量。安装完成后，请重新启动本软件，状态栏将显示“FFmpeg ready”。',
    'ffmpeg-advanced-title': '进阶（可选）',
    'ffmpeg-advanced-desc': '如果希望在整个系统中全局使用 FFmpeg，可以将它的 bin 文件夹（例如 C:\\ffmpeg\\bin）添加到系统 PATH 环境变量中。'
  },
  'zh-TW': {
    'app-title': '影片管理器 (VMG)',
    'select-folder': '選擇資料夾',
    'help-button': '使用指南',
    'video-list': '影片列表',
    'play-pause': '播放/暫停',
    'delete-video': '刪除',
    'rename-video': '重新命名',
    'export-video': '匯出影片',
    'video-trim': '影片修剪',
    'duration': '時長',
    'set-start': '設為開始',
    'set-end': '設為結束',
    'export-settings': '匯出設定',
    'filename': '檔名',
    'save-path': '儲存路徑',
    'quality': '畫質',
    'quality-original': '原始',
    'fps': '幀率',
    'preset': '編碼速度',
    'preparing-export': '準備匯出...',
    'start-export': '開始匯出',
    'cancel': '取消',
    'user-guide': '使用指南',
    'basic-operations': '基本操作',
    'select-folder-help': '選擇資料夾',
    'select-folder-desc': '點擊“選擇資料夾”載入影片。',
    'switch-video-desc': '使用左右方向鍵或點擊影片名稱。',
    'playback-control-help': '播放控制',
    'playback-control-desc': '空白鍵播放/暫停，快進/快退按鈕。',
    'video-trimming-help': '影片修剪與匯出',
    'set-trim-points-help': '設定修剪點',
    'set-trim-points-desc': '拖動時間軸上的白色手柄或使用“設為開始/結束”。',
    'apply-trim-help': '匯出',
    'apply-trim-desc': '點擊“匯出”選擇畫質和幀率，任務在背景執行。',
    'shortcuts-help': '快捷鍵',
    'close': '關閉',
    'export-queue': '匯出任務佇列',
    'no-tasks': '暫無匯出任務',
    'export-complete': '匯出完成',
    'exporting': '匯出中',
    'frames': '幀',
    'ffmpeg-missing': '找不到 FFmpeg，請參閱使用指南安裝。',
    'shortcut-switch': '切換影片',
    'shortcut-space': '播放/暫停',
    'shortcut-zoom': '縮放頁面',
    'shortcut-undo': '撤銷修剪',
    'keep-aspect': '保持寬高比（添加黑邊）',
    'ffmpeg-help': 'FFmpeg 安裝指南（必要）',
    'ffmpeg-desc': '本軟體依賴 FFmpeg 進行影片處理，請先完成安裝後再使用。',
    'ffmpeg-steps-title': '安裝步驟',
    'ffmpeg-step1': '前往 FFmpeg 下載頁面：',
    'ffmpeg-step2': '下載：',
    'ffmpeg-step3': '解壓縮壓縮包後，找到：',
    'ffmpeg-step4': '在本程式所在目錄建立一個名為 「ffmpeg」 的資料夾，並將 「ffmpeg.exe」 放入其中。',
    'ffmpeg-example': '你的程式目錄/\n├─ 程式.exe\n└─ ffmpeg/\n    └─ ffmpeg.exe',
    'ffmpeg-note': '注意事項：無需設定系統 PATH 環境變數。安裝完成後，請重新啟動本軟體，狀態列將顯示「FFmpeg ready」。',
    'ffmpeg-advanced-title': '進階（可選）',
    'ffmpeg-advanced-desc': '如果希望在整個系統中全域使用 FFmpeg，可以將其 bin 資料夾（例如 C:\\ffmpeg\\bin）新增到系統 PATH 環境變數中。'
  }
};

let currentLang = 'en';
function t(key) { return translations[currentLang][key] || key; }
function updateLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.placeholder = t(key);
    else el.textContent = t(key);
  });
  languageSelect.value = lang;
  updateFfmpegStatus();
}
languageSelect.addEventListener('change', e => updateLanguage(e.target.value));
updateLanguage('en');

function showNotification(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = 'notification';
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

async function updateFfmpegStatus() {
  const status = await ipcRenderer.invoke('check-ffmpeg');
  const el = document.getElementById('ffmpeg-status');
  if (status.available) {
    el.textContent = `FFmpeg ready (${path.basename(status.path)})`;
    el.className = 'ffmpeg-status installed';
  } else {
    el.textContent = t('ffmpeg-missing');
    el.className = 'ffmpeg-status not-installed';
  }
}

selectFolderBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folder');
  if (result) {
    currentFolderEl.textContent = `${t('save-path')}: ${result.folderPath}`;
    videoFiles = result.videoFiles;
    renderVideoList();
  }
});
function renderVideoList() {
  videoListEl.innerHTML = '';
  videoFiles.forEach((video, idx) => {
    const div = document.createElement('div');
    div.className = 'video-item';
    div.textContent = video.name;
    div.onclick = () => selectVideo(idx);
    videoListEl.appendChild(div);
  });
  if (videoFiles.length) selectVideo(0);
}
function selectVideo(index) {
  if (index < 0 || index >= videoFiles.length) return;
  document.querySelectorAll('.video-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.video-item')[index]?.classList.add('selected');
  currentVideoIndex = index;
  loadVideo(videoFiles[index]);
}
function loadVideo(video) {
  currentVideo = video;
  currentVideoNameEl.textContent = `Current: ${video.name}`;
  videoPlayer.src = `file://${video.path}`;
  videoPlayer.onloadedmetadata = () => {
    videoDuration = videoPlayer.duration;
    trimStart = 0; trimEnd = videoDuration;
    updateTimeDisplay();
    resetTimelineHandles();
    timelineProgress.style.display = 'block';
    setButtonsEnabled(true);
    resetHistory();
    pushHistory(trimStart, trimEnd);
  };
}
function updateTimeDisplay() {
  startTimeDisplay.textContent = formatTime(trimStart);
  endTimeDisplay.textContent = formatTime(trimEnd);
  durationDisplay.textContent = formatTime(trimEnd - trimStart);
}
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
function resetTimelineHandles() {
  startHandle.style.left = '0%';
  endHandle.style.right = '0%';
  timelineRange.style.left = '0%';
  timelineRange.style.width = '100%';
  timelineProgress.style.left = '0%';
}
function setButtonsEnabled(enabled) {
  [deleteVideoBtn, renameVideoBtn, exportVideoBtn, setStartBtn, setEndBtn].forEach(btn => btn.disabled = !enabled);
}
function updateTimelineFromTimes() {
  if (!videoDuration) return;
  const startPct = (trimStart / videoDuration) * 100;
  const endPct = 100 - (trimEnd / videoDuration) * 100;
  startHandle.style.left = `${startPct}%`;
  endHandle.style.right = `${endPct}%`;
  timelineRange.style.left = `${startPct}%`;
  timelineRange.style.width = `${100 - endPct - startPct}%`;
}
function updateTimesFromTimeline() {
  if (!videoDuration) return;
  const startPct = parseFloat(startHandle.style.left) || 0;
  const endPct = parseFloat(endHandle.style.right) || 0;
  trimStart = (startPct / 100) * videoDuration;
  trimEnd = ((100 - endPct) / 100) * videoDuration;
  updateTimeDisplay();
}

function pushHistory(start, end) {
  if (currentHistoryIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, currentHistoryIndex + 1);
  }
  historyStack.push({ trimStart: start, trimEnd: end });
  currentHistoryIndex = historyStack.length - 1;
  if (historyStack.length > 50) {
    historyStack.shift();
    currentHistoryIndex--;
  }
}
function resetHistory() { historyStack = []; currentHistoryIndex = -1; }
function undo() {
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--;
    const state = historyStack[currentHistoryIndex];
    trimStart = state.trimStart;
    trimEnd = state.trimEnd;
    updateTimelineFromTimes();
    updateTimeDisplay();
    if (videoPlayer && videoPlayer.currentTime > trimEnd) videoPlayer.currentTime = trimStart;
  } else {
    showNotification('No more actions to undo', 'info');
  }
}

playPauseBtn.onclick = () => videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
const rewindBtns = { 'rewind-3s':3, 'rewind-5s':5, 'rewind-1m':60, 'rewind-5m':300, 'rewind-10m':600 };
const ffBtns = { 'fast-forward-3s':3, 'fast-forward-5s':5, 'fast-forward-10s':10, 'fast-forward-1m':60, 'fast-forward-5m':300, 'fast-forward-10m':600 };
Object.entries(rewindBtns).forEach(([id, sec]) => document.getElementById(id).onclick = () => videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - sec));
Object.entries(ffBtns).forEach(([id, sec]) => document.getElementById(id).onclick = () => videoPlayer.currentTime = Math.min(videoPlayer.currentTime + sec, videoDuration));

setStartBtn.onclick = () => { pushHistory(trimStart, trimEnd); trimStart = videoPlayer.currentTime; updateTimelineFromTimes(); updateTimeDisplay(); };
setEndBtn.onclick = () => { pushHistory(trimStart, trimEnd); trimEnd = videoPlayer.currentTime; updateTimelineFromTimes(); updateTimeDisplay(); };

startHandle.onmousedown = e => { isDraggingStart = true; e.preventDefault(); };
endHandle.onmousedown = e => { isDraggingEnd = true; e.preventDefault(); };
document.onmousemove = e => {
  if (!isDraggingStart && !isDraggingEnd) return;
  const rect = timelineTrack.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width * 100;
  pct = Math.min(100, Math.max(0, pct));
  if (isDraggingStart) {
    let endPct = parseFloat(endHandle.style.right) || 0;
    pct = Math.min(pct, 100 - endPct - 0.5);
    startHandle.style.left = `${pct}%`;
    timelineRange.style.left = `${pct}%`;
    timelineRange.style.width = `${100 - pct - endPct}%`;
  }
  if (isDraggingEnd) {
    let startPct = parseFloat(startHandle.style.left) || 0;
    pct = Math.max(pct, startPct + 0.5);
    endHandle.style.right = `${100 - pct}%`;
    timelineRange.style.width = `${100 - startPct - (100 - pct)}%`;
  }
  updateTimesFromTimeline();
};
document.onmouseup = () => { isDraggingStart = false; isDraggingEnd = false; };
timeline.onclick = e => {
  if (!videoDuration) return;
  const rect = timelineTrack.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width;
  videoPlayer.currentTime = pct * videoDuration;
};
videoPlayer.ontimeupdate = () => {
  if (videoDuration) timelineProgress.style.left = `${(videoPlayer.currentTime / videoDuration) * 100}%`;
};

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' && currentVideoIndex > 0) selectVideo(currentVideoIndex - 1);
  else if (e.key === 'ArrowRight' && currentVideoIndex < videoFiles.length - 1) selectVideo(currentVideoIndex + 1);
  else if (e.key === ' ') { e.preventDefault(); videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); }
  else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); ipcRenderer.send('zoom-in'); }
  else if (e.ctrlKey && e.key === '-') { e.preventDefault(); ipcRenderer.send('zoom-out'); }
  else if (e.ctrlKey && e.key === '0') { e.preventDefault(); ipcRenderer.send('zoom-reset'); }
});
document.addEventListener('wheel', e => {
  if (e.ctrlKey) {
    e.preventDefault();
    if (e.deltaY < 0) ipcRenderer.send('zoom-in');
    else if (e.deltaY > 0) ipcRenderer.send('zoom-out');
  }
}, { passive: false });

exportVideoBtn.onclick = async () => {
  if (!currentVideo) return;
  const ffStatus = await ipcRenderer.invoke('check-ffmpeg');
  if (!ffStatus.available) {
    showNotification(t('ffmpeg-missing'), 'error');
    helpModal.style.display = 'block';
    return;
  }
  const defaultName = `output_${path.basename(currentVideo.name, path.extname(currentVideo.name))}.mp4`;
  exportFilenameInput.value = defaultName;
  exportSettingsModal.style.display = 'block';
};

confirmExportBtn.onclick = async () => {
  exportSettingsModal.style.display = 'none';
  const outputName = exportFilenameInput.value.trim();
  if (!outputName) return showNotification('Please enter a filename', 'error');
  
  const keepAspectCheckbox = document.getElementById('export-keep-aspect');
  const keepAspect = keepAspectCheckbox ? keepAspectCheckbox.checked : true;
  
  const quality = exportQualitySelect.value;
  const fps = parseInt(exportFpsSelect.value);
  const preset = exportPresetSelect.value;
  let videoBitrate = '2500k', resolution = null;
  switch (quality) {
    case 'original': videoBitrate = '0'; break;
    case '4k': videoBitrate = '15000k'; resolution = '3840x2160'; break;
    case '2k': videoBitrate = '8000k'; resolution = '2560x1440'; break;
    case 'high': videoBitrate = '5000k'; resolution = '1920x1080'; break;
    case 'medium': videoBitrate = '2500k'; resolution = '1280x720'; break;
    case 'low': videoBitrate = '1000k'; resolution = '854x480'; break;
  }
  const result = await ipcRenderer.invoke('show-save-dialog', outputName);
  if (result.canceled) return;
  const outputPath = result.filePath;
  const taskId = Date.now() + '_' + Math.random();
  addExportTask(taskId, outputName, outputPath);
  
  ipcRenderer.invoke('start-export', {
    inputPath: currentVideo.path,
    outputPath,
    startTime: trimStart,
    endTime: trimEnd,
    videoBitrate,
    fps,
    resolution,
    preset,
    keepAspect,
    taskId
  }).then(() => {
    updateTaskProgress(taskId, 100);
    showNotification(`${t('export-complete')}: ${path.basename(outputPath)}`, 'success');
    setTimeout(() => removeExportTask(taskId), 2000);
  }).catch(err => {
    showNotification(`Export failed: ${err.message}`, 'error');
    removeExportTask(taskId);
  });
};

cancelExportSettingsBtn.onclick = () => exportSettingsModal.style.display = 'none';

function addExportTask(taskId, name, outputPath) {
  if (exportQueueDiv.querySelector('.empty-queue')) exportQueueDiv.innerHTML = '';
  const taskDiv = document.createElement('div');
  taskDiv.className = 'export-task';
  taskDiv.id = `task-${taskId}`;
  taskDiv.innerHTML = `
    <div class="task-name">${name}</div>
    <div class="task-progress">0%</div>
    <div class="progress-bar-small"><div class="progress-fill" style="width:0%"></div></div>
    <button class="cancel-task" data-id="${taskId}">${t('cancel')}</button>
  `;
  taskDiv.querySelector('.cancel-task').onclick = async () => {
    await ipcRenderer.invoke('cancel-export', taskId);
    removeExportTask(taskId);
    showNotification('Export cancelled', 'info');
  };
  exportQueueDiv.appendChild(taskDiv);
  activeTasks.set(taskId, { element: taskDiv, progress: 0 });
}
function updateTaskProgress(taskId, percent, detail = '') {
  const task = activeTasks.get(taskId);
  if (task) {
    task.element.querySelector('.task-progress').innerText = `${percent}%${detail}`;
    task.element.querySelector('.progress-fill').style.width = `${percent}%`;
    task.progress = percent;
  }
}
function removeExportTask(taskId) {
  const task = activeTasks.get(taskId);
  if (task) task.element.remove();
  activeTasks.delete(taskId);
  if (activeTasks.size === 0 && (!exportQueueDiv.querySelector('.export-task')))
    exportQueueDiv.innerHTML = `<div class="empty-queue">${t('no-tasks')}</div>`;
}
ipcRenderer.on('export-progress', (event, { taskId, progress }) => {
  let percent = progress.percent || 0;
  let detail = '';
  if (progress.frames && progress.totalFrames) {
    detail = ` (${progress.frames}/${progress.totalFrames} frames)`;
  }
  updateTaskProgress(taskId, percent, detail);
});

deleteVideoBtn.onclick = async () => {
  if (!currentVideo) return;
  if (confirm(`Move "${currentVideo.name}" to recycle bin?`)) {
    videoPlayer.pause();
    videoPlayer.src = '';
    await new Promise(r => setTimeout(r, 100));
    const result = await ipcRenderer.invoke('delete-video', currentVideo.path);
    if (result.success) {
      showNotification('Moved to recycle bin', 'success');
      videoFiles = videoFiles.filter(v => v.path !== currentVideo.path);
      renderVideoList();
      currentVideo = null;
      currentVideoNameEl.textContent = '';
      videoPlayer.src = '';
      resetTimelineHandles();
      timelineProgress.style.display = 'none';
      setButtonsEnabled(false);
    } else {
      showNotification(`Delete failed: ${result.error}`, 'error');
      videoPlayer.src = `file://${currentVideo.path}`;
    }
  }
};

renameVideoBtn.onclick = async () => {
  if (!currentVideo) {
    showNotification('No video selected', 'error');
    return;
  }
  videoPlayer.pause();
  const oldSrc = videoPlayer.src;
  videoPlayer.src = '';
  videoPlayer.load();
  await new Promise(r => setTimeout(r, 200));
  const oldBase = path.basename(currentVideo.name, path.extname(currentVideo.name));
  const newBase = await ipcRenderer.invoke('show-input-dialog', {
    title: 'Rename Video',
    message: 'Enter new filename (without extension):',
    inputValue: oldBase
  });
  if (!newBase || newBase === oldBase) {
    videoPlayer.src = oldSrc;
    videoPlayer.play().catch(() => {});
    return;
  }
  const ext = path.extname(currentVideo.name);
  const newPath = path.join(path.dirname(currentVideo.path), newBase + ext);
  try {
    const result = await ipcRenderer.invoke('rename-video', { oldPath: currentVideo.path, newPath });
    if (result.success) {
      currentVideo.path = newPath;
      currentVideo.name = newBase + ext;
      renderVideoList();
      const oldTrimStart = trimStart;
      const oldTrimEnd = trimEnd;
      videoPlayer.src = `file://${newPath}`;
      await new Promise(resolve => {
        videoPlayer.onloadedmetadata = () => {
          videoDuration = videoPlayer.duration;
          if (oldTrimEnd > videoDuration) {
            trimStart = 0;
            trimEnd = videoDuration;
          } else {
            trimStart = oldTrimStart;
            trimEnd = oldTrimEnd;
          }
          updateTimeDisplay();
          updateTimelineFromTimes();
          resolve();
        };
      });
      showNotification('Rename successful', 'success');
    } else {
      showNotification(`Rename failed: ${result.error}`, 'error');
      videoPlayer.src = oldSrc;
      videoPlayer.play().catch(() => {});
    }
  } catch (err) {
    showNotification(`Rename failed: ${err.message}`, 'error');
    videoPlayer.src = oldSrc;
    videoPlayer.play().catch(() => {});
  }
};

helpBtn.onclick = () => helpModal.style.display = 'block';
closeHelpBtn.onclick = () => helpModal.style.display = 'none';
document.querySelectorAll('.close').forEach(btn => btn.onclick = () => {
  exportSettingsModal.style.display = 'none';
  helpModal.style.display = 'none';
});
window.onclick = e => {
  if (e.target === exportSettingsModal) exportSettingsModal.style.display = 'none';
  if (e.target === helpModal) helpModal.style.display = 'none';
};

updateFfmpegStatus();
setButtonsEnabled(false);