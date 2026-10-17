import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { ensurePortFree } from './port-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

// Ensure logs directory exists
const logsDir = path.join(rootDir, 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {}

const logStream = fs.createWriteStream(path.join(logsDir, 'backend.log'), { flags: 'a' });

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

// Find virtualenv python or system python
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

function printBanner() {
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('\x1b[1;96m%s\x1b[0m', '  ⚡ FREE API HUB — FASTAPI BACKEND SERVER                     ');
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log(`  ${BACKEND_TAG}  API Server   : \x1b[4m\x1b[96mhttp://localhost:8000\x1b[0m`);
  console.log(`  ${BACKEND_TAG}  Swagger Docs : \x1b[4m\x1b[96mhttp://localhost:8000/docs\x1b[0m`);
  console.log(`  ${BACKEND_TAG}  Health Check : \x1b[4m\x1b[96mhttp://localhost:8000/api/v1/health\x1b[0m`);
  console.log(`  \x1b[1;92m[LOGFILE]\x1b[0m  Disk Audit   : \x1b[90mlogs/backend.log\x1b[0m`);
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('  \x1b[90mHotkeys: [\x1b[96mb\x1b[90m] Open Docs  | [\x1b[93mc\x1b[90m] Clear Screen  | [\x1b[91mq\x1b[90m] Quit\x1b[0m\n');
}

printBanner();

// Ensure port 8000 is free; kill any existing process occupying it to avoid port conflict
await ensurePortFree(8000, { tag: BACKEND_TAG });

const sharedEnv = {
  ...process.env,
  FORCE_COLOR: '1',
  PYTHONUNBUFFERED: '1',
  COLORTERM: 'truecolor'
};

// Use shell: false to avoid space-in-path issues on Windows (e.g. 'api mangement')
const child = spawn(pythonBin, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], {
  cwd: backendDir,
  shell: false,
  env: sharedEnv
});

function formatBackendLine(line) {
  // If line was already formatted by app/logger.py, keep it untouched
  if (line.includes('[BACKEND]')) {
    return line;
  }

  const time = `\x1b[90m${getTimestamp()}\x1b[0m`;
  let formatted = line;

  // Genuine error detection (exclude normal INFO lines)
  const isRealError = /\b(ERROR|CRITICAL|Exception|Traceback|SyntaxError|Error:)\b/i.test(line) && !line.includes('INFO:');
  const isWarning = /\b(WARNING|warning:)\b/i.test(line);

  if (formatted.includes('INFO:')) {
    formatted = formatted.replace(/INFO:\s*/, '\x1b[1;94mINFO \x1b[0m ');
  } else if (isWarning) {
    formatted = formatted.replace(/WARNING:\s*/, '\x1b[1;93mWARN \x1b[0m \x1b[93m') + '\x1b[0m';
  } else if (isRealError) {
    formatted = `\x1b[1;91mERROR\x1b[0m \x1b[91m${formatted}\x1b[0m`;
  }

  // Highlight URLs cleanly
  formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '\x1b[4m\x1b[96m$1\x1b[0m');

  // Highlight startup completion
  if (formatted.includes('Application startup complete')) {
    formatted = formatted.replace('Application startup complete.', '\x1b[1;92mApplication startup complete.\x1b[0m');
  }

  return `${BACKEND_TAG} ${time} ${formatted}`;
}

function pipeFormatted(stream) {
  const rl = readline.createInterface({ input: stream });

  rl.on('line', (rawLine) => {
    const line = rawLine.trimEnd();
    if (!line) {
      console.log();
      return;
    }

    const outputLine = formatBackendLine(line);
    console.log(outputLine);

    try {
      logStream.write(`[${getTimestamp()}] ${stripAnsi(outputLine)}\n`);
    } catch {}
  });
}

pipeFormatted(child.stdout);
pipeFormatted(child.stderr);

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
    } else if (key.toLowerCase() === 'c') {
      console.clear();
      printBanner();
    }
  });
}

function cleanup() {
  console.log('\n\x1b[33m[SHUTDOWN] Terminating backend server...\x1b[0m');
  try {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
    } else {
      child.kill('SIGINT');
    }
  } catch (err) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
