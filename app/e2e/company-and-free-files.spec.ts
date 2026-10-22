import { test, expect } from '@playwright/test';
import templates from '../src/content/free-excel-templates.json' with { type: 'json' };

test('shows the memorial and current leadership without departed team sections', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'Manish Kumar Singh', exact: true })).toBeVisible();
  await expect(page.getByText('Late Beloved Founder & Mentor', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gagan Chauhan', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vinay Rajouria', exact: true })).toBeVisible();
  await expect(page.getByText(/From Nangli Razapur, Delhi/)).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/Gourav|DeadMan|dead man/i);
  await expect(page.locator('a[href^="tel:"],a[href*="wa.me/"]')).toHaveCount(0);
});

test('filters licensed Excel packages and downloads real files', async ({ page, request }) => {
  await page.goto('/free-excel-templates/');
  await expect(page.locator('main article')).toHaveCount(9);
  await page.getByRole('button', { name: 'Career', exact: true }).click();
  await expect(page.locator('main article')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Download Excel/ })).toHaveAttribute('href', templates.find(t => t.category === 'Career')!.download);
  for (const file of templates) {
    const response = await request.get(file.download);
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBe(file.bytes);
    expect(body.subarray(0, 2).toString()).toBe('PK');
  }
});

test('loads Google identity on auth pages without adding it to normal browsing', async ({ page }) => {
  const identityRequests: string[] = [];
  await page.route('https://accounts.google.com/gsi/client', route => {
    identityRequests.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: 'window.google={accounts:{oauth2:{initTokenClient:function(){return {requestAccessToken:function(){window.__requestedGoogle=true}}}}}};' });
  });
  await page.goto('/about/');
  expect(identityRequests).toHaveLength(0);
  await page.goto('/login/');
  await expect.poll(() => identityRequests.length).toBe(1);
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __requestedGoogle?: boolean }).__requestedGoogle))).toBe(true);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.getByRole('link', { name: 'HackKnow home', exact: true }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
});
