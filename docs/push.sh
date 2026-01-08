#!/usr/bin/env bash
set -euo pipefail

BRANCH="xiwo/ffmpeg-integration"
COMMIT_MSG="Integrate ffmpeg-static helpers and env-check (add ffmpeg utils, ipc and scripts)"

# Ensure running from repo root
echo "Working dir: $(pwd)"
echo "Switching to default branch and pulling latest..."
if git rev-parse --verify main >/dev/null 2>&1; then
  git checkout main
elif git rev-parse --verify master >/dev/null 2>&1; then
  git checkout master
else
  echo "Error: could not find 'main' or 'master' branch. Aborting."
  exit 1
fi
git pull origin $(git rev-parse --abbrev-ref HEAD)

echo "Creating branch: $BRANCH"
git checkout -b "$BRANCH"

# Create directories
mkdir -p src/utils scripts docs

echo "Writing src/utils/ffmpeg.js ..."
cat > src/utils/ffmpeg.js <<'EOF'
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
EOF

echo "Writing src/utils/ffmpeg-ipc.js ..."
cat > src/utils/ffmpeg-ipc.js <<'EOF'
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
EOF

echo "Writing scripts/ffmpeg-fallback.js ..."
cat > scripts/ffmpeg-fallback.js <<'EOF'
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
EOF

echo "Writing scripts/env-check.js ..."
cat > scripts/env-check.js <<'EOF'
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
EOF

echo "Writing docs/FFMPEG.md ..."
cat > docs/FFMPEG.md <<'EOF'
# FFmpeg and env-check

This repository requires ffmpeg to perform recording and streaming tasks. To minimize repository size we do not include platform ffmpeg binaries directly.

Recommended steps to enable ffmpeg support:

1. Install ffmpeg-static which provides platform ffmpeg binaries via npm:

   npm install --save ffmpeg-static

2. Alternatively, place a platform ffmpeg binary at project root under ./ffmpeg/ffmpeg (mac/linux) or ./ffmpeg/ffmpeg.exe (Windows).

3. You can run a quick environment check:

   npm run env-check

   If package.json does not yet contain the env-check script, add the following to your scripts:

   "scripts": {
     "env-check": "node ./scripts/env-check.js",
     "postinstall": "node ./scripts/ffmpeg-fallback.js"
   }

The `env-check` prints JSON on the first line which is used by the app IPC to show diagnostics.
EOF

cat > docs/MAIN_JS_INSTRUCTIONS.txt <<'EOF'
Insert at top near other requires/imports:

const { initFfmpegIpc } = require('./src/utils/ffmpeg-ipc');

and after the BrowserWindow (mainWindow) has been created and ipcMain is available, add:

initFfmpegIpc(ipcMain, mainWindow);
EOF

# Make scripts executable (best effort)
chmod +x scripts/ffmpeg-fallback.js scripts/env-check.js || true

echo "Installing ffmpeg-static (this will modify package.json/package-lock if needed)..."
npm install --save ffmpeg-static

echo "Staging files..."
git add src/utils/ffmpeg.js src/utils/ffmpeg-ipc.js scripts/ffmpeg-fallback.js scripts/env-check.js docs/FFMPEG.md docs/MAIN_JS_INSTRUCTIONS.txt || true

echo "Committing..."
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$COMMIT_MSG"
fi

echo "Pushing branch to origin..."
git push -u origin "$BRANCH"

echo "Done. Branch pushed: $BRANCH"
EOF