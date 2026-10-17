/**
 * Frontend High-Contrast Colored Logger
 * Formats client-side logs with distinct purple/magenta [FRONTEND] badges,
 * categorized tags (API, Playground, Health), timestamps, and rich styling.
 * Also maintains an in-memory observable buffer for the in-browser Live Logs Drawer.
 */

export interface LogEntry {
  id: string;
  source: 'frontend' | 'backend';
  timestamp: string;
  level: 'INFO' | 'OK' | 'SUCCESS' | 'WARN' | 'ERROR' | 'REQ' | 'RES' | 'PLAYGROUND' | 'HEALTH';
  message: string;
  category?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  durationMs?: number;
  data?: any;
}

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// CSS styling for Browser Console
const STYLES = {
  prefix: 'background: #9333ea; color: #ffffff; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-size: 11px;',
  time: 'color: #94a3b8; font-weight: 400; font-size: 10px; margin-left: 4px;',
  info: 'background: #3b82f6; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  success: 'background: #22c55e; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  warn: 'background: #eab308; color: #000000; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  error: 'background: #ef4444; color: #ffffff; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  apiReq: 'background: #06b6d4; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  apiRes: 'background: #10b981; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  playground: 'background: #f97316; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  health: 'background: #14b8a6; color: #ffffff; font-weight: 600; padding: 2px 5px; border-radius: 3px; font-size: 10px;',
  text: 'color: inherit; font-size: 11px; margin-left: 4px;',
  url: 'color: #38bdf8; font-weight: 600;',
  duration: 'color: #a855f7; font-weight: 600;'
};

// ANSI fallback for terminal environments
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  prefix: '\x1b[1;35m[FRONTEND]\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function getTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

// In-memory buffer for in-browser visual dev tools
const MAX_LOGS = 250;
let logHistory: LogEntry[] = [];
const subscribers = new Set<(logs: LogEntry[]) => void>();

function notifySubscribers() {
  const snapshot = [...logHistory];
  subscribers.forEach((sub) => {
    try {
      sub(snapshot);
    } catch {
      // Ignore listener error
    }
  });
}

