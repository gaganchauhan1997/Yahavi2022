/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blackbox AI inspired palette — pitch black + orange accent
        bx: {
          black: '#000000',
          ink: '#0a0a0a',
          panel: '#111111',
          panel2: '#161616',
          line: '#222222',
          line2: '#2e2e2e',
          mute: '#5a5a5a',
          dim: '#8a8a8a',
          text: '#e5e5e5',
          white: '#ffffff',
          orange: '#ff6b00',
          orange2: '#ff8a1f',
          orangeDim: '#3a1a00',
          red: '#ff3344',
          redGlow: '#ff0a1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        flicker: 'flicker 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        glow: 'glow 2.4s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        flash: 'flash 0.8s ease-out forwards',
        'zoom-out': 'zoomOut 2s ease-in-out forwards',
        'moon-rise': 'moonRise 1.5s ease-out forwards',
        'red-glow': 'redGlow 2.4s ease-in-out infinite',
        typewriter: 'typewriter 1.6s steps(28) forwards',
      },
      keyframes: {
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        glow: {
          '0%,100%': { textShadow: '0 0 6px rgba(255,107,0,0.5)' },
          '50%': { textShadow: '0 0 18px rgba(255,107,0,0.95), 0 0 32px rgba(255,107,0,0.4)' },
        },
        flash: { '0%': { opacity: '0', background: '#ffffff' }, '40%': { opacity: '1' }, '100%': { opacity: '0' } },
        zoomOut: { '0%': { transform: 'scale(8)', opacity: '0' }, '20%': { opacity: '1' }, '100%': { transform: 'scale(1)' } },
        moonRise: { '0%': { transform: 'translateY(60vh) scale(0.4)', opacity: '0' }, '100%': { transform: 'translateY(0) scale(1)', opacity: '1' } },
        redGlow: {
          '0%,100%': { filter: 'drop-shadow(0 0 14px rgba(255,10,30,0.7)) drop-shadow(0 0 32px rgba(255,10,30,0.35))' },
          '50%': { filter: 'drop-shadow(0 0 28px rgba(255,10,30,0.95)) drop-shadow(0 0 60px rgba(255,10,30,0.6))' },
        },
        typewriter: { '0%': { width: '0' }, '100%': { width: '100%' } },
      },
    },
  },
};
