import { useEffect, useRef } from 'react';
import { useObsStore } from '../store/obsStore';
import { useOBS } from '../hooks/useOBS';
import AudioMeter from './AudioMeter';

export default function AICameraPanel() {
  const {
    aiEnabled, aiMode, aiAutoSwitch,
    audioSensitivity, micAssignments, scenes, currentScene,
    obsAudioLevels, claudeDecisionLog, sources,
    setAiEnabled, setAiMode, setAiAutoSwitch,
    setAudioSensitivity, setMicAssignment, removeMicAssignment,
  } = useObsStore();

  const { switchScene, analyzeAudio } = useOBS();
  const intervalRef = useRef(null);

  const levelsRef = useRef(obsAudioLevels);
  const assignRef = useRef(micAssignments);
  const sceneRef = useRef(currentScene);
  const sensitivityRef = useRef(audioSensitivity);

  useEffect(() => { levelsRef.current = obsAudioLevels; }, [obsAudioLevels]);
  useEffect(() => { assignRef.current = micAssignments; }, [micAssignments]);
  useEffect(() => { sceneRef.current = currentScene; }, [currentScene]);
  useEffect(() => { sensitivityRef.current = audioSensitivity; }, [audioSensitivity]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!aiEnabled) return;

    const cadence = aiMode === 'claude' ? 15000 : 500;

    intervalRef.current = setInterval(async () => {
      const levels = levelsRef.current;
      const assignments = assignRef.current;
      const scene = sceneRef.current;
      const threshold = sensitivityRef.current;

      if (aiMode === 'audio') {
        const active = Object.entries(levels).filter(
          ([name, level]) => level > threshold && assignments[name]
        );
        if (active.length === 0) return;
        active.sort((a, b) => b[1] - a[1]);
        const targetScene = assignments[active[0][0]];
        if (targetScene && targetScene !== scene) {
          switchScene(targetScene);
        }
      } else {
        try {
          await analyzeAudio(levels, scene);
        } catch (e) {
          console.error('[AI] analyze error:', e);
        }
      }
    }, cadence);

    return () => clearInterval(intervalRef.current);
  }, [aiEnabled, aiMode]);

  // Show all OBS inputs; meter data fills in when InputVolumeMeters events arrive
  const audioInputs = sources;

  const confidenceColor = (c) => {
    if (c >= 0.8) return '#22c55e';
    if (c >= 0.5) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="panel ai-panel">
      <h2>AI Camera Director</h2>

      {/* ── SECTION 1: Mic → Camera assignments ── */}
      <div className="ai-section">
        <h3 className="section-label">Mic → Camera</h3>

        {audioInputs.length === 0 ? (
          <p className="muted">
            {sources.length === 0
              ? 'Connect to OBS to see audio inputs.'
              : 'No active audio detected. Check OBS mixer.'}
          </p>
        ) : (
          <div className="assignment-table">
            {/* Header */}
            <div className="assign-header">
              <span>Microphone</span>
              <span>Camera Scene</span>
            </div>

            {audioInputs.map((input) => {
              const level = obsAudioLevels[input.inputName];
              const assigned = micAssignments[input.inputName] || '';
              const isActive = level > audioSensitivity;

              return (
                <div
                  key={input.inputName}
                  className={`assign-row ${isActive ? 'speaking' : ''}`}
                >
                  <div className="assign-mic">
                    <div className="assign-mic-name">
                      <span className={`speaking-dot ${isActive ? 'active' : ''}`} />
                      {input.inputName}
                    </div>
                    <AudioMeter level={level} />
                  </div>

                  <div className="assign-arrow">→</div>

                  <div className="assign-scene">
                    <select
                      value={assigned}
                      onChange={(e) =>
                        e.target.value
                          ? setMicAssignment(input.inputName, e.target.value)
                          : removeMicAssignment(input.inputName)
                      }
                      className={`scene-select ${assigned ? 'assigned' : 'unassigned'}`}
                    >
                      <option value="">— no camera —</option>
                      {scenes.map((s) => (
                        <option key={s.sceneName} value={s.sceneName}>
                          {s.sceneName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: AI Controls ── */}
      <div className="ai-section">
        <h3 className="section-label">AI Controls</h3>

        <div className="toggle-row">
          <label>Enable Auto-Switching</label>
          <button
            className={`toggle-btn ${aiEnabled ? 'active' : ''}`}
            onClick={() => setAiEnabled(!aiEnabled)}
          >
            {aiEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="toggle-row">
          <label>Mode</label>
          <div className="mode-selector">
            <button
              className={`mode-btn ${aiMode === 'audio' ? 'active' : ''}`}
              onClick={() => setAiMode('audio')}
            >
              Audio Level
            </button>
            <button
              className={`mode-btn ${aiMode === 'claude' ? 'active' : ''}`}
              onClick={() => setAiMode('claude')}
            >
              Claude AI
            </button>
          </div>
        </div>

        {aiMode === 'claude' && (
          <div className="toggle-row">
            <label>Claude Auto-Switch</label>
            <button
              className={`toggle-btn ${aiAutoSwitch ? 'active' : ''}`}
              onClick={() => setAiAutoSwitch(!aiAutoSwitch)}
            >
              {aiAutoSwitch ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        <div className="form-group">
          <label>
            Speaking threshold: <strong>{audioSensitivity} dBFS</strong>
          </label>
          <input
            type="range"
            min="-60"
            max="0"
            step="1"
            value={audioSensitivity}
            onChange={(e) => setAudioSensitivity(Number(e.target.value))}
            className="slider"
          />
          <div className="threshold-hints">
            <span>quiet</span>
            <span>loud</span>
          </div>
        </div>

        {aiEnabled && (
          <p className="ai-status">
            {aiMode === 'audio'
              ? 'Switching to loudest mic every 500ms'
              : 'Claude deciding every 15s'}
          </p>
        )}
      </div>

      {/* ── SECTION 3: Claude decision log ── */}
      {aiMode === 'claude' && claudeDecisionLog.length > 0 && (
        <div className="ai-section">
          <h3 className="section-label">Decision Log</h3>
          <div className="log-scroll">
            {claudeDecisionLog.map((d, i) => (
              <div key={i} className="log-entry">
                <div className="log-header">
                  <span className="log-scene">{d.switchTo}</span>
                  <span className="log-confidence" style={{ color: confidenceColor(d.confidence) }}>
                    {Math.round(d.confidence * 100)}%
                  </span>
                </div>
                <p className="log-reason">{d.reason}</p>
                <p className="log-time">{new Date(d.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
