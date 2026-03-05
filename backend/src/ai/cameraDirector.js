import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an intelligent podcast camera director for a live recording session.

You receive real-time audio level data from podcast microphones and must decide which camera scene to focus on. Your primary goal is to keep the video engaging by following the active speaker.

DECISION RULES:
- Switch to the speaker with the highest sustained audio level (not just momentary peaks)
- Avoid switching more than once every 3 seconds to prevent rapid cuts
- If multiple speakers are at similar levels (within 5dB), stay on the current scene
- If all speakers are silent (levels below -50dB), stay on the current scene
- Consider the recent history to avoid flip-flopping between two scenes repeatedly
- Use "natural" cut points — prefer switching when a speaker has been active for 1+ seconds
- Only switch if the source has an assignedScene that is not null

RESPONSE FORMAT (strict JSON only, no markdown, no extra text):
{"switchTo":"Scene Name or current scene if staying","reason":"Brief explanation","confidence":0.0}

Always return valid JSON. If staying on current scene, set switchTo to the current scene name.`;

const recentHistory = [];
const MAX_HISTORY_PAIRS = 5;

export async function analyzeAudioForCameraSwitch(audioLevels, currentScene) {
  const userMessage = {
    role: 'user',
    content: JSON.stringify({
      timestamp: new Date().toISOString(),
      currentScene,
      audioLevels,
      recentSwitches: recentHistory
        .filter((m) => m.role === 'assistant')
        .slice(-3)
        .map((m) => {
          try { return JSON.parse(m.content); } catch { return m.content; }
        }),
    }),
  };

  try {
    const messages = [...recentHistory.slice(-(MAX_HISTORY_PAIRS * 2)), userMessage];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content[0].text.trim();
    const decision = JSON.parse(rawText);

    recentHistory.push(userMessage);
    recentHistory.push({ role: 'assistant', content: rawText });

    if (recentHistory.length > MAX_HISTORY_PAIRS * 2 + 2) {
      recentHistory.splice(0, 2);
    }

    return decision;
  } catch (err) {
    console.error('[AI] Camera director error:', err.message);
    return {
      switchTo: currentScene,
      reason: 'AI unavailable — staying on current scene',
      confidence: 0,
    };
  }
}
