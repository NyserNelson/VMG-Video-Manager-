const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const prompt = require('electron-prompt');

let mainWindow;
let activeExports = new Map();

function checkFfmpegAvailability() {
  const ffmpegPath = getFfmpegPath();
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    return { available: true, path: ffmpegPath };
  }
  return { available: false, path: null };
}

function getFfmpegPath() {
  const localPath = path.join(path.dirname(app.getPath('exe')), 'ffmpeg', 'ffmpeg.exe');
  if (fs.existsSync(localPath)) return localPath;
  try {
    const which = require('child_process').execSync('where ffmpeg', { stdio: 'pipe', encoding: 'utf8' });
    if (which) return which.trim().split('\n')[0];
  } catch(e) {}
  return null;
}

function registerIpcHandlers() {
  ipcMain.handle('check-ffmpeg', () => checkFfmpegAvailability());

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length) {
      const folderPath = result.filePaths[0];
      const files = fs.readdirSync(folderPath);
      const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.webm'];
      const videoFiles = files
        .filter(f => videoExtensions.includes(path.extname(f).toLowerCase()))
        .map(f => ({
          name: f,
          path: path.join(folderPath, f),
          size: fs.statSync(path.join(folderPath, f)).size,
          created: fs.statSync(path.join(folderPath, f)).birthtime
        }));
      return { folderPath, videoFiles };
    }
    return null;
  });

  ipcMain.handle('start-export', async (event, { inputPath, outputPath, startTime, endTime, videoBitrate, fps, resolution, preset, keepAspect, taskId }) => {
    const ffCheck = checkFfmpegAvailability();
    if (!ffCheck.available) throw new Error('FFmpeg not found');
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac');
      
      if (videoBitrate !== '0') command = command.videoBitrate(videoBitrate);
      if (fps) command = command.fps(fps);
      
      if (resolution && resolution !== 'original') {
        const [targetW, targetH] = resolution.split('x').map(Number);
        if (keepAspect) {
          command = command.videoFilter([
            `scale=iw*min(${targetW}/iw\\,${targetH}/ih):ih*min(${targetW}/iw\\,${targetH}/ih)`,
            `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`
          ].join(','));
        } else {
          command = command.size(resolution);
        }
      }
      
      if (preset) command = command.addOption('-preset', preset);
      
      let totalFrames = Math.round((endTime - startTime) * fps);
      if (totalFrames === 0) totalFrames = 1;
      
      command.on('progress', (progress) => {
        const percent = progress.frames ? Math.min(100, Math.floor((progress.frames / totalFrames) * 100)) : 0;
        mainWindow.webContents.send('export-progress', { 
          taskId, 
          progress: { percent, frames: progress.frames, totalFrames, fps: progress.currentFps } 
        });
      });
      
      command.on('end', () => {
        activeExports.delete(taskId);
        resolve({ success: true, outputPath });
      });
      command.on('error', (err) => {
        activeExports.delete(taskId);
        reject(err);
      });
      activeExports.set(taskId, command);
      command.run();
    });
  });

  ipcMain.handle('cancel-export', async (event, taskId) => {
    const cmd = activeExports.get(taskId);
    if (cmd) { cmd.kill('SIGKILL'); activeExports.delete(taskId); return { success: true }; }
    return { success: false };
  });

  ipcMain.handle('show-save-dialog', async (event, defaultName) => {
    return await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
    });
  });

  ipcMain.handle('delete-video', async (event, filePath) => {
    try {
      await shell.trashItem(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rename-video', async (event, { oldPath, newPath }) => {
    const maxRetries = 5;
    const delay = 200;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        if (fs.existsSync(newPath)) return { success: false, error: 'File already exists' };
        fs.renameSync(oldPath, newPath);
        return { success: true };
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
          if (i === maxRetries) return { success: false, error: `File busy after ${maxRetries} retries` };
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          return { success: false, error: error.message };
        }
      }
    }
    return { success: false, error: 'Unexpected error' };
  });

  ipcMain.handle('show-input-dialog', async (event, options) => {
    const result = await prompt({
      title: options.title || 'Input',
      label: options.message || 'Please enter:',
      value: options.inputValue || '',
      inputAttrs: { type: 'text' },
      type: 'input'
    });
    return result;
  });

  ipcMain.on('zoom-in', () => {
    const current = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.min(3.0, current + 0.1));
  });
  ipcMain.on('zoom-out', () => {
    const current = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.max(0.5, current - 0.1));
  });
  ipcMain.on('zoom-reset', () => {
    mainWindow.webContents.setZoomFactor(1.0);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Video Editor Master',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });