// @vitest-environment node
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
it('fixture prerender succeeds with outbound networking explicitly prohibited', () => {
  const guard = new URL('./no-network.mjs', import.meta.url).pathname;
  execFileSync(process.execPath, ['--import', guard, 'scripts/prerender.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PRERENDER_MODE: 'fixture', CLOUDFLARE_API_TOKEN: 'must-not-be-used', CLOUDFLARE_ZONE_ID: 'must-not-be-used' },
  });
  const product = readFileSync(new URL('../dist/product/sample-excel-dashboard/index.html', import.meta.url), 'utf8');
  expect(product).toContain('Sample Excel Dashboard');
  expect(product).toContain('https://www.hackknow.com/product/sample-excel-dashboard');
});
