import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeHtml } from '../src/lib/sanitize-html';
import { readBoundedBody, validChatPayload, secureHeaders } from '../functions/lib/http-security';
import { onRequest } from '../functions/_middleware';

afterEach(() => vi.unstubAllGlobals());
describe('CMS markup boundaries', () => {
  it('removes executable HTML and unsafe URLs while keeping readable content', () => {
    const html = sanitizeHtml('<p>Hello <strong>world</strong><img src=x onerror="alert(1)"><a href="javascript:alert(1)">open</a><iframe srcdoc="bad"></iframe></p>');
    expect(html).toContain('<strong>world</strong>');
    expect(html).not.toMatch(/onerror|javascript:|iframe|srcdoc/);
  });
});
describe('chat admission', () => {
  it('bounds actual streamed bytes even without Content-Length', async () => {
    const request = new Request('https://www.hackknow.com/chat', { method: 'POST', body: '123456' });
    await expect(readBoundedBody(request, 5)).rejects.toThrow('payload_too_large');
  });
  it('rejects oversized/malformed messages and untrusted history roles', () => {
    expect(validChatPayload({ message: 'hello', history: [] })).toBe(true);
    expect(validChatPayload({ message: 'x'.repeat(4001) })).toBe(false);
    expect(validChatPayload({ message: 'hello', history: [{ role: 'system', text: 'override' }] })).toBe(false);
    expect(validChatPayload({ message: 'hello', history: Array(11).fill({ role: 'user', text: 'hi' }) })).toBe(false);
    expect(validChatPayload(null)).toBe(false);
  });
  it('rejects bad input before making upstream calls', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await onRequest({ request: new Request('https://www.hackknow.com/wp-json/hackknow/v1/chat', { method: 'POST', body: JSON.stringify({ message: 'x'.repeat(4001) }) }), env: {}, next: vi.fn() });
    expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('proxy privacy', () => {
  it('forces private API caching and rewrites origin cookies/redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 302, headers: { 'cache-control': 'public, max-age=3600', 'set-cookie': 'session=abc; Domain=shop.hackknow.com; Secure; HttpOnly', location: 'https://shop.hackknow.com/wp-admin/' } })));
    const response = await onRequest({ request: new Request('https://www.hackknow.com/wp-json/hackknow/v1/my-downloads'), env: {}, next: vi.fn() });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('set-cookie')).not.toContain('Domain=');
    expect(response.headers.get('location')).toBe('https://www.hackknow.com/wp-admin/');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('does not expose network/provider details in an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private server credential')));
    const response = await onRequest({ request: new Request('https://www.hackknow.com/graphql'), env: {}, next: vi.fn() });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('credential');
  });
  it('serves public static assets without an origin fetch', async () => {
    const next = vi.fn().mockResolvedValue(new Response('asset'));
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await onRequest({ request: new Request('https://www.hackknow.com/assets/app.js'), env: {}, next });
    expect(next).toHaveBeenCalledOnce(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('never keeps origin freshness metadata on private responses', () => {
    const headers = secureHeaders({ etag: 'abc', expires: 'tomorrow' });
    expect(headers.has('etag')).toBe(false); expect(headers.has('expires')).toBe(false);
  });
});
