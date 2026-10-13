/** Static project checks. Run: node tests/check.mjs (Node 18+). */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
assert.equal((html.match(/<section class="chapter /g) || []).length, 6, 'Must have six chapters');
for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
 if (/^(#|data:|https?:)/.test(path)) continue;
 assert.ok(existsSync(resolve(root, path)), `Missing file: ${path}`);
}
for (const name of ['app.js', 'model3d.js']) {
 new Script(readFileSync(resolve(root, 'assets', name), 'utf8'), { filename: name });
}
assert.ok(existsSync(resolve(root, 'assets/social-preview.jpg')), 'Missing social preview');
assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:\/\//.test(html), 'Remote runtime dependency found');
assert.ok(existsSync(resolve(root, '.nojekyll')), 'Missing .nojekyll');
console.log('PASS: six chapters, unique IDs, local assets, JavaScript syntax, no runtime CDN dependencies.');
