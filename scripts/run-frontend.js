import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { ensurePortFree } from './port-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');

// Ensure logs directory exists
const logsDir = path.join(rootDir, 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {}

const logStream = fs.createWriteStream(path.join(logsDir, 'frontend.log'), { flags: 'a' });

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function getTimestamp() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

const FRONTEND_TAG = '\x1b[1;95m[FRONTEND]\x1b[0m';

function printBanner() {
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('\x1b[1;95m%s\x1b[0m', '  ⚡ FREE API HUB — REACT + VITE FRONTEND SERVER              ');
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log(`  ${FRONTEND_TAG}  Vite Web UI    : \x1b[4m\x1b[95mhttp://localhost:5173\x1b[0m`);
  console.log(`  ${FRONTEND_TAG}  Backend Target : \x1b[4m\x1b[96mhttp://localhost:8000\x1b[0m`);
  console.log(`  \x1b[1;92m[LOGFILE]\x1b[0m   Disk Audit     : \x1b[90mlogs/frontend.log\x1b[0m`);
  console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------------------');
  console.log('  \x1b[90mHotkeys: [\x1b[95mf\x1b[90m] Open Web UI  | [\x1b[93mc\x1b[90m] Clear Screen  | [\x1b[91mq\x1b[90m] Quit\x1b[0m\n');
}

printBanner();

// Ensure port 5173 is free; kill any existing process occupying it to avoid port switching
await ensurePortFree(5173, { tag: FRONTEND_TAG });

const sharedEnv = {
  ...process.env,
  FORCE_COLOR: '1',
  COLORTERM: 'truecolor'
};

const child = process.platform === 'win32'
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

let lastLoggedLine = '';
let lastLoggedTime = 0;

function formatFrontendLine(line) {
  const clean = stripAnsi(line).trim();
  if (!clean) return null;

  // 1. Filter out npm script execution echo noise
  if (clean.startsWith('>') || clean.startsWith('npm warn')) {
    return null;
  }

  // 2. Filter out interactive help prompt noise
  if (clean.includes('press h + enter') || clean.includes('to show help')) {
    return null;
  }

  // 3. Deduplicate identical consecutive lines within 2 seconds
  const now = Date.now();
  if (clean === lastLoggedLine && (now - lastLoggedTime) < 2000) {
    return null;
  }
  lastLoggedLine = clean;
  lastLoggedTime = now;

  // If already tagged, pass through
  if (line.includes('[FRONTEND]')) {
    return line;
  }

  const time = `\x1b[90m${getTimestamp()}\x1b[0m`;

  // 4. Handle Vite ready banner and format cleanly with [OK]
  const readyMatch = clean.match(/VITE\s+v?([0-9.]+)\s+ready\s+in\s+(\d+\s*ms)/i);
  if (readyMatch) {
    const lines = [
      `${FRONTEND_TAG} ${time} \x1b[1;94mINFO \x1b[0m Will watch for changes in frontend: ['src', 'public', 'index.html']`,
      `${FRONTEND_TAG} ${time} \x1b[1;92mOK   \x1b[0m \x1b[1;92mVite Frontend Server ready! Listening on port 5173\x1b[0m \x1b[90m(ready in ${readyMatch[2]})\x1b[0m`,
      `${FRONTEND_TAG} ${time} \x1b[1;94mINFO \x1b[0m Local Web UI  : \x1b[4m\x1b[95mhttp://localhost:5173/\x1b[0m`
    ];
    return lines.join('\n');
  }

  // 5. Suppress duplicate Local URL line since it's already rendered cleanly above
  if (clean.includes('Local:') && clean.includes('5173')) {
    return null;
  }

  // 6. Clean Network URL line and add application startup complete
  if (clean.includes('Network:')) {
    const urlMatch = clean.match(/https?:\/\/[^\s]+/);
    const netUrl = urlMatch ? urlMatch[0] : clean.replace(/.*Network:\s*/i, '').trim();
    const lines = [
      `${FRONTEND_TAG} ${time} \x1b[1;94mINFO \x1b[0m Network Access: \x1b[4m\x1b[95m${netUrl}\x1b[0m`,
      `${FRONTEND_TAG} ${time} \x1b[1;94mINFO \x1b[0m Backend Target: \x1b[4m\x1b[96mhttp://localhost:8000\x1b[0m | API prefix: /api/v1`,
      `${FRONTEND_TAG} ${time} \x1b[1;92mINFO \x1b[0m \x1b[1;92mApplication startup complete.\x1b[0m`
    ];
    return lines.join('\n');
  }

  // 7. Error & Warning detection matching backend
  const isRealError = /\b(ERROR|Failed|Error:)\b/i.test(clean);
  const isWarning = /\b(WARNING|warning:|warn:)\b/i.test(clean);

  let level = '\x1b[1;94mINFO \x1b[0m';
  let content = clean;

  if (isRealError) {
    level = '\x1b[1;91mERROR\x1b[0m';
    content = `\x1b[91m${clean}\x1b[0m`;
  } else if (isWarning) {
    level = '\x1b[1;93mWARN \x1b[0m';
    content = `\x1b[93m${clean}\x1b[0m`;
  } else {
    // Normal INFO line - clean Vite symbol artifacts
    content = content
      .replace(/^➜\s*/, '')
      .replace(/^\[vite\]\s*/i, 'HMR ')
      .replace(/(https?:\/\/[^\s]+)/g, '\x1b[4m\x1b[95m$1\x1b[0m');
  }

  return `${FRONTEND_TAG} ${time} ${level} ${content}`;
}

function pipeFormatted(stream) {
  const rl = readline.createInterface({ input: stream });

  rl.on('line', (rawLine) => {
    const line = rawLine.trimEnd();
    if (!line) return;

    const outputLine = formatFrontendLine(line);
    if (!outputLine) return; // Deduplicated or filtered noise

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
  console.log('\n\x1b[33m[SHUTDOWN] Terminating frontend server...\x1b[0m');
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
