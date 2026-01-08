const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function _projectFfmpegPath() {
  const base = path.resolve(process.cwd(), 'ffmpeg');
  if (process.platform === 'win32') {
    const p = path.join(base, 'ffmpeg.exe');
    if (fs.existsSync(p)) return p;
  } else {
    const p = path.join(base, 'ffmpeg');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function _ffmpegStaticPath() {
  try {
    // require at runtime so package can be optional during CI/old installs
    // eslint-disable-next-line global-require
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) return ffmpegStatic;
  } catch (e) {
    return null;
  }
  return null;
}

function _whichFfmpeg() {
  try {
    if (process.platform === 'win32') {
      const out = child_process.execSync('where ffmpeg', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
      if (out) return out;
    } else {
      const out = child_process.execSync('which ffmpeg', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
      if (out) return out;
    }
  } catch (e) {
    // not found
  }
  return null;
}

/**
 * Try to resolve ffmpeg binary path:
 * 1) ./ffmpeg/ffmpeg(.exe)
 * 2) ffmpeg-static package
 * 3) ffmpeg in PATH (which/where)
 */
function getFfmpegPath() {
  const p1 = _projectFfmpegPath();
  if (p1) return p1;

  const p2 = _ffmpegStaticPath();
  if (p2) return p2;

  const p3 = _whichFfmpeg();
  if (p3) return p3;

  return null;
}

/**
 * Ensure ffmpeg is available; returns absolute path or throws Error with helpful message.
 */
function ensureFfmpegAvailable() {
  const p = getFfmpegPath();
  if (p) return p;

  let msg = 'ffmpeg 未找到。';
  msg += '\n尝试的路径： ./ffmpeg/ffmpeg (.exe), ffmpeg-static 包, 系统 PATH( which/where )。';
  msg += '\n建议：运行 `npm install --save ffmpeg-static` 或在仓库根目录放入平台对应的 ffmpeg 二进制，或者确保系统 PATH 中有 ffmpeg。';
  msg += '\n更多信息请运行 `npm run env-check` 获取详细诊断。';
  const e = new Error(msg);
  e.code = 'FFMPEG_NOT_FOUND';
  throw e;
}

module.exports = {
  getFfmpegPath,
  ensureFfmpegAvailable,
};
