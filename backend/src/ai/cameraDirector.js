import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const userContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    currentScene,
    audioLevels,
    recentSwitches: recentHistory
      .filter((m) => m.role === 'model')
      .slice(-3)
      .map((m) => {
        try { return JSON.parse(m.parts[0].text); } catch { return m.parts[0].text; }
      }),
  });

  // Build Gemini history format (role must be 'user' or 'model')
  const history = recentHistory.slice(-(MAX_HISTORY_PAIRS * 2));

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userContent);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const decision = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    recentHistory.push({ role: 'user', parts: [{ text: userContent }] });
    recentHistory.push({ role: 'model', parts: [{ text: JSON.stringify(decision) }] });

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
