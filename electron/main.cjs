const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');

// ── Update check ──────────────────────────────────────────────────────────────
// Set your GitHub repo here to enable automatic update notifications.
// Format: 'https://api.github.com/repos/YOUR_USERNAME/PodCasteer/releases/latest'
const RELEASES_API_URL = '';

function checkForUpdates(win) {
  if (!RELEASES_API_URL) return;
  try {
    https.get(RELEASES_API_URL, { headers: { 'User-Agent': 'PodCasteer' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latest = release.tag_name?.replace(/^v/, '');
          const current = app.getVersion();
          if (latest && latest !== current) {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Update Available',
              message: `PodCasteer ${latest} is available`,
              detail: `You're running v${current}. Would you like to download the update?`,
              buttons: ['Download', 'Later'],
              defaultId: 0,
            }).then(({ response }) => {
              if (response === 0) shell.openExternal(release.html_url);
            });
          }
        } catch {}
      });
    }).on('error', () => {});
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

let mainWindow = null;

const logFile = path.join(app.getPath('userData'), 'podcasteer.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(logFile, line); } catch {}
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function loadEnv() {
  try {
    const envPath = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), '.env')
      : path.join(__dirname, '..', 'backend', '.env');
    log(`Loading .env from: ${envPath}`);
    // dotenv is bundled into server.cjs — load vars manually here
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const [key, ...rest] = line.split('=');
        if (key && rest.length && !process.env[key.trim()]) {
          process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
      log('.env loaded successfully');
    } else {
      log('.env not found — AI features require ANTHROPIC_API_KEY env var');
    }
  } catch (e) {
    log(`loadEnv error: ${e.message}`);
  }
}

function startBackend() {
  // Tell backend where the built frontend lives
  process.env.FRONTEND_DIST = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'frontend', 'dist')
    : path.join(__dirname, '..', 'frontend', 'dist');

  const bundle = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'backend-bundle', 'server.cjs')
    : path.join(__dirname, '..', 'backend-bundle', 'server.cjs');

  log(`Loading backend bundle: ${bundle}`);
  log(`Bundle exists: ${fs.existsSync(bundle)}`);
  log(`Frontend dist: ${process.env.FRONTEND_DIST}`);

  try {
    require(bundle);
    log('Backend started');
  } catch (err) {
    log(`Backend failed: ${err.message}\n${err.stack}`);
  }
}

function createWindow() {
  const ip = getLocalIP();
  log(`Creating window, IP: ${ip}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `PodCasteer  |  Mobile monitor: http://${ip}:3001`,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const tryLoad = (attempts = 0) => {
    log(`Loading UI (attempt ${attempts + 1})`);
    mainWindow.loadURL('http://localhost:3001').then(() => {
      log('UI loaded');
      // Check for updates after UI is ready
      setTimeout(() => checkForUpdates(mainWindow), 3000);
    }).catch((err) => {
      log(`Load failed: ${err.message}`);
      if (attempts < 30) setTimeout(() => tryLoad(attempts + 1), 500);
    });
  };

  setTimeout(tryLoad, 2000);
}

app.whenReady().then(() => {
  log(`Starting. isPackaged: ${app.isPackaged}`);
  loadEnv();
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
