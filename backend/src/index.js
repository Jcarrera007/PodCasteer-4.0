import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { WebSocketServer } from 'ws';
import obsRoutes from './routes/obs.js';
import aiRoutes from './routes/ai.js';
import { initWsRelay } from './wsRelay.js';

// import.meta.url is only available in ESM (dev mode).
// In the bundled CJS build, FRONTEND_DIST env var is used instead.
let __filename = '', __dirname = '';
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch {}

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, Electron renderer) and any listed origin
    // Also allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for mobile access
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/obs', obsRoutes);
app.use('/api/ai', aiRoutes);

// Serve built frontend for Electron desktop and mobile LAN access
// FRONTEND_DIST is set by electron/main.cjs; fallback for raw dev usage
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — return index.html for any non-API route
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
initWsRelay(wss);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] PodCasteer backend running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket relay ready on ws://localhost:${PORT}/ws`);
  console.log(`[Server] LAN access available — open http://<your-ip>:${PORT} on mobile`);
});
