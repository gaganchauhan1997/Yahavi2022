import { Settings, LogOut } from 'lucide-react';
import Logo from './Logo';
import type { AuthUser } from '@/lib/auth';

interface Props {
  user: AuthUser | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Header({ user, onOpenSettings, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-bx-line bg-bx-black/95 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <a href="/" className="flex items-center gap-3 group min-w-0">
          <Logo size={36} withGlow animated />
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-bx-white tracking-wide truncate">
              The Dead Man
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-bx-orange/85 -mt-0.5 truncate">
              Few words · Last word · Best word
            </div>
          </div>
        </a>

        <div className="flex items-center gap-1.5">
          <button onClick={onOpenSettings} className="bx-btn-icon" title="API keys" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </button>
          {user && (
            <button onClick={onLogout} className="bx-btn-icon" title={user.name || user.email || 'Sign out'} aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
