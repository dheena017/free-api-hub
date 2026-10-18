import { execSync } from 'child_process';
import net from 'net';

/**
 * Checks if a process with the given PID is actively running.
 * 
 * @param {number} pid
 * @returns {boolean}
 */
export function isPidAlive(pid) {
  if (!pid || pid === 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // Exists but belongs to another user/privilege
  }
}

/**
 * Returns an array of active PIDs currently listening or binding to the given port.
 * Works across Windows, macOS, and Linux.
 * 
 * @param {number|string} port
 * @returns {number[]}
 */
export function getPidsOnPort(port) {
  const pids = new Set();
  const portNum = Number(port);
  if (!portNum) return [];

  if (process.platform === 'win32') {
    // 1. First attempt: netstat -ano -p tcp
    try {
      const output = execSync('netstat -ano -p tcp', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      });

      for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('TCP')) continue;

        const parts = line.split(/\s+/);
        // Column 0: TCP
        // Column 1: Local Address (e.g. 0.0.0.0:5173, [::]:5173, 127.0.0.1:8000)
        // Column 2: Foreign Address
        // Column 3: State (e.g. LISTENING, ESTABLISHED, etc.)
        // Column 4: PID
        if (parts.length >= 5) {
          const localAddr = parts[1];
          const state = parts[3];
          const pidStr = parts[parts.length - 1];

          // Check if local address ends with :<port>
          const colonIdx = localAddr.lastIndexOf(':');
          if (colonIdx !== -1) {
            const parsedPort = Number(localAddr.slice(colonIdx + 1));
            if (parsedPort === portNum) {
              const pid = parseInt(pidStr, 10);
              // Target LISTENING servers, or any process holding the port, but only if alive and not self
              if (pid && pid !== process.pid && pid !== 0 && isPidAlive(pid)) {
                if (state.toUpperCase().includes('LISTEN') || parts.length === 5) {
                  pids.add(pid);
                }
              }
            }
          }
        }
      }
    } catch {
      // Fallback below
    }

    // 2. PowerShell fallback / verification (catches any Listen TCP connection)
    if (pids.size === 0) {
      try {
        const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-NetTCPConnection -LocalPort ${portNum} -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -ExpandProperty OwningProcess"`;
        const psOut = execSync(psCmd, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          windowsHide: true
        });

        for (const line of psOut.split(/\r?\n/)) {
          const pid = parseInt(line.trim(), 10);
          if (pid && pid !== process.pid && pid !== 0 && isPidAlive(pid)) {
            pids.add(pid);
          }
        }
      } catch {
        // Ignore PowerShell errors
      }
    }
  } else {
    // macOS / Linux
    try {
      const lsofOut = execSync(`lsof -ti tcp:${portNum}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      for (const line of lsofOut.split(/\r?\n/)) {
        const pid = parseInt(line.trim(), 10);
        if (pid && pid !== process.pid && pid !== 0 && isPidAlive(pid)) {
          pids.add(pid);
        }
      }
    } catch {}

    if (pids.size === 0) {
      try {
        const fuserOut = execSync(`fuser ${portNum}/tcp 2>/dev/null`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        for (const token of fuserOut.trim().split(/\s+/)) {
          const pid = parseInt(token.trim(), 10);
          if (pid && pid !== process.pid && pid !== 0 && isPidAlive(pid)) {
            pids.add(pid);
          }
        }
      } catch {}
    }
  }

  return Array.from(pids);
}

/**
 * Checks if a TCP port is currently available to be bound.
 * 
 * @param {number|string} port
 * @returns {Promise<boolean>}
 */
export function isPortAvailable(port) {
  const portNum = Number(port);
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen({ port: portNum, host: '0.0.0.0' });
  });
}

/**
 * Forcefully terminates a process by its PID.
 * On Windows, uses taskkill with /T to kill the entire process tree.
 * 
 * @param {number} pid
 * @returns {boolean}
 */
export function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, {
        stdio: 'ignore',
        windowsHide: true
      });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a port is completely free and ready for use.
 * If any process is occupying the port, it kills that process and waits for the OS
 * to release the socket. Guarantees the server binds to the exact intended port
 * without switching or picking an alternate port.
 * 
 * @param {number|string} port
 * @param {object} options
 * @param {string} options.tag Prefix tag for console logging
 * @param {boolean} options.silent Suppress logging
 * @returns {Promise<boolean>}
 */
export async function ensurePortFree(port, { tag = '', silent = false } = {}) {
  const portNum = Number(port);
  const tagPrefix = tag ? `${tag} ` : '';

  const pids = getPidsOnPort(portNum);

  if (pids.length > 0) {
    const msg = `${tagPrefix}Port ${portNum} is currently in use by process PID(s): ${pids.join(', ')}. Please stop the conflicting process or configure an alternate port.`;
    if (!silent) {
      console.error(`\x1b[31m⚠️  ${msg}\x1b[0m`);
    }
    throw new Error(msg);
  }

  const available = await isPortAvailable(portNum);
  if (!available) {
    const msg = `${tagPrefix}Port ${portNum} is not available for binding.`;
    if (!silent) {
      console.error(`\x1b[31m⚠️  ${msg}\x1b[0m`);
    }
    throw new Error(msg);
  }

  return true;
}

