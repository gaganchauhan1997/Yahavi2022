import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React
          if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          // Radix UI
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          // Charts
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Sonner toast
          if (id.includes('sonner')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
});
