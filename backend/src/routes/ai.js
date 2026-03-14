import { Router } from 'express';
import { analyzeAudioForCameraSwitch } from '../ai/cameraDirector.js';
import { obs, isConnected } from '../obs.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  const { audioLevels, currentScene, autoSwitch = false, availableMedia = [], apiKey } = req.body;

  if (!audioLevels || !Array.isArray(audioLevels)) {
    return res.status(400).json({ error: 'audioLevels array is required' });
  }

  try {
    const decision = await analyzeAudioForCameraSwitch(audioLevels, currentScene, availableMedia, apiKey);

    if (isConnected && autoSwitch) {
      if (decision.switchTo && decision.switchTo !== currentScene) {
        await obs.call('SetCurrentProgramScene', { sceneName: decision.switchTo });
        console.log(`[AI] Scene → "${decision.switchTo}" | ${decision.reason}`);
      }
      if (decision.muteMic?.inputName) {
        await obs.call('SetInputMute', {
          inputName: decision.muteMic.inputName,
          inputMuted: decision.muteMic.muted,
        });
        console.log(`[AI] Mute "${decision.muteMic.inputName}" → ${decision.muteMic.muted}`);
      }
      if (decision.playSound) {
        await obs.call('TriggerMediaInputAction', {
          inputName: decision.playSound,
          mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
        });
        console.log(`[AI] Play media "${decision.playSound}"`);
      }
    }

    res.json(decision);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
