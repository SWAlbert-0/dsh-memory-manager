import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9259;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-hybrid';
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

// 1. set global strategy to advanced
await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'settings',payload:{strategy:'advanced'}})}).then(r=>r.json()).then(j=>j.settings.strategy)`);

// 2. add one record with per-record override 'simple'
const added = await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'add',payload:{text:'混合策略测试：这条用 Simple 覆盖。',kind:'semantic',tags:['混合策略测试'],strategy:'simple'}})}).then(r=>r.json())`);
console.log('added:', JSON.stringify({ ok: added.ok, strategy: added.memory?.strategy }));

// 3. tool search must report the effective strategy per record
const searched = await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'search',payload:{query:'混合策略测试'}})}).then(r=>r.json())`);
console.log('search:', JSON.stringify(searched.memories?.map(m => ({ strategy: m.strategy, rendered: m.rendered }))));

// 4. render the page and check the card + strategy chip
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const card = await ev(`(() => {
  const cards = [...document.querySelectorAll('.dshmem-card')];
  const target = cards.find(c => c.innerText.includes('混合策略测试'));
  if (!target) return 'card-not-found';
  const chip = [...target.querySelectorAll('.dshmem-tag')].map(x => x.innerText).filter(x => !x.startsWith('#'));
  const text = target.querySelector('.dshmem-text').innerText;
  return { text: text.slice(0, 50), strategyChip: chip, strategyLabel: target.innerText.includes('Simple Notes') };
})()`);
console.log('card:', JSON.stringify(card));

// 5. new-memory form must offer per-record strategy
const formOpts = await ev(`(() => {
  const b = document.getElementById('dshmem-tab-add');
  if (b) b.click();
  return new Promise(r => setTimeout(() => {
    const sels = [...document.querySelectorAll('select')];
    const sel = sels.find(s => [...s.options].some(o => o.value === 'simple') && [...s.options].some(o => o.value === 'advanced'));
    return r(sel ? [...sel.options].map(o => o.value + ':' + o.innerText.slice(0, 12)) : 'no-select');
  }, 600));
})()`);
console.log('form strategy options:', JSON.stringify(formOpts));

// 6. cleanup test record
const cleaned = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => { const ids = j.memories.filter(m => (m.tags||[]).includes('混合策略测试')).map(m=>m.id); for (const id of ids) await fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',payload:{id}})}); return ids.length })`);
console.log('cleanup:', cleaned);
await send('Browser.close').catch(() => {});
process.exit(0);
