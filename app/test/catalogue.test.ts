import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
describe('catalogue requests', () => {
  it('shares concurrent pagination and does not forward a login token', async () => {
    localStorage.setItem('hackknow-auth-token', 'private-token');
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ data: { products: { nodes: [{ id: 'a' }], pageInfo: { hasNextPage: true, endCursor: 'next' } } } }))
      .mockResolvedValueOnce(Response.json({ data: { products: { nodes: [{ id: 'b' }], pageInfo: { hasNextPage: false } } } }));
    vi.stubGlobal('fetch', fetcher);
    const { fetchAllProducts } = await import('../src/lib/graphql-client');
    const [a, b] = await Promise.all([fetchAllProducts(), fetchAllProducts()]);
    expect(a.nodes).toHaveLength(2); expect(a).toBe(b); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it('rejects repeated cursors instead of returning a partial catalogue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(Response.json({ data: { products: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } } } }))));
    const { fetchAllProducts } = await import('../src/lib/graphql-client');
    await expect(fetchAllProducts()).rejects.toThrow('cursor');
  });
  it('does not permanently cache an origin failure', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(Response.json({ data: { products: { nodes: [{ id: 'a' }], pageInfo: { hasNextPage: false } } } }));
    vi.stubGlobal('fetch', fetcher);
    const { fetchAllProducts } = await import('../src/lib/graphql-client');
    await expect(fetchAllProducts()).rejects.toThrow('down');
    expect((await fetchAllProducts()).nodes).toHaveLength(1);
  });
});
describe('downloadability', () => {
  it('requires positive file evidence for every visible product', async () => {
    const { isProductDeliverable } = await import('../src/lib/product-availability');
    expect(isProductDeliverable('1', null)).toBe(false);
    expect(isProductDeliverable('1', {})).toBe(false);
    expect(isProductDeliverable('1', { '1': { has_file: false, file_count: 0 } })).toBe(false);
    expect(isProductDeliverable('1', { '1': { has_file: true, file_count: 1 } })).toBe(true);
  });
});
