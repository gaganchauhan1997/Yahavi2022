import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA service worker — register after window load so it never delays first paint.
// In dev (no /sw.js shipped), the registration silently fails and is harmless.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        // Auto-activate new SW versions on next navigation
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => { /* SW failure must never break the page */ });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // No automatic reload — just mark for next manual nav. Avoids reload loops.
    });
  });
}
