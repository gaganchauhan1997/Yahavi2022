import { Skull, Settings, LogOut, Trash2, MessageSquarePlus } from 'lucide-react';
import type { AuthUser } from '@/lib/auth';

interface Props {
  user: AuthUser | null;
  onOpenSettings: () => void;
  onLogout: () => void;
  onNewChat?: () => void;
  onClearHistory?: () => void;
  memoryTokens?: number;
}

export default function Header({ user, onOpenSettings, onLogout, onNewChat, onClearHistory, memoryTokens = 0 }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-bx-line bg-bx-black/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand: clickable skull → home */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md border border-bx-line group-hover:border-bx-orange flex items-center justify-center transition-colors">
            <Skull className="w-4 h-4 text-bx-orange group-hover:animate-flicker" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-bx-white tracking-wide">
              The Dead Man <span className="text-bx-orange">·</span> Last Tale
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-bx-mute -mt-0.5">
              By HackKnow
            </div>
          </div>
        </a>

        <div className="flex items-center gap-2">
          {memoryTokens > 0 && (
            <div className="hidden md:flex bx-chip">
              <span className="w-1.5 h-1.5 rounded-full bg-bx-orange animate-pulse" />
              {memoryTokens.toLocaleString()} / 10k tokens
            </div>
          )}
          {onNewChat && (
            <button onClick={onNewChat} className="bx-btn-icon" title="New chat">
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          )}
          {onClearHistory && (
            <button onClick={onClearHistory} className="bx-btn-icon" title="Forget everything">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onOpenSettings} className="bx-btn-icon" title="API keys">
            <Settings className="w-4 h-4" />
          </button>
          {user && (
            <>
              <div className="hidden sm:block px-2 text-right leading-tight">
                <div className="text-xs text-bx-text font-medium truncate max-w-[140px]">{user.name || user.email}</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-bx-orange/80">
                  {user.isVerified ? 'Verified' : 'Member'}
                </div>
              </div>
              <button onClick={onLogout} className="bx-btn-icon" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
