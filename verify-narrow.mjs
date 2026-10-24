import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9236;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-narrow3';
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
await sleep(6000);
await ev(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === '记忆'); if (el) el.click(); return !!el })()`);
await sleep(1200);
console.log('panel open:', await ev(`!!document.querySelector('.dshmem-root')`));

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(800);

const info = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const tabs = document.querySelector('.dshmem-tabs');
  return {
    viewport: innerWidth,
    root: { scroll: root.scrollWidth, client: root.clientWidth },
    tabs: { scroll: tabs.scrollWidth, client: tabs.clientWidth, h: Math.round(tabs.getBoundingClientRect().height) },
    buttons: [...tabs.querySelectorAll('button')].map(b => ({ text: b.innerText, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })),
  };
})()`);
console.log(JSON.stringify(info, null, 2));
await ev(`document.getElementById('dshmem-tab-help').click()`);
await sleep(500);
console.log('help overflow:', JSON.stringify(await ev(`(() => { const r = document.querySelector('.dshmem-root'); return { scroll: r.scrollWidth, client: r.clientWidth } })()`)));
await send('Browser.close').catch(() => {});
process.exit(0);
