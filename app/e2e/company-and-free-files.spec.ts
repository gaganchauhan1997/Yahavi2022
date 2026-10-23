import { test, expect } from '@playwright/test';
import templates from '../src/content/free-excel-templates.json' with { type: 'json' };

test('shows the memorial and current leadership without departed team sections', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'Manish Kumar Singh', exact: true })).toBeVisible();
  await expect(page.getByText('Late Beloved Founder & Mentor', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gagan Chauhan', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vinay Rajouria', exact: true })).toBeVisible();
  await expect(page.getByText(/From Nangli Razapur, Delhi/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gagan on LinkedIn', exact: true })).toHaveAttribute('href', 'https://www.linkedin.com/in/gagan-yahavi-hackknow/');
  await expect(page.getByRole('link', { name: 'Gagan on Instagram', exact: true })).toHaveAttribute('href', 'https://www.instagram.com/i_kunalarious/');
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

test('has no top Dead Man promotion, fabricated purchase timers or email capture', async ({ page }) => {
  const fabricatedOrderRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/wc/store/v1/products?per_page=24')) fabricatedOrderRequests.push(request.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('hackknow-cookie-consent', 'declined');
    localStorage.setItem('hk_local_leads_v1', JSON.stringify([{ email: 'retired-cache@example.invalid' }]));
  });
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hk_local_leads_v1'))).toBeNull();
  await page.clock.fastForward(46000);
  await expect(page.locator('header a[href*="tdm.hackknow.com"]')).toHaveCount(0);
  await expect(page.getByText(/just bought|Verified order|50,000\+ Creators|10K\+/i)).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.locator('footer').getByRole('link', { name: 'Browse free Excel templates', exact: true })).toBeVisible();
  expect(fabricatedOrderRequests).toEqual([]);
});

test('offers the free collection without membership, prices or checkout', async ({ page }) => {
  await page.goto('/community/');
  await expect(page.getByRole('heading', { name: 'Useful resources, open to everyone.' })).toBeVisible();
  await page.locator('main').getByRole('link', { name: 'Browse free Excel templates', exact: true }).click();
  await expect(page.locator('main article')).toHaveCount(9);
  await expect(page.locator('main')).not.toContainText(/₹|\$\d|add to cart|buy now|subscribe/i);
  await expect(page.locator('main input')).toHaveCount(0);
  await expect(page.locator('main article').first()).toContainText('Free download');
  await expect(page.locator('main')).toContainText('HackKnow-branded Excel workbook');
});
