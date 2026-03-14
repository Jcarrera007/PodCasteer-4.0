import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ConnectionPanel from './components/ConnectionPanel';
import SceneControl from './components/SceneControl';
import StreamControl from './components/StreamControl';
import SourceControl from './components/SourceControl';
import SoundBoard from './components/SoundBoard';
import AICameraPanel from './components/AICameraPanel';

export default function App() {
  useWebSocket();
  const [mobileUrl, setMobileUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((d) => setMobileUrl(d.url))
      .catch(() => {});
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(mobileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-row">
          <img src="/icon.png" alt="PodCasteer" className="app-logo" />
          <h1>PodCasteer</h1>
        </div>
        <p className="subtitle">OBS Remote Control + AI Camera Director</p>
        {mobileUrl && (
          <div className="mobile-url-bar">
            <span className="mobile-url-label">📱 Mobile:</span>
            <span className="mobile-url-text">{mobileUrl}</span>
            <button className="mobile-url-copy" onClick={copyUrl}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        <aside className="col-left">
          <ConnectionPanel />
          <StreamControl />
          <SoundBoard />
        </aside>

        <section className="col-center">
          <SceneControl />
          <SourceControl />
        </section>

        <aside className="col-right">
          <AICameraPanel />
        </aside>
      </main>
    </div>
  );
}