function pushLog(entry: Omit<LogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
  const completeEntry: LogEntry = {
    ...entry,
    id: entry.id || `fe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || getTimestamp()
  };

  logHistory.push(completeEntry);
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift();
  }
  notifySubscribers();
}

export const logger = {
  info(message: string, ...extra: any[]) {
    const time = getTimestamp();
    if (isBrowser) {
      console.log(`%c[FRONTEND]%c ${time} %cINFO%c ${message}`, STYLES.prefix, STYLES.time, STYLES.info, STYLES.text, ...extra);
    } else {
      console.log(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.blue}INFO${ANSI.reset} ${message}`, ...extra);
    }
    pushLog({
      source: 'frontend',
      level: 'INFO',
      category: 'APP',
      message,
      data: extra.length ? extra : undefined
    });
  },

  apiReq(method: string, url: string, params?: any) {
    const time = getTimestamp();
    if (isBrowser) {
      console.groupCollapsed(
        `%c[FRONTEND]%c ${time} %cREQ%c ${method} %c${url}`,
        STYLES.prefix,
        STYLES.time,
        STYLES.apiReq,
        STYLES.text,
        STYLES.url
      );
      if (params) console.log('Params/Body:', params);
      console.groupEnd();
    } else {
      console.log(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.cyan}REQ${ANSI.reset} ${method} ${url}`, params || '');
    }

    pushLog({
      source: 'frontend',
      level: 'REQ',
      category: 'API',
      method,
      url,
      message: `${method} ${url}`,
      data: params
    });
  },

  apiRes(method: string, url: string, status: number, durationMs: number, data?: any) {
    const time = getTimestamp();
    const isOk = status >= 200 && status < 300;
    const badgeStyle = isOk ? STYLES.apiRes : STYLES.error;
    const badgeColor = isOk ? ANSI.green : ANSI.red;

    if (isBrowser) {
      console.groupCollapsed(
        `%c[FRONTEND]%c ${time} %c${status} OK%c ${method} %c${url}%c in %c${durationMs.toFixed(1)}ms`,
        STYLES.prefix,
        STYLES.time,
        badgeStyle,
        STYLES.text,
        STYLES.url,
        STYLES.text,
        STYLES.duration
      );
      if (data) console.log('Response Payload:', data);
      console.groupEnd();
    } else {
      console.log(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${badgeColor}${status}${ANSI.reset} ${method} ${url} in ${durationMs.toFixed(1)}ms`);
    }

    pushLog({
      source: 'frontend',
      level: isOk ? 'RES' : 'ERROR',
      category: 'API',
      method,
      url,
      statusCode: status,
      durationMs: roundMs(durationMs),
      message: `${status} ${method} ${url} (${durationMs.toFixed(1)}ms)`,
      data
    });
  },

  apiErr(method: string, url: string, error: any, durationMs?: number) {
    const time = getTimestamp();
    const durStr = durationMs ? ` after ${durationMs.toFixed(1)}ms` : '';
    const errMsg = error instanceof Error ? error.message : String(error);

    if (isBrowser) {
      console.error(
        `%c[FRONTEND]%c ${time} %cERROR%c ${method} %c${url}%c${durStr} -> ${errMsg}`,
        STYLES.prefix,
        STYLES.time,
        STYLES.error,
        STYLES.text,
        STYLES.url,
        STYLES.text,
        error
      );
    } else {
      console.error(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.red}ERROR${ANSI.reset} ${method} ${url}${durStr} -> ${errMsg}`);
    }

    pushLog({
      source: 'frontend',
      level: 'ERROR',
      category: 'API',
      method,
      url,
      durationMs: durationMs ? roundMs(durationMs) : undefined,
      message: `${method} ${url} -> ${errMsg}`,
      data: error
    });
  },

  playground(endpoint: string, method: string, status: number, durationMs: number) {
    const time = getTimestamp();
    if (isBrowser) {
      console.log(
        `%c[FRONTEND]%c ${time} %cPLAYGROUND%c ${method} %c${endpoint}%c -> Status ${status} (%c${durationMs}ms%c)`,
        STYLES.prefix,
        STYLES.time,
        STYLES.playground,
        STYLES.text,
        STYLES.url,
        STYLES.text,
        STYLES.duration,
        STYLES.text
      );
    } else {
      console.log(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.yellow}PLAYGROUND${ANSI.reset} ${method} ${endpoint} -> ${status} (${durationMs}ms)`);
    }

    pushLog({
      source: 'frontend',
      level: 'PLAYGROUND',
      category: 'PLAYGROUND',
      method,
      url: endpoint,
      statusCode: status,
      durationMs,
      message: `Run ${method} ${endpoint} -> Status ${status} (${durationMs}ms)`
    });
  },

  health(slug: string, status: string, latencyMs: number) {
    const time = getTimestamp();
    if (isBrowser) {
      console.log(
        `%c[FRONTEND]%c ${time} %cHEALTH%c Probe API [%c${slug}%c] -> ${status.toUpperCase()} (${latencyMs}ms)`,
        STYLES.prefix,
        STYLES.time,
        STYLES.health,
        STYLES.text,
        STYLES.url,
        STYLES.text
      );
    } else {
      console.log(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.cyan}HEALTH${ANSI.reset} [${slug}] -> ${status} (${latencyMs}ms)`);
    }

    pushLog({
      source: 'frontend',
      level: 'HEALTH',
      category: 'PULSE',
      message: `Health probe [${slug}] -> ${status.toUpperCase()} (${latencyMs}ms)`,
      durationMs: latencyMs
    });
  },

  warn(message: string, ...extra: any[]) {
    const time = getTimestamp();
    if (isBrowser) {
      console.warn(`%c[FRONTEND]%c ${time} %cWARN%c ${message}`, STYLES.prefix, STYLES.time, STYLES.warn, STYLES.text, ...extra);
    } else {
      console.warn(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.yellow}WARN${ANSI.reset} ${message}`, ...extra);
    }

    pushLog({
      source: 'frontend',
      level: 'WARN',
      category: 'APP',
      message,
      data: extra.length ? extra : undefined
    });
  },

  error(message: string, ...extra: any[]) {
    const time = getTimestamp();
    if (isBrowser) {
      console.error(`%c[FRONTEND]%c ${time} %cERROR%c ${message}`, STYLES.prefix, STYLES.time, STYLES.error, STYLES.text, ...extra);
    } else {
      console.error(`${ANSI.prefix} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.red}ERROR${ANSI.reset} ${message}`, ...extra);
    }

    pushLog({
      source: 'frontend',
      level: 'ERROR',
      category: 'APP',
      message,
      data: extra.length ? extra : undefined
    });
  },

  // Observable subscription for UI components
  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    subscribers.add(listener);
    listener([...logHistory]);
    return () => {
      subscribers.delete(listener);
    };
  },

  getHistory(): LogEntry[] {
    return [...logHistory];
  },

  clear() {
    logHistory = [];
    notifySubscribers();
  },

  addBackendLogs(backendLogs: any[]) {
    if (!Array.isArray(backendLogs)) return;
    let added = false;
    const existingIds = new Set(logHistory.map(l => l.id));

    for (const item of backendLogs) {
      const id = item.id || `be_${item.time_iso}_${item.message}`;
      if (!existingIds.has(id)) {
        logHistory.push({
          id,
          source: 'backend',
          timestamp: item.timestamp || (item.time_iso ? item.time_iso.split('T')[1]?.slice(0, 8) : getTimestamp()),
          level: (item.level as any) || 'INFO',
          category: item.category || 'BACKEND',
          message: item.message || '',
          method: item.method,
          url: item.path,
          statusCode: item.status_code,
          durationMs: item.latency_ms,
          data: item.details
        });
        existingIds.add(id);
        added = true;
      }
    }

    if (added) {
      // Sort chronologically
      logHistory.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (logHistory.length > MAX_LOGS) {
        logHistory = logHistory.slice(-MAX_LOGS);
      }
      notifySubscribers();
    }
  }
};

function roundMs(ms: number): number {
  return Math.round(ms * 10) / 10;
}
