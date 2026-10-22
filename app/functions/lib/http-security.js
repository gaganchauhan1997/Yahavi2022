export const CHAT_BODY_LIMIT = 32 * 1024;

export function secureHeaders(input = {}, privateResponse = true) {
  const headers = new Headers(input);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  if (privateResponse) {
    headers.set('cache-control', 'private, no-store, max-age=0');
    headers.set('pragma', 'no-cache');
    headers.delete('expires');
    headers.delete('etag');
  }
  return headers;
}

export function jsonError(status, code) {
  return new Response(JSON.stringify({ error: code }), {
    status, headers: secureHeaders({ 'content-type': 'application/json; charset=utf-8' }),
  });
}

export async function readBoundedBody(request, limit = CHAT_BODY_LIMIT) {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > limit) throw new RangeError('payload_too_large');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RangeError('payload_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export function validChatPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000) return false;
  if (body.session_id !== undefined && (typeof body.session_id !== 'string' || body.session_id.length > 128)) return false;
  if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 10)) return false;
  return (body.history || []).every(m => m && typeof m === 'object'
    && ['user', 'bot', 'assistant'].includes(m.role)
    && typeof (m.text ?? m.message) === 'string'
    && (m.text ?? m.message).length <= 4000);
}
