// Visual verification: open the memory panel, capture light and dark screenshots,
// and print structural text so the redesign can be checked without a GUI.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const URL = process.argv[2] || process.env.PAGE_URL;
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-visual';

spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--remote-allow-origins=*',
  '--user-data-dir=' + PROFILE, '--window-size=1440,1000', 'about:blank',
], { detached: true, stdio: 'ignore' }).unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }

const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id;
  pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable');
await send('Runtime.enable');
await sleep(6000);

const entry = await evaluate(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === '记忆'); if (el) { el.click(); return true } return false })()`);
await sleep(1500);

const text = String(await evaluate('document.body.innerText'));
const tail = text.split('\n').filter(Boolean).slice(-45).join('\n');
console.log('sidebar entry clicked:', entry);
console.log('--- panel text ---');
console.log(tail);

const light = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\verify-light.png', Buffer.from(light.data, 'base64'));

// Switch to dark theme and capture again.
await evaluate(`document.body.setAttribute('data-ds-dark-theme',''); document.documentElement.style.colorScheme='dark'; true`);
await sleep(900);
const darkText = String(await evaluate('document.body.innerText'));
console.log('--- dark panel tail ---');
console.log(darkText.split('\n').filter(Boolean).slice(-25).join('\n'));
const dark = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\verify-dark.png', Buffer.from(dark.data, 'base64'));

// Report a few computed surfaces to confirm token-driven colors.
const styles = await evaluate(`(() => {
  const out = {};
  const body = getComputedStyle(document.body);
  out.bodyBg = body.backgroundColor;
  out.bodyColor = body.color;
  const cards = [...document.querySelectorAll('div')].filter(d => {
    const s = getComputedStyle(d);
    return s.borderRadius && parseFloat(s.borderRadius) >= 8 && s.borderTopWidth !== '0px' && d.innerText && d.innerText.length > 10;
  }).slice(0, 4).map(d => ({ bg: getComputedStyle(d).backgroundColor, border: getComputedStyle(d).borderTopColor, radius: getComputedStyle(d).borderRadius }));
  out.cards = cards;
  return out;
})()`);
console.log('--- computed ---');
console.log(JSON.stringify(styles, null, 2));
console.log('screenshots: verify-light.png / verify-dark.png');

await send('Browser.close').catch(() => {});
process.exit(0);
