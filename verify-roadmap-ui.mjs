import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9263;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-roadmap';
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
const rpc = (action, payload) => ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:${JSON.stringify(action)},payload:${JSON.stringify(payload)}})}).then(r=>r.json())`);
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);

console.log('llmAvailable:', await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(j=>JSON.stringify({llmAvailable:j.llmAvailable,count:j.memories.length,pinnedBudget:j.settings.pinnedBudget}))`));

// Pin a memory via update
const st = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json())`);
const firstId = st.memories[0]?.id;
console.log('first memory id:', firstId);
if (firstId) {
  const pin = await rpc('update', { id: firstId, patch: { pinned: true } });
  console.log('pinned:', pin.memory?.pinned);
}

// reload and check injection has memory-rules
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const pinnedCard = await ev(`(() => { const c = document.querySelector('.dshmem-card.dshmem-pinned'); return c ? { pinned: true, border: getComputedStyle(c).borderLeftWidth + ' ' + getComputedStyle(c).borderLeftColor } : null })()`);
console.log('pinned card:', JSON.stringify(pinnedCard));

// agents-md tab
await ev(`document.getElementById('dshmem-tab-agents').click()`);
await sleep(800);
const agentsUI = await ev(`(() => { const p = document.querySelector('[role=tabpanel]'); return { hasTextarea: !!p.querySelector('textarea'), hasSave: [...p.querySelectorAll('button')].some(b => b.innerText.includes('保存')), intro: p.innerText.includes('自动注入') } })()`);
console.log('agents tab:', JSON.stringify(agentsUI));

// settings tab has pinned budget and autoCapture interval
await ev(`document.getElementById('dshmem-tab-settings').click()`);
await sleep(700);
const settingsUI = await ev(`(() => { const p = document.querySelector('[role=tabpanel]'); return { hasBudget: p.innerText.includes('常驻预算'), hasInterval: p.innerText.includes('自动沉淀间隔'), hasAutoCapture: p.innerText.includes('自动沉淀') } })()`);
console.log('settings tab:', JSON.stringify(settingsUI));

// 6 tabs check
const tabs = await ev(`[...document.querySelectorAll('[role=tab]')].map(t => t.innerText)`);
console.log('tabs:', JSON.stringify(tabs));

// cleanup: unpin
if (firstId) await rpc('update', { id: firstId, patch: { pinned: false } });
await send('Browser.close').catch(() => {});
process.exit(0);
