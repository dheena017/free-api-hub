import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { ensurePortFree } from './port-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Ensure logs directory exists
const logsDir = path.join(rootDir, 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {}

const combinedLogStream = fs.createWriteStream(path.join(logsDir, 'combined.log'), { flags: 'a' });

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

// Detect Python binary
const venvWin = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
const venvUnix = path.join(backendDir, 'venv', 'bin', 'python');
let pythonBin = 'python';

if (fs.existsSync(venvWin)) {
  pythonBin = venvWin;
} else if (fs.existsSync(venvUnix)) {
  pythonBin = venvUnix;
}

function getTimestamp() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

const BACKEND_TAG = '\x1b[1;96m[BACKEND]\x1b[0m';
const FRONTEND_TAG = '\x1b[1;95m[FRONTEND]\x1b[0m';

function printBanner() {
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('\x1b[1;92m%s\x1b[0m', '  🌐 FREE API HUB — UNIFIED REAL-TIME DEVELOPER CONSOLE        ');
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log(`  ${BACKEND_TAG}   FastAPI Server : \x1b[4m\x1b[96mhttp://localhost:8000\x1b[0m (Docs: \x1b[4m/docs\x1b[0m)`);
  console.log(`  ${FRONTEND_TAG}  Vite Web UI    : \x1b[4m\x1b[95mhttp://localhost:5173\x1b[0m`);
  console.log(`  \x1b[1;92m[LOGFILE]\x1b[0m    Disk Audit     : \x1b[90mlogs/combined.log\x1b[0m`);
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('  \x1b[90mHotkeys: [\x1b[96mb\x1b[90m] Open Docs  | [\x1b[95mf\x1b[90m] Open Web UI  | [\x1b[93mc\x1b[90m] Clear  | [\x1b[91mq\x1b[90m] Quit\x1b[0m\n');
}

printBanner();

const sharedEnv = {
  ...process.env,
  FORCE_COLOR: '1',
  PYTHONUNBUFFERED: '1',
  COLORTERM: 'truecolor'
};

let lastFrontendLine = '';
let lastFrontendLogTime = 0;

function formatLine(line, isBackend = true) {
  const clean = stripAnsi(line).trim();
  if (!clean) return null;

  // Filter noise on frontend
  if (!isBackend) {
    if (clean.startsWith('>') || clean.startsWith('npm warn')) return null;
    if (clean.includes('press h + enter') || clean.includes('to show help')) return null;

    const now = Date.now();
    if (clean === lastFrontendLine && (now - lastFrontendLogTime) < 2000) return null;
    lastFrontendLine = clean;
    lastFrontendLogTime = now;
  }

  if (line.includes('[BACKEND]') || line.includes('[FRONTEND]')) {
    return line;
  }

  const time = `\x1b[90m${getTimestamp()}\x1b[0m`;
  const tag = isBackend ? BACKEND_TAG : FRONTEND_TAG;
  let formatted = line;

  const isRealError = /\b(ERROR|CRITICAL|Exception|Traceback|SyntaxError|Error:|Failed)\b/i.test(clean) && !clean.includes('INFO:');
  const isWarning = /\b(WARNING|warning:|warn:)\b/i.test(clean);

  if (isBackend) {
    if (formatted.includes('INFO:')) {
      formatted = formatted.replace(/INFO:\s*/, '\x1b[1;94mINFO \x1b[0m ');
    } else if (isWarning) {
      formatted = formatted.replace(/WARNING:\s*/, '\x1b[1;93mWARN \x1b[0m \x1b[93m') + '\x1b[0m';
    } else if (isRealError) {
      formatted = `\x1b[1;91mERROR\x1b[0m \x1b[91m${formatted}\x1b[0m`;
    }
    if (formatted.includes('Application startup complete')) {
      formatted = formatted.replace('Application startup complete.', '\x1b[1;92mApplication startup complete.\x1b[0m');
    }
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '\x1b[4m\x1b[96m$1\x1b[0m');
  } else {
    // Frontend formatting
    const readyMatch = clean.match(/VITE\s+v?([0-9.]+)\s+ready\s+in\s+(\d+\s*ms)/i);
    if (readyMatch) {
      const lines = [
        `${tag} ${time} \x1b[1;94mINFO \x1b[0m Will watch for changes in frontend: ['src', 'public', 'index.html']`,
        `${tag} ${time} \x1b[1;92mOK   \x1b[0m \x1b[1;92mVite Frontend Server ready! Listening on port 5173\x1b[0m \x1b[90m(ready in ${readyMatch[2]})\x1b[0m`,
        `${tag} ${time} \x1b[1;94mINFO \x1b[0m Local Web UI  : \x1b[4m\x1b[95mhttp://localhost:5173/\x1b[0m`
      ];
      return lines.join('\n');
    }

    if (clean.includes('Local:') && clean.includes('5173')) {
      return null;
    }

    if (clean.includes('Network:')) {
      const urlMatch = clean.match(/https?:\/\/[^\s]+/);
      const netUrl = urlMatch ? urlMatch[0] : clean.replace(/.*Network:\s*/i, '').trim();
      const lines = [
        `${tag} ${time} \x1b[1;94mINFO \x1b[0m Network Access: \x1b[4m\x1b[95m${netUrl}\x1b[0m`,
        `${tag} ${time} \x1b[1;94mINFO \x1b[0m Backend Target: \x1b[4m\x1b[96mhttp://localhost:8000\x1b[0m | API prefix: /api/v1`,
        `${tag} ${time} \x1b[1;92mINFO \x1b[0m \x1b[1;92mApplication startup complete.\x1b[0m`
      ];
      return lines.join('\n');
    }

    let level = '\x1b[1;94mINFO \x1b[0m';
    let content = clean;

    if (isRealError) {
      level = '\x1b[1;91mERROR\x1b[0m';
      content = `\x1b[91m${clean}\x1b[0m`;
    } else if (isWarning) {
      level = '\x1b[1;93mWARN \x1b[0m';
      content = `\x1b[93m${clean}\x1b[0m`;
    } else {
      content = content
        .replace(/^➜\s*/, '')
        .replace(/^\[vite\]\s*/i, 'HMR ')
        .replace(/(https?:\/\/[^\s]+)/g, '\x1b[4m\x1b[95m$1\x1b[0m');
    }

    return `${tag} ${time} ${level} ${content}`;
  }

  return `${tag} ${time} ${formatted}`;
}

