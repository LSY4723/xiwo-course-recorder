#!/usr/bin/env node
// idempotent postinstall helper: checks for ffmpeg presence and prints guidance
const path = require('path');
const fs = require('fs');

function log(msg) {
  console.log('[ffmpeg-fallback] ' + msg);
}

function existsProjectFfmpeg() {
  const base = path.resolve(process.cwd(), 'ffmpeg');
  if (process.platform === 'win32') {
    const p = path.join(base, 'ffmpeg.exe');
    return fs.existsSync(p);
  } else {
    const p = path.join(base, 'ffmpeg');
    return fs.existsSync(p);
  }
}

function hasFfmpegStatic() {
  try {
    // eslint-disable-next-line global-require
    const ff = require('ffmpeg-static');
    return !!ff;
  } catch (e) {
    return false;
  }
}

function checkPathFfmpeg() {
  try {
    const cp = require('child_process');
    if (process.platform === 'win32') {
      cp.execSync('where ffmpeg', { stdio: 'ignore' });
    } else {
      cp.execSync('which ffmpeg', { stdio: 'ignore' });
    }
    return true;
  } catch (e) {
    return false;
  }
}

(async function main() {
  if (existsProjectFfmpeg()) {
    log('Found project ffmpeg binary in ./ffmpeg/');
    return;
  }
  if (hasFfmpegStatic()) {
    log('ffmpeg-static is installed and will provide ffmpeg binary at runtime.');
    return;
  }
  if (checkPathFfmpeg()) {
    log('ffmpeg found in system PATH.');
    return;
  }

  log('No ffmpeg binary found.');
  log('Recommended: run `npm install --save ffmpeg-static` or place platform ffmpeg binary under ./ffmpeg/ (ffmpeg or ffmpeg.exe).');
})();
