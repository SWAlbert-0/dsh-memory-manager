// Independent light/dark theme check for the redesigned memory panel.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9226;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-theme';

spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1000','about:blank'], { detached: true, stdio: 'ignore' }).unref();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');
await sleep(6000);
await ev(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === '记忆'); if (el) el.click(); return !!el })()`);
await sleep(1200);

const surfaces = async () => ev(`(() => {
  const pick = (s) => { const e = document.querySelector(s); return e ? { bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color, border: getComputedStyle(e).borderTopColor } : null };
  return { scheme: getComputedStyle(document.documentElement).colorScheme, body: pick('body'), root: pick('.dshmem-root'), card: pick('.dshmem-card'), tabActive: pick('.dshmem-tabs [aria-selected=true]'), primary: pick('.dshmem-root button[style*="button-primary"]') || null };
})()`);

// force light
await ev(`document.body.removeAttribute('data-ds-dark-theme'); document.documentElement.style.colorScheme='light'; true`);
await sleep(500);
const light = await surfaces();
const lightShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\theme-light.png', Buffer.from(lightShot.data, 'base64'));

// force dark
await ev(`document.body.setAttribute('data-ds-dark-theme',''); document.documentElement.style.colorScheme='dark'; true`);
await sleep(500);
const dark = await surfaces();
const darkShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\theme-dark.png', Buffer.from(darkShot.data, 'base64'));

console.log('LIGHT', JSON.stringify(light, null, 2));
console.log('DARK', JSON.stringify(dark, null, 2));

const meta = await ev(`({ cards: document.querySelectorAll('.dshmem-card').length, tabs: [...document.querySelectorAll('[role=tab]')].map(t => t.innerText), hasStyle: !!document.querySelector('.dshmem-root style') })`);
console.log('META', JSON.stringify(meta));

await send('Browser.close').catch(() => {});
process.exit(0);
