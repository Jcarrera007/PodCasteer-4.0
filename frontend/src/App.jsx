import { useWebSocket } from './hooks/useWebSocket';
import ConnectionPanel from './components/ConnectionPanel';
import SceneControl from './components/SceneControl';
import StreamControl from './components/StreamControl';
import SourceControl from './components/SourceControl';
import SoundBoard from './components/SoundBoard';
import AICameraPanel from './components/AICameraPanel';

export default function App() {
  useWebSocket();

  return (
    <div className="app">
      <header className="app-header">
        <h1>PodCasteer <span className="version">4.0</span></h1>
        <p className="subtitle">OBS Remote Control + AI Camera Director</p>
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
