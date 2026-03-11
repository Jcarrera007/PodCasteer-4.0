import { useState } from 'react';
import { useObsStore } from '../store/obsStore';
import { useOBS } from '../hooks/useOBS';

export default function ConnectionPanel() {
  const { obsConfig, setObsConfig, connectionStatus, connectionError } = useObsStore();
  const { connect, disconnect, fetchSources } = useOBS();
  const [loading, setLoading] = useState(false);

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  const handleConnect = async () => {
    setLoading(true);
    await connect(obsConfig);
    await fetchSources().catch(() => {});
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnect();
    setLoading(false);
  };

  const statusColor = {
    connected: '#10b981',
    connecting: '#f59e0b',
    error: '#ef4444',
    disconnected: '#4a5568',
  }[connectionStatus];

  const statusLabel = {
    connected: 'Connected',
    connecting: 'Connecting…',
    error: 'Error',
    disconnected: 'Disconnected',
  }[connectionStatus];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>OBS Connection</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className={`status-dot ${isConnected ? 'pulse' : ''}`}
            style={{ background: statusColor }}
          />
          <span style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 600 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>Host</label>
        <input
          type="text"
          value={obsConfig.host}
          onChange={(e) => setObsConfig({ ...obsConfig, host: e.target.value })}
          disabled={isConnected || isConnecting}
          placeholder="localhost"
        />
      </div>

      <div className="form-group">
        <label>Port</label>
        <input
          type="number"
          value={obsConfig.port}
          onChange={(e) => setObsConfig({ ...obsConfig, port: e.target.value })}
          disabled={isConnected || isConnecting}
          placeholder="4455"
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={obsConfig.password}
          onChange={(e) => setObsConfig({ ...obsConfig, password: e.target.value })}
          disabled={isConnected || isConnecting}
          placeholder="Leave blank if none"
        />
      </div>

      {connectionError && <p className="error-text">{connectionError}</p>}

      {isConnected ? (
        <button className="btn btn-danger" onClick={handleDisconnect} disabled={loading}>
          Disconnect
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={loading || isConnecting}
        >
          {isConnecting ? 'Connecting…' : 'Connect to OBS'}
        </button>
      )}
    </div>
  );
}
