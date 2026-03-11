import { useObsStore } from '../store/obsStore';
import { useOBS } from '../hooks/useOBS';

export default function SoundBoard() {
  const { mediaInputs, connectionStatus } = useObsStore();
  const { triggerMedia, fetchMediaInputs } = useOBS();
  const connected = connectionStatus === 'connected';

  if (!connected) return null;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Soundboard</h2>
        <button className="btn-ghost btn btn-sm" onClick={fetchMediaInputs}>
          Refresh
        </button>
      </div>

      {mediaInputs.length === 0 ? (
        <p className="muted">
          No media sources found. Add a Media Source in OBS to use the soundboard.
        </p>
      ) : (
        <div className="soundboard-grid">
          {mediaInputs.map((input) => (
            <button
              key={input.inputName}
              className="sound-btn"
              onClick={() => triggerMedia(input.inputName)}
              title={input.inputName}
            >
              <span className="sound-icon">▶</span>
              <span className="sound-label">{input.inputName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