function pipeFormatted(stream, isBackend = true) {
  const rl = readline.createInterface({ input: stream });

  rl.on('line', (rawLine) => {
    const line = rawLine.trimEnd();
    if (!line) return;

    const outputLine = formatLine(line, isBackend);
    if (!outputLine) return; // Suppressed duplicate/noise

    console.log(outputLine);

    try {
      combinedLogStream.write(`[${getTimestamp()}] ${stripAnsi(outputLine)}\n`);
    } catch {}
  });
}

// Ensure both backend (8000) and frontend (5173) ports are free and reclaim them if occupied
await ensurePortFree(8000, { tag: BACKEND_TAG });
await ensurePortFree(5173, { tag: FRONTEND_TAG });

// Start backend
const backendProcess = spawn(pythonBin, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], {
  cwd: backendDir,
  shell: false,
  env: sharedEnv
});

pipeFormatted(backendProcess.stdout, true);
pipeFormatted(backendProcess.stderr, true);

// Start frontend
const frontendProcess = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
      cwd: frontendDir,
      shell: false,
      env: sharedEnv
    })
  : spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: false,
      env: sharedEnv
    });

pipeFormatted(frontendProcess.stdout, false);
pipeFormatted(frontendProcess.stderr, false);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '\u0003' || key.toLowerCase() === 'q') {
      cleanup();
    } else if (key.toLowerCase() === 'b') {
      console.log('\n\x1b[96m[HOTKEY]\x1b[0m Opening Swagger Docs at http://localhost:8000/docs');
      const openCmd = process.platform === 'win32' ? 'start http://localhost:8000/docs' : (process.platform === 'darwin' ? 'open http://localhost:8000/docs' : 'xdg-open http://localhost:8000/docs');
      exec(openCmd);
    } else if (key.toLowerCase() === 'f') {
      console.log('\n\x1b[95m[HOTKEY]\x1b[0m Opening Frontend UI at http://localhost:5173');
      const openCmd = process.platform === 'win32' ? 'start http://localhost:5173' : (process.platform === 'darwin' ? 'open http://localhost:5173' : 'xdg-open http://localhost:5173');
      exec(openCmd);
    } else if (key.toLowerCase() === 'c') {
      console.clear();
      printBanner();
    }
  });
}

function cleanup() {
  console.log('\n\x1b[33m[SHUTDOWN] Terminating backend and frontend processes cleanly...\x1b[0m');
  try {
    if (process.platform === 'win32') {
      if (backendProcess.pid) spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      if (frontendProcess.pid) spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
    } else {
      backendProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
    }
  } catch (err) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
