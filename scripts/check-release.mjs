import assert from 'node:assert/strict';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = path => readFile(resolve(root, path), 'utf8');
const pkg = JSON.parse(await load('package.json'));
assert.equal(pkg.name, '@albert-wu/dsh-memory-manager');
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(pkg.type, 'module');
assert.equal(pkg.private, undefined, 'The release package must not be private');
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
assert.equal(pkg.dsh.client.platform, 'web');
assert.equal(pkg.publishConfig.access, 'public');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.deepEqual(pkg.dependencies || {}, {}, 'The plugin intentionally has no runtime dependencies');
assert.deepEqual(pkg.optionalDependencies || {}, {});
for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(pkg.scripts?.[hook], undefined, 'No consumer install scripts');

const allowed = ['lib/index.js', 'lib/client.js', 'lib/shared.js', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'scripts/check-release.mjs', 'README.md', 'LICENSE'];
assert.deepEqual([...pkg.files].sort(), allowed.sort(), 'Only reviewed public resources may be packed');
const required = ['package.json', 'lib/index.js', 'lib/client.js', 'lib/shared.js', 'cordis.patch.yml', 'locale/en.json', 'locale/zh.json', 'locale/zh-CN.json', 'icon.svg', 'scripts/check-release.mjs', 'README.md', 'LICENSE'];
const realRoot = await realpath(root);
for (const file of required) {
  const path = await realpath(resolve(root, file));
  assert.ok(path.startsWith(realRoot + sep), 'A resource escapes the package');
  assert.ok((await stat(path)).isFile(), 'A resource is not a regular file');
}
assert.equal(pkg.exports['.'], './lib/index.js');
assert.equal(pkg.exports['./client'], './lib/client.js');
assert.equal(pkg.exports['./icon'], './icon.svg');
assert.equal(pkg.exports['./locale/*.json'], './locale/*.json');
const patch = await load('cordis.patch.yml');
assert.match(patch, /id: dsh-memory\s/);
assert.ok(patch.includes("name: '@albert-wu/dsh-memory-manager'"));
let factory;
vm.runInNewContext(await load('lib/client.js'), { window: { __ModuleLoader__: { load(value) { factory = value; } } } });
assert.equal(factory?.id, pkg.name, 'The Client factory id must equal the published package name');
assert.equal(typeof factory.factory, 'function');
const host = await load('lib/index.js');
assert.ok(host.includes("return join(base, 'dsh-memory')"), 'The existing data directory must remain unchanged');
assert.ok(host.includes("process.env.DSH_MEMORY_DIR"));
for (const locale of ['en', 'zh', 'zh-CN']) {
  const meta = JSON.parse(await load('locale/' + locale + '.json')).meta;
  assert.ok(meta.title?.trim() && meta.description?.trim());
}
const icon = await load('icon.svg');
assert.ok(icon.includes('http://www.w3.org/2000/svg') && icon.includes('viewBox="0 0 64 64"'));
assert.ok(Buffer.byteLength(icon) < 256 * 1024);
assert.ok(!/<script\b|<foreignObject\b|(?:href|src)\s*=/i.test(icon));
console.log(JSON.stringify({ name: pkg.name, version: pkg.version, checkedResources: required.length, dataDirectory: 'dsh-memory', result: 'PASS' }));
