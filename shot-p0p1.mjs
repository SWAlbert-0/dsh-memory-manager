import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9254;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-p0p1shot';
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
await sleep(1200);

const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\' + name, Buffer.from(s.data, 'base64')); };
await shot('p0p1-desktop-light.png');
const lightMeta = await ev(`getComputedStyle(document.querySelector('.dshmem-meta')).color`);
const focus = await ev(`(() => { const i = document.querySelector('input[aria-label="搜索记忆"]'); i.focus(); const s = getComputedStyle(i); return { outline: s.outlineColor + ' ' + s.outlineWidth, offset: s.outlineOffset } })()`);
console.log('light meta color:', lightMeta);
console.log('focus:', JSON.stringify(focus));

await ev(`document.body.setAttribute('data-ds-dark-theme',''); true`);
await sleep(500);
await shot('p0p1-desktop-dark.png');
console.log('dark surfaces:', await ev(`JSON.stringify({ card: getComputedStyle(document.querySelector('.dshmem-card')).backgroundColor, meta: getComputedStyle(document.querySelector('.dshmem-meta')).color, body: getComputedStyle(document.body).backgroundColor })`));

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(800);
await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim().startsWith('筛选')); if (b) b.click(); return true })()`);
await sleep(400);
await shot('p0p1-narrow-dark.png');
await ev(`document.body.removeAttribute('data-ds-dark-theme'); true`);
await sleep(400);
await shot('p0p1-narrow-light.png');
console.log('narrow overflow:', await ev(`(() => { const r = document.querySelector('.dshmem-root'); return r.scrollWidth + '/' + r.clientWidth })()`));
await send('Browser.close').catch(() => {});
process.exit(0);
