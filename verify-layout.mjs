import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9228;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-layout';
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
await sleep(1200);
const out = await ev(`(() => {
  const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), font: s.fontSize, radius: s.borderRadius, bg: s.backgroundColor }; };
  return {
    viewport: { w: innerWidth, h: innerHeight },
    content: rect('.dshmem-content'),
    title: rect('.dshmem-root h1'),
    tabs: rect('.dshmem-tabs'),
    activeTab: rect('.dshmem-tabs [aria-selected=true]'),
    search: rect('.dshmem-root input[type=search]'),
    firstCard: rect('.dshmem-card'),
    cardCount: document.querySelectorAll('.dshmem-card').length,
  };
})()`);
console.log(JSON.stringify(out, null, 2));
await send('Browser.close').catch(() => {});
process.exit(0);
