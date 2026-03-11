import { useObsStore } from '../store/obsStore';
import { useOBS } from '../hooks/useOBS';

export default function StreamControl() {
  const { isStreaming, isRecording, connectionStatus } = useObsStore();
  const { startStream, stopStream, startRecord, stopRecord } = useOBS();
  const connected = connectionStatus === 'connected';

  return (
    <div className="panel">
      <h2>Stream & Record</h2>

      <div className="control-row">
        <div className="status-indicator">
          <span
            className="status-dot"
            style={{ background: isStreaming ? '#ef4444' : '#4a5568' }}
          />
          {isStreaming
            ? <span className="live-badge">LIVE</span>
            : <span style={{ color: 'var(--text-secondary)' }}>Offline</span>
          }
        </div>
        <button
          className={`btn ${isStreaming ? 'btn-danger' : 'btn-success'} btn-sm`}
          onClick={isStreaming ? stopStream : startStream}
          disabled={!connected}
        >
          {isStreaming ? 'Stop Stream' : 'Go Live'}
        </button>
      </div>

      <div className="control-row">
        <div className="status-indicator">
          <span
            className="status-dot"
            style={{ background: isRecording ? '#ef4444' : '#4a5568' }}
          />
          {isRecording
            ? <span style={{ color: '#ef4444', fontWeight: 600 }}>Recording</span>
            : <span style={{ color: 'var(--text-secondary)' }}>Not Recording</span>
          }
        </div>
        <button
          className={`btn ${isRecording ? 'btn-danger' : 'btn-warning'} btn-sm`}
          onClick={isRecording ? stopRecord : startRecord}
          disabled={!connected}
        >
          {isRecording ? 'Stop' : 'Record'}
        </button>
      </div>
    </div>
  );
}
