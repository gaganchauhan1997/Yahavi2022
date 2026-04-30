import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import KeysModal from './components/KeysModal';
import LaunchAnimation from './components/LaunchAnimation';
import ChatPanel from './components/ChatPanel';
import TaleModal from './components/TaleModal';
import { resolveAuth, redirectToLogin, logout, type AuthUser } from './lib/auth';
import { hasMinimumKeys, hasLaunched, markLaunched } from './lib/keys';
import { clearHistory } from './lib/chat';

export default function App() {
  const [user, setUser] = useState<AuthUser | null | 'pending'>('pending');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launchPlaying, setLaunchPlaying] = useState(false);
  const [taleOpen, setTaleOpen] = useState(false);
  const [taleTitle, setTaleTitle] = useState('');
  const [memoryTokens, setMemoryTokens] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  // ---------- Auth bootstrap ----------
  useEffect(() => {
    const u = resolveAuth();
    if (u) setUser(u);
    else { setUser(null); const t = setTimeout(() => redirectToLogin(), 600); return () => clearTimeout(t); }
  }, []);

  // ---------- After login: show keys modal if none saved ----------
  useEffect(() => {
    if (user && user !== 'pending' && !hasMinimumKeys()) {
      setSettingsOpen(true);
    }
  }, [user]);

  // ---------- First key save → cinematic ----------
  const handleFirstKey = useCallback(() => {
    setSettingsOpen(false);
    if (!hasLaunched()) {
      setLaunchPlaying(true);
    }
  }, []);

  const handleLaunchDone = useCallback(() => {
    markLaunched();
    setLaunchPlaying(false);
  }, []);

  const handleTale = useCallback((title: string) => {
    setTaleTitle(title);
    setTaleOpen(true);
  }, []);

  const handleClearMemory = () => {
    if (!confirm('Wipe everything The Dead Man remembers?')) return;
    clearHistory();
    setResetSignal(s => s + 1);
  };

  const handleNewChat = () => setResetSignal(s => s + 1);

  // ---------- Render gates ----------
  if (user === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-bx-mute animate-flicker">
          ✗ Reading your tag…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bx-card p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold text-bx-white">Login required</h1>
          <p className="text-sm text-bx-dim">
            Redirecting you to <span className="text-bx-orange font-mono">www.hackknow.com</span> to sign in…
          </p>
          <p className="text-xs text-bx-mute font-mono">
            Stuck? <a href="https://www.hackknow.com/login" className="text-bx-orange underline">Click here</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bx-black">
      <Header
        user={user}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={logout}
        onNewChat={handleNewChat}
        onClearHistory={handleClearMemory}
        memoryTokens={memoryTokens}
      />

      <main className="flex-1">
        <ChatPanel
          onAskKeys={() => setSettingsOpen(true)}
          onTaleCommand={handleTale}
          onMemoryChange={setMemoryTokens}
          resetSignal={resetSignal}
        />
      </main>

      <KeysModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onFirstKeySaved={handleFirstKey}
        mandatory={!hasMinimumKeys()}
      />

      <TaleModal
        open={taleOpen}
        initialTitle={taleTitle}
        onClose={() => setTaleOpen(false)}
      />

      {launchPlaying && <LaunchAnimation onDone={handleLaunchDone} />}
    </div>
  );
}
