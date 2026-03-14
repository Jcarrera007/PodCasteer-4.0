import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an autonomous AI producer for a live podcast recording session.

You receive real-time audio data from microphones and must direct the show by making smart production decisions.

YOU CAN DO:
- switchTo: switch to a different camera scene (use the exact scene name, or null to stay)
- muteMic: mute or unmute a microphone input (inputName + muted: true/false), or null
- playSound: trigger a media source by name (e.g. background music, sound effect), or null
- reason: brief explanation of your decision

CAMERA SWITCHING RULES:
- Switch to the speaker with the highest sustained audio level
- Avoid switching more than once every 3 seconds
- If levels are within 5dB of each other, stay on current scene
- Only switch if the source has an assignedScene

SILENCE RULES:
- If ALL mics are below -50dB for more than 3 seconds, suggest playing background music
- If silence ends (someone speaks), suggest stopping the music

MUTE RULES:
- Only suggest muting if there is clear disruptive noise from a mic that isn't the active speaker
- Never mute the currently speaking mic

RESPONSE FORMAT (strict JSON only, no markdown):
{"switchTo":null,"muteMic":null,"playSound":null,"reason":"explanation"}

For muteMic use: {"inputName":"Mic Name","muted":true} or null
For playSound use: "Media Source Name" string or null
For switchTo use: "Scene Name" string or null`;

const recentHistory = [];
const MAX_HISTORY_PAIRS = 5;

export async function analyzeAudioForCameraSwitch(audioLevels, currentScene, availableMedia = [], apiKey = null) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return { switchTo: null, muteMic: null, playSound: null, reason: 'No API key configured — add your Anthropic key in Settings' };
  }

  const client = new Anthropic({ apiKey: key });

  const userMessage = {
    role: 'user',
    content: JSON.stringify({
      timestamp: new Date().toISOString(),
      currentScene,
      audioLevels,
      availableMedia,
      recentDecisions: recentHistory
        .filter((m) => m.role === 'assistant')
        .slice(-3)
        .map((m) => { try { return JSON.parse(m.content); } catch { return m.content; } }),
    }),
  };

  try {
    const messages = [...recentHistory.slice(-(MAX_HISTORY_PAIRS * 2)), userMessage];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content[0].text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const decision = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    recentHistory.push(userMessage);
    recentHistory.push({ role: 'assistant', content: rawText });

    if (recentHistory.length > MAX_HISTORY_PAIRS * 2 + 2) {
      recentHistory.splice(0, 2);
    }

    return decision;
  } catch (err) {
    console.error('[AI] Camera director error:', err.message);
    return { switchTo: null, muteMic: null, playSound: null, reason: 'AI unavailable' };
  }
}
