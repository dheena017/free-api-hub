import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function terminalLogPlugin() {
  return {
    name: 'terminal-logger',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/__vite_log' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { level, message } = JSON.parse(body);
              const time = new Date().toTimeString().split(' ')[0];
              const tag = '\x1b[1;95m[FRONTEND]\x1b[0m';
              const timeStr = `\x1b[90m${time}\x1b[0m`;

              let badge = '\x1b[1;94mINFO \x1b[0m';
              if (level === 'ERROR') badge = '\x1b[1;91mERROR\x1b[0m';
              else if (level === 'WARN') badge = '\x1b[1;93mWARN \x1b[0m';
              else if (level === 'OK' || level === 'RES') badge = '\x1b[1;92mOK   \x1b[0m';
              else if (level === 'REQ') badge = '\x1b[1;96mREQ  \x1b[0m';
              else if (level === 'PLAYGROUND') badge = '\x1b[1;93mPLAY \x1b[0m';
              else if (level === 'HEALTH') badge = '\x1b[1;96mPULSE\x1b[0m';

              console.log(`${tag} ${timeStr} ${badge} ${message}`);
            } catch {}
            res.statusCode = 200;
            res.end('ok');
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), terminalLogPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
});
