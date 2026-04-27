import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuth] = useState<boolean | null>(() => isAuthenticated());
  const location = useLocation();

  // Show loading while checking
  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hack-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-hack-yellow animate-spin mx-auto mb-4" />
          <p className="text-white/60">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to React signup page if not authenticated (keeps user on hackknow.com)
  if (!isAuth) {
    return <Navigate to="/signup" state={{ from: location.pathname }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}
