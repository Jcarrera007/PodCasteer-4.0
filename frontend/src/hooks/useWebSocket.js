import { useEffect, useRef } from 'react';
import { useObsStore } from '../store/obsStore';

// In dev: Vite proxy doesn't forward WS, so falls back to local backend.
// When served by Express (Electron or mobile LAN), uses the current host automatically.
// In production: set VITE_WS_URL to your tunnel URL.
// e.g. VITE_WS_URL=wss://your-tunnel.trycloudflare.com/ws
const WS_URL = import.meta.env.VITE_WS_URL ||
  `ws://${window.location.hostname}:${window.location.port || 3001}/ws`;
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const handleObsEvent = useObsStore((s) => s.handleObsEvent);

  function connect() {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] Connected to relay');

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          handleObsEvent(parsed);
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected — reconnecting in 3s');
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return wsRef;
}
