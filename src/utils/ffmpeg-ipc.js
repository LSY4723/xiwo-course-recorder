const path = require('path');
const child_process = require('child_process');
const fs = require('fs');

const { ensureFfmpegAvailable } = require('./ffmpeg');

function _pipeAndForward(child, window) {
  if (!child) return;
  if (!window || !window.webContents) return;
  child.stderr.on('data', (chunk) => {
    try {
      window.webContents.send('ffmpeg-stderr', chunk.toString());
    } catch (e) { /* ignore */ }
  });
  child.stdout.on('data', (chunk) => {
    try {
      window.webContents.send('ffmpeg-stdout', chunk.toString());
    } catch (e) { /* ignore */ }
  });
  child.on('exit', (code, signal) => {
    try {
      window.webContents.send('ffmpeg-exit', { code, signal });
    } catch (e) { /* ignore */ }
  });
}

function initFfmpegIpc(ipcMain, mainWindow) {
  if (!ipcMain) throw new Error('ipcMain required');

  ipcMain.handle('run-env-check', async () => {
    const script = path.resolve(__dirname, '../../scripts/env-check.js');
    if (!fs.existsSync(script)) {
      return { ok: false, error: 'scripts/env-check.js not found' };
    }
    return new Promise((resolve) => {
      const child = child_process.spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => (out += d.toString()));
      child.stderr.on('data', (d) => (err += d.toString()));
      child.on('close', (code) => {
        try {
          const firstLine = out.split(/\r?\n/)[0] || '';
          let parsed;
          try { parsed = JSON.parse(firstLine); } catch (_) { parsed = null; }
          if (parsed) {
            resolve(Object.assign({ stdout: out, stderr: err, code }, parsed));
          } else {
            resolve({ ok: true, stdout: out, stderr: err, code });
          }
        } catch (e) {
          resolve({ ok: false, error: e.message, stdout: out, stderr: err });
        }
      });
    });
  });

  ipcMain.handle('spawn-ffmpeg-with-args', async (event, payload) => {
    try {
      const ffmpegPath = ensureFfmpegAvailable();
      const args = Array.isArray(payload && payload.args) ? payload.args : [];
      const opts = Object.assign({ cwd: process.cwd() }, (payload && payload.options) || {});
      const child = child_process.spawn(ffmpegPath, args, opts);
      _pipeAndForward(child, mainWindow);
      return { ok: true, pid: child.pid };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('spawn-raw-command', async (event, command, args = []) => {
    try {
      const child = child_process.spawn(command, args);
      _pipeAndForward(child, mainWindow);
      return { ok: true, pid: child.pid };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
}

module.exports = { initFfmpegIpc };
