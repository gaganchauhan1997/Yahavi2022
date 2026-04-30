import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import KeysModal from './components/KeysModal';
import LaunchAnimation from './components/LaunchAnimation';
import ChatPanel from './components/ChatPanel';
import { resolveAuth, redirectToLogin, logout, type AuthUser } from './lib/auth';
import { hasMinimumKeys, hasLaunched, markLaunched } from './lib/keys';

export default function App() {
  const [user, setUser] = useState<AuthUser | null | 'pending'>('pending');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launchPlaying, setLaunchPlaying] = useState(false);
  const [resetSignal] = useState(0);

  useEffect(() => {
    const u = resolveAuth();
    if (u) setUser(u);
    else { setUser(null); const t = setTimeout(() => redirectToLogin(), 600); return () => clearTimeout(t); }
  }, []);

  useEffect(() => {
    if (user && user !== 'pending' && !hasMinimumKeys()) setSettingsOpen(true);
  }, [user]);

  // Replay the Dead Man cinematic on every fresh login (resetLaunch was called
  // by auth.ts when the SSO fragment was decoded). Also covers the case where
  // the user already has keys from a previous session.
  useEffect(() => {
    if (user && user !== 'pending' && hasMinimumKeys() && !hasLaunched()) {
      setLaunchPlaying(true);
    }
  }, [user]);

  const handleFirstKey = useCallback(() => {
    setSettingsOpen(false);
    if (!hasLaunched()) setLaunchPlaying(true);
  }, []);

  const handleLaunchDone = useCallback(() => {
    markLaunched();
    setLaunchPlaying(false);
  }, []);

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
            Redirecting you to <span className="text-bx-orange font-mono">www.hackknow.com</span>…
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
      <Header user={user} onOpenSettings={() => setSettingsOpen(true)} onLogout={logout} />

      <main className="flex-1">
        <ChatPanel onAskKeys={() => setSettingsOpen(true)} resetSignal={resetSignal} />
      </main>

      <KeysModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onFirstKeySaved={handleFirstKey}
        mandatory={!hasMinimumKeys()}
      />

      {launchPlaying && <LaunchAnimation onDone={handleLaunchDone} />}
    </div>
  );
}
