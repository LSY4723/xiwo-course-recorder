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
