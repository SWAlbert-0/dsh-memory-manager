// Minimal ASAR reader: list / cat.
import fs from 'node:fs';

export function readAsar(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  const headerSize = head.readUInt32LE(4);
  const jsonSize = head.readUInt32LE(12);
  const jsonBuf = Buffer.alloc(jsonSize);
  fs.readSync(fd, jsonBuf, 0, jsonSize, 16);
  const header = JSON.parse(jsonBuf.toString('utf8').replace(/\0+$/, ''));
  fs.closeSync(fd);
  return { header, dataStart: 8 + headerSize };
}

export function walk(node, prefix, out) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const p = prefix ? prefix + '/' + name : name;
    if (entry.files) walk(entry, p, out);
    else out.push({ path: p, size: entry.size, offset: entry.offset, unpacked: entry.unpacked });
  }
}

export function list(asarPath, re) {
  const { header } = readAsar(asarPath);
  const all = [];
  walk(header, '', all);
  return re ? all.filter((f) => re.test(f.path)) : all;
}

export function cat(asarPath, target) {
  const { header, dataStart } = readAsar(asarPath);
  const all = [];
  walk(header, '', all);
  const f = all.find((x) => x.path === target);
  if (!f) throw new Error('not found: ' + target);
  if (f.unpacked) throw new Error('unpacked: ' + target);
  const fd = fs.openSync(asarPath, 'r');
  const b = Buffer.alloc(f.size);
  fs.readSync(fd, b, 0, f.size, dataStart + Number(f.offset));
  fs.closeSync(fd);
  return b.toString('utf8');
}
