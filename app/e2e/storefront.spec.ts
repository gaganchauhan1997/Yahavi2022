import { test, expect } from '@playwright/test';
const product = {
  id: 'product-101', databaseId: 101, name: 'Sample Excel Dashboard', slug: 'sample-excel-dashboard',
  description: '<p>Offline browser test product.</p>', shortDescription: 'Test template',
  price: '₹100.00', regularPrice: '₹100.00', date: '2026-10-01', image: null,
  productCategories: { nodes: [{ id: 'cat-1', databaseId: 1, name: 'Excel Sheets', slug: 'excel-sheets' }] },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.host !== '127.0.0.1:4173') return route.abort();
    if (url.pathname === '/graphql') {
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { data: body.query.includes('GetProductBySlug')
        ? { product } : { products: { nodes: [product], pageInfo: { hasNextPage: false } } } } });
    }
    if (url.pathname.includes('/product-availability')) return route.fulfill({ json: { availability: { '101': { has_file: true, file_count: 1 } } } });
    if (url.pathname.startsWith('/wp-json/')) return route.fulfill({ json: [] });
    return route.continue();
  });
});

test('loads the catalogue and adds a verified product to the cart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/product/sample-excel-dashboard');
  await expect(page.getByRole('heading', { name: 'Sample Excel Dashboard', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /add to cart/i }).first().click();
  await page.goto('/cart');
  await expect(page.getByText('Sample Excel Dashboard').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('never offers an unverified direct product for purchase', async ({ page }) => {
  await page.route('**/wp-json/hackknow/v1/product-availability', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.goto('/product/sample-excel-dashboard');
  await expect(page.getByRole('heading', { name: 'Sample Excel Dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /add to cart/i })).toHaveCount(0);
});

test('shows the recovery option when the catalogue fails', async ({ page }) => {
  await page.route('**/graphql', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.goto('/shop');
  await expect(page.getByText('No products available', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
});

test('does not load analytics before consent or after a decline', async ({ page }) => {
  const analytics: string[] = [];
  page.on('request', request => { if (request.url().includes('googletagmanager.com')) analytics.push(request.url()); });
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /shop/i }).first()).toBeVisible();
  expect(analytics).toEqual([]);
});

test('loads configured analytics only after explicit acceptance', async ({ page }) => {
  const analytics: string[] = [];
  page.on('request', request => { if (request.url().includes('googletagmanager.com')) analytics.push(request.url()); });
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Accept All', exact: true }).click();
  await expect.poll(() => analytics.length).toBe(1);
});
