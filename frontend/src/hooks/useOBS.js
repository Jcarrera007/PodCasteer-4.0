import axios from 'axios';
import { useObsStore } from '../store/obsStore';

const api = axios.create({ baseURL: '/api' });

export function useOBS() {
  const store = useObsStore();

  const connect = async (config) => {
    store.setConnectionStatus('connecting');
    store.setConnectionError(null);
    try {
      await api.post('/obs/connect', config);
      await fetchScenes();
    } catch (err) {
      store.setConnectionStatus('error');
      store.setConnectionError(err.response?.data?.error || err.message);
    }
  };

  const disconnect = async () => {
    try {
      await api.post('/obs/disconnect');
      store.setConnectionStatus('disconnected');
      store.setScenes([]);
      store.setCurrentScene(null);
    } catch (err) {
      console.error('[OBS] Disconnect error:', err.message);
    }
  };

  const fetchScenes = async () => {
    const res = await api.get('/obs/scenes');
    store.setScenes(res.data.scenes);
    store.setCurrentScene(res.data.currentScene);
    return res.data;
  };

  const switchScene = async (sceneName) => {
    await api.post('/obs/scenes/current', { sceneName });
    store.setCurrentScene(sceneName);
  };

  const fetchSources = async () => {
    const res = await api.get('/obs/sources');
    store.setSources(res.data.sources);
    // Also fetch mute states and media sources
    fetchMuteStates();
    fetchMediaInputs();
    return res.data.sources;
  };

  const fetchMuteStates = async () => {
    try {
      const res = await api.get('/obs/inputs/mute');
      const map = {};
      res.data.muteStates.forEach(({ inputName, muted }) => { map[inputName] = muted; });
      store.setMutedInputs(map);
    } catch {}
  };

  const fetchMediaInputs = async () => {
    try {
      const res = await api.get('/obs/media');
      store.setMediaInputs(res.data.media || []);
    } catch {}
  };

  const fetchSceneItems = async (sceneName) => {
    const res = await api.get(`/obs/scene-items/${encodeURIComponent(sceneName)}`);
    return res.data.sceneItems;
  };

  const toggleSourceVisibility = async (sceneName, sceneItemId, enabled) => {
    await api.post('/obs/sources/visibility', { sceneName, sceneItemId, enabled });
  };

  const setInputMuted = async (inputName, muted) => {
    await api.post('/obs/inputs/mute', { inputName, muted });
    store.setInputMuted(inputName, muted);
  };

  const toggleInputMute = async (inputName) => {
    await api.post('/obs/inputs/mute/toggle', { inputName });
    store.setInputMuted(inputName, !store.mutedInputs[inputName]);
  };

  const triggerMedia = async (inputName) => {
    await api.post('/obs/media/trigger', { inputName });
  };

  const startStream = async () => { await api.post('/obs/stream/start'); store.setIsStreaming(true); };
  const stopStream  = async () => { await api.post('/obs/stream/stop');  store.setIsStreaming(false); };
  const startRecord = async () => { await api.post('/obs/record/start'); store.setIsRecording(true); };
  const stopRecord  = async () => { await api.post('/obs/record/stop');  store.setIsRecording(false); };

  const analyzeAudio = async (obsAudioLevels, currentScene) => {
    const { aiAutoSwitch, micAssignments, mediaInputs } = store;

    const levelsWithScenes = Object.entries(obsAudioLevels).map(([inputName, level]) => ({
      source: inputName,
      level,
      assignedScene: micAssignments[inputName] || null,
    }));

    const res = await api.post('/ai/analyze', {
      audioLevels: levelsWithScenes,
      currentScene,
      autoSwitch: aiAutoSwitch,
      availableMedia: mediaInputs.map((m) => m.inputName),
    });

    store.addClaudeDecision(res.data);
    return res.data;
  };

  return {
    connect, disconnect, fetchScenes, switchScene,
    fetchSources, fetchSceneItems, fetchMuteStates, fetchMediaInputs,
    toggleSourceVisibility,
    setInputMuted, toggleInputMute,
    triggerMedia,
    startStream, stopStream, startRecord, stopRecord,
    analyzeAudio,
  };
}
