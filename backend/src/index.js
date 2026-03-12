import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import obsRoutes from './routes/obs.js';
import aiRoutes from './routes/ai.js';
import { initWsRelay } from './wsRelay.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) and any listed origin
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/obs', obsRoutes);
app.use('/api/ai', aiRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
initWsRelay(wss);

server.listen(PORT, () => {
  console.log(`[Server] PodCasteer backend running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket relay ready on ws://localhost:${PORT}/ws`);
});
