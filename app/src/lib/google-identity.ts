let pending: Promise<void> | null = null;
/** Load the identity SDK on auth pages only; share concurrent/StrictMode calls. */
export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timer = setTimeout(() => { script.remove(); pending = null; reject(new Error('Google Sign-In took too long to load.')); }, 15_000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); pending = null; reject(new Error('Google Sign-In could not load. You can still use email sign-in.')); };
    document.head.appendChild(script);
  });
  return pending;
}
