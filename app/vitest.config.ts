import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'],
    clearMocks: true, restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/lib/graphql-client.ts', 'src/lib/product-availability.ts', 'src/lib/sanitize-html.ts', 'functions/**/*.js'] },
  },
});
