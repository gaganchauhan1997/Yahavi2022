import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const app = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(app, 'src/content/free-excel-templates.json'), 'utf8'));
for (const file of manifest) {
  if (!/^[a-z0-9-]+$/.test(file.slug) || !/^\/downloads\/free-excel\/[a-z0-9-]+\.zip$/.test(file.download)) throw new Error('Invalid resource path');
  const bytes = Buffer.from(await fs.readFile(path.join(app, 'resources/free-excel', file.slug + '.zip.b64'), 'utf8'), 'base64');
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Resource checksum mismatch: ' + file.slug);
  const output = path.join(app, 'dist', file.download);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, bytes);
}
console.log(`Prepared ${manifest.length} licensed Excel download packages (offline, checksums verified).`);
