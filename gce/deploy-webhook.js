#!/usr/bin/env node
/**
 * HackKnow deploy webhook — binds to 127.0.0.1 only (nginx proxies).
 *
 * Env vars:
 *   DEPLOY_SECRET  — REQUIRED  (GitHub webhook secret)
 *   DEPLOY_PORT    — optional  (default 9000)
 *   DEPLOY_BRANCH  — optional  (default main)
 */
'use strict';
const http = require('http');
const { execFile } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const PORT   = Number(process.env.DEPLOY_PORT) || 9000;
const SECRET = process.env.DEPLOY_SECRET;
const BRANCH = process.env.DEPLOY_BRANCH || 'main';
const SCRIPT = path.join(__dirname, 'auto-deploy.sh');

if (!SECRET) { console.error('DEPLOY_SECRET env var is required'); process.exit(1); }

let deploying = false;

function verify(body, sig) {
  if (!sig) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function deploy() {
  if (deploying) return Promise.resolve({ ok: false, msg: 'already running' });
  deploying = true;
  return new Promise(resolve => {
    execFile('bash', [SCRIPT, BRANCH], { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      deploying = false;
      if (err) { console.error('[DEPLOY] failed', err.message, stderr); resolve({ ok: false }); }
      else     { console.log('[DEPLOY] done\n' + stdout);               resolve({ ok: true }); }
    });
  });
}

const srv = http.createServer((req, res) => {
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  if (req.method === 'GET' && req.url === '/health') return json(200, { status: 'ok', deploying });

  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', async () => {
      if (!verify(body, req.headers['x-hub-signature-256'])) return json(401, { error: 'bad sig' });
      let payload;
      try { payload = JSON.parse(body); } catch { return json(400, { error: 'bad json' }); }
      const ref = payload.ref || '';
      if (ref !== `refs/heads/${BRANCH}`) return json(200, { ignored: true, ref });
      json(202, { queued: true });
      await deploy();
    });
    return;
  }

  json(404, { error: 'not found' });
});

srv.listen(PORT, '127.0.0.1', () => console.log(`[WEBHOOK] 127.0.0.1:${PORT} branch=${BRANCH}`));
