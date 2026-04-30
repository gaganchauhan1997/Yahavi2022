import { Skull, Settings, LogOut } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';

interface Props {
  user: AuthUser | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Header({ user, onOpenSettings, onLogout }: Props) {
  return (
    <header className="border-b border-noir-fog/30 bg-noir-black/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-noir-blood/20 border border-noir-blood/50 rounded-sm flex items-center justify-center group-hover:bg-noir-blood/40 transition-colors">
            <Skull className="w-5 h-5 text-noir-blood animate-flicker" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base sm:text-lg font-bold tracking-wide text-noir-bone">
              Dead Man Will Tell
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-noir-gold/70 -mt-0.5">
              Last Tale · By HackKnow
            </div>
          </div>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden sm:block text-right leading-tight mr-2">
              <div className="text-xs text-noir-bone/80 font-medium">{user.name || user.email}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-noir-gold/60">
                {user.isVerified ? 'Verified' : 'Member'}
              </div>
            </div>
          )}
          <button onClick={onOpenSettings} className="noir-btn-ghost flex items-center gap-2" title="API keys & settings">
            <Settings className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Keys</span>
          </button>
          {user && (
            <button onClick={onLogout} className="noir-btn-ghost flex items-center gap-2" title="Sign out">
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
