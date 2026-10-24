// Attach the dsh-memory-manager plugin to a DSH profile patch file.
// Usage: node install.mjs --profile <cordis.patch.yml> [--plugin <dir>] [--write]
// Default is a dry run that prints the resulting patch file.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const write = args.includes('--write');
const profilePatch = get('--profile');
const pluginDir = path.resolve(get('--plugin', path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))));

if (!profilePatch) {
  console.error('usage: node install.mjs --profile <cordis.patch.yml> [--plugin <dir>] [--write]');
  process.exit(2);
}
if (!fs.existsSync(profilePatch)) {
  console.error('profile patch not found:', profilePatch);
  process.exit(2);
}
const entry = path.join(pluginDir, 'lib', 'index.js').replace(/\\/g, '/');
const block = `- insert:\n    - id: memory\n      name: 'file:///${entry}'\n`;

const original = fs.readFileSync(profilePatch, 'utf8');
const BEGIN = '# dsh-memory:begin';
const END = '# dsh-memory:end';
const wrapped = `${BEGIN}\n${block}${END}\n`;
let next;
if (original.includes(BEGIN) && original.includes(END)) {
  const s = original.indexOf(BEGIN);
  const e = original.indexOf(END) + END.length;
  next = original.slice(0, s) + wrapped + original.slice(e);
} else {
  // A profile patch is ONE top-level YAML array. Replace an empty `[]`
  // document marker instead of appending a second document after it.
  const base = original.replace(/^\s*\[\]\s*$/m, '').replace(/\s*$/, '');
  next = base === '' ? wrapped : base + '\n\n' + wrapped;
}

console.log(`profile: ${profilePatch}`);
console.log(`plugin : ${entry}`);
console.log('--- resulting patch ---');
console.log(next);

if (!write) {
  console.log('dry run — pass --write to apply');
  process.exit(0);
}
const backup = `${profilePatch}.bak-${Date.now()}`;
fs.copyFileSync(profilePatch, backup);
fs.writeFileSync(profilePatch, next);
console.log('written; backup at', backup);
console.log('restart DSH to load the plugin.');
