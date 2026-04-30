/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noir: {
          black: '#0a0a0a',
          ash: '#1a1a1a',
          smoke: '#2a2a2a',
          fog: '#404040',
          bone: '#e8e6e1',
          paper: '#f5f3ee',
          blood: '#c41e3a',
          gold: '#d4af37',
          rust: '#a0522d',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        flicker: 'flicker 3s ease-in-out infinite',
        typewriter: 'typewriter 2.5s steps(40) forwards',
        smoke: 'smoke 8s ease-in-out infinite',
      },
      keyframes: {
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.85' } },
        typewriter: { '0%': { width: '0' }, '100%': { width: '100%' } },
        smoke: { '0%,100%': { transform: 'translateY(0) translateX(0)' }, '50%': { transform: 'translateY(-10px) translateX(5px)' } },
      },
    },
  },
};
