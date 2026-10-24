// Interaction test for the redesigned UI: add a memory through the form,
// search it, then delete it through the API. Leaves the store unchanged.
import { spawn } from 'node:child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9227;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-ui';

spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1000','about:blank'], { detached: true, stdio: 'ignore' }).unref();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');
await sleep(6000);
await ev(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === '记忆'); if (el) el.click(); return !!el })()`);
await sleep(1000);

const count = async () => (await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(j=>j.memories.length)`));
const before = await count();
console.log('count before:', before);

// open add tab
await ev(`document.getElementById('dshmem-tab-add').click()`);
await sleep(400);

const label = 'UI 自动化测试记忆（可删除） ' + Date.now();
await ev(`(() => {
  const ta = document.querySelector('.dshmem-root textarea');
  if (!ta) return 'no-textarea';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(label)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()`);
await sleep(300);

const clicked = await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim() === '添加记忆'); if (b) { b.click(); return true } return false })()`);
console.log('clicked add:', clicked);
await sleep(1200);

const after = await count();
console.log('count after add:', after, 'delta:', after - before);

// search tab
await ev(`document.getElementById('dshmem-tab-list').click()`);
await sleep(400);
const filtered = await ev(`(() => {
  const inp = document.querySelector('.dshmem-root input[type=search]');
  if (!inp) return 'no-search';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'UI 自动化测试');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()`);
await sleep(600);
const visible = await ev(`document.querySelectorAll('.dshmem-card').length`);
console.log('search set:', filtered, 'visible cards:', visible);

// cleanup: delete the test memory via API
const removed = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => {
  const m = j.memories.find(x => x.text.includes('UI 自动化测试记忆'));
  if (!m) return 'not-found';
  const res = await fetch('/api/memory/rpc', { method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'delete', payload:{ id:m.id } }) });
  const out = await res.json();
  return out.ok ? 'deleted' : 'failed';
})`);
console.log('cleanup:', removed);
await sleep(500);
console.log('count final:', await count());

await send('Browser.close').catch(() => {});
process.exit(0);
