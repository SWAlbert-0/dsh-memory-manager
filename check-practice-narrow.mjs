import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9252;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-practice-narrow';
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
await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(900);
await ev(`document.getElementById('dshmem-tab-practice').click()`);
await sleep(700);
console.log('--- table text sample ---');
console.log(String(await ev(`document.querySelector('[role=table]').innerText`)).slice(0, 1200));
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(800);
const narrow = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const table = document.querySelector('[role=table]');
  const wrap = table ? table.parentElement : null;
  return {
    viewport: innerWidth,
    root: { scroll: root.scrollWidth, client: root.clientWidth },
    wrap: wrap ? { scroll: wrap.scrollWidth, client: wrap.clientWidth, overflowX: getComputedStyle(wrap).overflowX } : null,
    gridCols: table ? getComputedStyle(table).gridTemplateColumns : null,
  };
})()`);
console.log('narrow:', JSON.stringify(narrow, null, 2));
await send('Browser.close').catch(() => {});
process.exit(0);
