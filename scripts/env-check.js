#!/usr/bin/env node
// Simple env-check script that prints JSON on stdout for machine consumption
const os = require('os');
const path = require('path');

function send(obj) {
  console.log(JSON.stringify(obj));
}

(async function main() {
  const result = { platform: process.platform, arch: process.arch, ok: true, ffmpeg: null, messages: [] };
  try {
    const { getFfmpegPath } = require('../src/utils/ffmpeg');
    const p = getFfmpegPath();
    if (p) {
      result.ffmpeg = p;
      result.messages.push(`ffmpeg found: ${p}`);
    } else {
      result.ok = false;
      result.messages.push('ffmpeg not found. Try `npm install --save ffmpeg-static` or place binary at ./ffmpeg/ffmpeg');
    }
  } catch (e) {
    result.ok = false;
    result.messages.push(`error while resolving ffmpeg: ${e && e.message ? e.message : String(e)}`);
  }

  if (process.platform === 'darwin') {
    result.messages.push('macOS 注意: 需到 系统偏好 -> 隐私与安全 -> 屏幕录制 中授权应用录屏；若未授权，应用无法获取屏幕流。');
  } else if (process.platform === 'win32') {
    result.messages.push('Windows 注意: 录屏可能需要管理员权限或特定采集驱动支持，若无法捕获请检查防火墙/安全软件。');
  }

  send(result);
  console.log('---');
  console.log(result.messages.join('\n'));
})();
