import { Router } from 'express';
import { obs, connectOBS, disconnectOBS, isConnected } from '../obs.js';

const router = Router();

router.post('/connect', async (req, res) => {
  const { host = 'localhost', port = 4455, password = '' } = req.body;
  try {
    await connectOBS(host, String(port), password);
    res.json({ success: true, message: `Connected to OBS at ${host}:${port}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await disconnectOBS();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json({ connected: isConnected });
});

router.get('/scenes', async (req, res) => {
  try {
    const { scenes, currentProgramSceneName } = await obs.call('GetSceneList');
    res.json({ scenes, currentScene: currentProgramSceneName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scenes/current', async (req, res) => {
  const { sceneName } = req.body;
  try {
    await obs.call('SetCurrentProgramScene', { sceneName });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sources', async (req, res) => {
  try {
    const { inputs } = await obs.call('GetInputList');
    res.json({ sources: inputs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scene-items/:sceneName', async (req, res) => {
  try {
    const { sceneItems } = await obs.call('GetSceneItemList', {
      sceneName: req.params.sceneName,
    });
    res.json({ sceneItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sources/visibility', async (req, res) => {
  const { sceneName, sceneItemId, enabled } = req.body;
  try {
    await obs.call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId,
      sceneItemEnabled: enabled,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stream/start', async (req, res) => {
  try {
    await obs.call('StartStream');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stream/stop', async (req, res) => {
  try {
    await obs.call('StopStream');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/record/start', async (req, res) => {
  try {
    await obs.call('StartRecord');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/record/stop', async (req, res) => {
  try {
    await obs.call('StopRecord');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/inputs/mute — get mute state for all inputs
router.get('/inputs/mute', async (req, res) => {
  try {
    const { inputs } = await obs.call('GetInputList');
    const muteStates = await Promise.all(
      inputs.map(async (input) => {
        try {
          const { inputMuted } = await obs.call('GetInputMute', { inputName: input.inputName });
          return { inputName: input.inputName, muted: inputMuted };
        } catch {
          return { inputName: input.inputName, muted: false };
        }
      })
    );
    res.json({ muteStates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/inputs/mute — { inputName, muted: bool }
router.post('/inputs/mute', async (req, res) => {
  const { inputName, muted } = req.body;
  try {
    await obs.call('SetInputMute', { inputName, inputMuted: muted });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/inputs/mute/toggle — { inputName }
router.post('/inputs/mute/toggle', async (req, res) => {
  const { inputName } = req.body;
  try {
    await obs.call('ToggleInputMute', { inputName });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/media — list all media sources
router.get('/media', async (req, res) => {
  try {
    const { inputs } = await obs.call('GetInputList', { inputKind: 'ffmpeg_source' });
    res.json({ media: inputs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/media/trigger — play a media source { inputName }
router.post('/media/trigger', async (req, res) => {
  const { inputName } = req.body;
  try {
    await obs.call('TriggerMediaInputAction', {
      inputName,
      mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/transition — { transitionName, transitionDuration (ms) }
router.post('/transition', async (req, res) => {
  const { transitionName, transitionDuration } = req.body;
  try {
    if (transitionName) {
      await obs.call('SetCurrentSceneTransition', { transitionName });
    }
    if (transitionDuration) {
      await obs.call('SetCurrentSceneTransitionDuration', { transitionDuration });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/transitions — list available transitions
router.get('/transitions', async (req, res) => {
  try {
    const { transitions, currentSceneTransitionName } = await obs.call('GetSceneTransitionList');
    res.json({ transitions, current: currentSceneTransitionName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
