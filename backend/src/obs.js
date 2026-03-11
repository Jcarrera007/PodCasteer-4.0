import OBSWebSocket from 'obs-websocket-js';
import { broadcastToClients } from './wsRelay.js';

const obs = new OBSWebSocket();
let isConnected = false;

const OBS_EVENTS_TO_RELAY = [
  'CurrentProgramSceneChanged',
  'StreamStateChanged',
  'RecordStateChanged',
  'SceneListChanged',
  'SceneItemEnableStateChanged',
  'InputVolumeMeters',
  'InputMuteStateChanged',
];

OBS_EVENTS_TO_RELAY.forEach((eventName) => {
  obs.on(eventName, (data) => {
    if (eventName === 'InputVolumeMeters') {
      console.log('[OBS] InputVolumeMeters inputs:', data.inputs?.map(i => i.inputName));
      obs.off('InputVolumeMeters'); // log once, then re-register silently
      obs.on('InputVolumeMeters', (d) => broadcastToClients({ type: 'InputVolumeMeters', data: d }));
    }
    broadcastToClients({ type: eventName, data });
  });
});

obs.on('ConnectionClosed', () => {
  isConnected = false;
  broadcastToClients({ type: 'ConnectionClosed' });
  console.log('[OBS] Connection closed');
});

obs.on('ConnectionError', (err) => {
  isConnected = false;
  broadcastToClients({ type: 'ConnectionError', error: err.message });
  console.error('[OBS] Connection error:', err.message);
});

export { obs, isConnected };

export async function connectOBS(host, port, password) {
  if (isConnected) {
    await obs.disconnect();
  }
  await obs.connect(`ws://${host}:${port}`, password);
  isConnected = true;
  broadcastToClients({ type: 'ConnectionOpened' });
  console.log(`[OBS] Connected to ws://${host}:${port}`);
}

export async function disconnectOBS() {
  if (isConnected) {
    await obs.disconnect();
    isConnected = false;
  }
}
