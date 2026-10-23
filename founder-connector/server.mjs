import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const origin = process.env.WC_ORIGIN;
const key = process.env.WC_CONSUMER_KEY;
const secret = process.env.WC_CONSUMER_SECRET;
const token = process.env.HK_CONNECTOR_TOKEN;
if (!origin || !key || !secret || !token || token.length < 32 || !/^https:\/\//.test(origin)) {
  throw new Error('Set HTTPS WC_ORIGIN, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, and a 32+ character HK_CONNECTOR_TOKEN');
}
const base = new URL(origin);
const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;

export function tokenMatches(given, expected) {
  const a = Buffer.from(given || '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function wc(path, options = {}) {
  const url = new URL(`/wp-json/wc/v3/${path}`, base);
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WooCommerce ${response.status}: ${json.message || 'request failed'}`);
  return json;
}

function output(value) { return { content: [{ type: 'text', text: JSON.stringify(value) }] }; }
function safe(handler) {
  return async (args) => {
    try { return output(await handler(args)); }
    catch (error) { return { content: [{ type: 'text', text: error.message }], isError: true }; }
  };
}

export function createServer() {
  const mcp = new McpServer({ name: 'hackknow-founder', version: '0.1.0' });
  mcp.tool('list_products', 'List recent products and their draft/published status. Never returns customer data.',
    { limit: z.number().int().min(1).max(30).default(10) }, safe(async ({ limit }) => {
      const products = await wc(`products?per_page=${limit}&orderby=date&order=desc`);
      return products.map(({ id, name, status, sku, permalink, images }) => ({ id, name, status, sku, permalink, image: images?.[0]?.src }));
    }));
  mcp.tool('create_product_draft', 'Create a WooCommerce product as a DRAFT for founder review. Cannot publish or change orders.',
    {
      name: z.string().min(2).max(160),
      description: z.string().max(20000).default(''),
      regular_price: z.string().regex(/^\d+(\.\d{1,2})?$/),
      sku: z.string().max(100).optional(),
      image_media_id: z.number().int().positive().optional(),
    }, safe(async ({ name, description, regular_price, sku, image_media_id }) => {
      const product = await wc('products', { method: 'POST', body: JSON.stringify({
        name, description, regular_price, sku, status: 'draft',
        ...(image_media_id ? { images: [{ id: image_media_id }] } : {}),
      }) });
      return { id: product.id, name: product.name, status: product.status, edit_url: `${base.origin}/wp-admin/post.php?post=${product.id}&action=edit` };
    }));
  mcp.tool('update_product_draft', 'Edit an existing DRAFT product only. Published products cannot be edited by this connector.',
    { id: z.number().int().positive(), name: z.string().min(2).max(160).optional(),
      description: z.string().max(20000).optional(), regular_price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      image_media_id: z.number().int().positive().optional() },
    safe(async ({ id, image_media_id, ...fields }) => {
      const current = await wc(`products/${id}`);
      if (current.status !== 'draft') throw new Error('Only draft products can be updated. Ask the founder to edit published products manually.');
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (image_media_id) updates.images = [{ id: image_media_id }];
      if (!Object.keys(updates).length) throw new Error('Provide at least one field to update.');
      const product = await wc(`products/${id}`, { method: 'PUT', body: JSON.stringify({ ...updates, status: 'draft' }) });
      return { id: product.id, name: product.name, status: product.status };
    }));
  return mcp;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/mcp', (req, res, next) => {
  if (!tokenMatches(req.headers.authorization?.replace(/^Bearer\s+/i, ''), token)) return res.status(401).end();
  if (req.method !== 'POST') return res.status(405).end();
  next();
});
app.post('/mcp', async (req, res) => {
  const mcp = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); mcp.close(); });
  try { await mcp.connect(transport); await transport.handleRequest(req, res, req.body); }
  catch (error) { console.error('MCP request failed:', error.message); if (!res.headersSent) res.status(500).end(); }
});
const port = Number(process.env.PORT || 8788);
app.listen(port, '0.0.0.0', () => console.log(`Founder connector listening on ${port}`));
