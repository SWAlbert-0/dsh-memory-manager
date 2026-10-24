import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
const URL = process.env.PAGE_URL;
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile3';
spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,900','about:blank'], { detached: true, stdio: 'ignore' }).unref();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
const text = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
await sleep(6000);
const tokens = await text(`(() => {
  const names = ['--dsw-alias-bg-base','--dsw-alias-bg-layer-1','--dsw-alias-bg-layer-2','--dsw-alias-bg-layer-3','--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-label-tertiary','--dsw-alias-border-l1','--dsw-alias-border-l2','--dsw-alias-border-l3','--dsw-alias-brand-primary','--dsw-alias-button-primary-fill','--dsw-alias-button-primary-hover','--dsw-alias-interactive-bg-hover','--dsw-alias-interactive-bg-active','--dsw-radius-xs','--dsw-radius-sm','--dsw-radius-md','--dsw-radius-lg','--dsw-radius-xl','--dsw-font-family','--ds-font-family-code'];
  const cs = getComputedStyle(document.body);
  const out = {};
  for (const n of names) out[n] = cs.getPropertyValue(n).trim();
  return { scheme: getComputedStyle(document.documentElement).colorScheme, bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily, out };
})()`);
console.log(JSON.stringify(tokens, null, 2));
await send('Browser.close').catch(() => {});
process.exit(0);
