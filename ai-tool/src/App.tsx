import { useState, useEffect } from 'react';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import { resolveAuth, redirectToLogin, logout, type AuthUser } from './lib/auth';

export default function App() {
  const [user, setUser] = useState<AuthUser | null | 'pending'>('pending');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const u = resolveAuth();
    if (u) {
      setUser(u);
    } else {
      // Give the page a beat to render the loading state, then redirect
      setUser(null);
      const timer = setTimeout(() => redirectToLogin(), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  if (user === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-noir-fog animate-flicker">
          ✗ Reading your tag…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="noir-card p-8 max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-noir-bone">Login required</h1>
          <p className="text-sm text-noir-bone/70">
            Redirecting you to <span className="text-noir-gold font-mono">www.hackknow.com</span> to sign in…
          </p>
          <p className="text-xs text-noir-fog font-mono">
            Agar redirect nahi hua, <a href="https://www.hackknow.com/login" className="text-noir-gold underline">yahan click karo</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        user={user}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={logout}
      />
      <HomePage
        openSettings={() => setSettingsOpen(true)}
        settingsOpen={settingsOpen}
        closeSettings={() => setSettingsOpen(false)}
      />
    </div>
  );
}
