// Verify the model-facing tools (not the HTTP rpc) honour per-record strategy.
import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9260;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-hybrid2';
spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1000','about:blank'], { detached: true, stdio: 'ignore' }).unref();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result?.value; };
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);

const rpc = (action, payload) => ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:${JSON.stringify(action)},payload:${JSON.stringify(payload)}})}).then(r=>r.json())`);

console.log('global strategy:', await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(j=>j.settings.strategy)`));

// add a record overriding global strategy
const added = await rpc('add', { text: '混合策略测试甲：Simple 覆盖。', kind: 'semantic', tags: ['混合策略测试'], strategy: 'simple' });
console.log('added strategy field:', JSON.stringify(added.memory?.strategy));

// add a record without override (follows global)
const added2 = await rpc('add', { text: '混合策略测试乙：跟随全局。', kind: 'semantic', tags: ['混合策略测试'] });
console.log('no-override strategy field:', JSON.stringify(added2.memory?.strategy));

// search via HTTP rpc returns full rows
const found = await rpc('search', { query: '混合策略测试' });
console.log('search rows:', JSON.stringify(found.memories?.map(m => ({ strategy: m.strategy, rendered: m.rendered }))));

// export contains strategy for all
const exp = await rpc('export', {});
console.log('export strategy sample:', JSON.stringify(exp.data?.memories?.filter(m => (m.tags||[]).includes('混合策略测试')).map(m => ({ id: m.id.slice(0, 12), strategy: m.strategy }))));

// update a record's strategy
const target = found.memories?.find(m => m.text.includes('混合策略测试乙'));
if (target) {
  const upd = await rpc('update', { id: target.id, patch: { strategy: 'json' } });
  console.log('updated strategy:', JSON.stringify(upd.memory?.strategy));
  const after = await rpc('search', { query: '混合策略测试乙' });
  console.log('after update rendered:', JSON.stringify(after.memories?.[0]?.rendered));
}

// cleanup
const cleaned = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => { const ids = j.memories.filter(m => (m.tags||[]).includes('混合策略测试')).map(m=>m.id); for (const id of ids) await fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',payload:{id}})}); return ids.length })`);
console.log('cleanup deleted:', cleaned);
await send('Browser.close').catch(() => {});
process.exit(0);
