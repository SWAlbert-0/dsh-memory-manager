import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9255;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-p2';
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
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);

const setSelect = (label, value) => ev(`(() => { const s = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); if (!s) return 'no-select'; const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok' })()`);

console.log('structured spans:', JSON.stringify(await ev(`(() => {
  const card = [...document.querySelectorAll('.dshmem-card')].find(c => c.innerText.includes('张医生'));
  if (!card) return null;
  return [...card.querySelectorAll('.dshmem-text span')].map(s => ({ text: s.innerText.slice(0, 18), size: getComputedStyle(s).fontSize, mono: /mono|SF Mono|Consolas/i.test(getComputedStyle(s).fontFamily) }));
})()`), null, 2));

console.log('group select time:', await setSelect('分组方式', 'time'));
await sleep(500);
console.log('time groups:', JSON.stringify(await ev(`[...document.querySelectorAll('.dshmem-root h2')].map(h => h.innerText)`)));
await setSelect('分组方式', 'kind');
await sleep(500);
console.log('kind groups:', JSON.stringify(await ev(`[...document.querySelectorAll('.dshmem-root h2')].map(h => h.innerText)`)));
await setSelect('分组方式', 'none');
await sleep(300);

const compactClicked = await ev(`(() => { const b = document.querySelector('button[aria-label="紧凑模式"]'); if (b) { b.click(); return true } return false })()`);
await sleep(300);
console.log('compact:', compactClicked, await ev(`(() => { const r = document.querySelector('.dshmem-root'); const c = document.querySelector('.dshmem-card'); return { class: r.className, padding: getComputedStyle(c).padding, margin: getComputedStyle(c).marginBottom } })()`));

// error state
const errScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const orig = window.fetch; window.fetch = (u, o) => String(u).includes('/api/memory/state') ? Promise.reject(new Error('mock failure')) : orig(u, o); })();` });
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
console.log('error UI:', await ev(`(() => { const t = document.body.innerText; return { hasTitle: t.includes('加载失败'), hasRetry: t.includes('重试'), hasReason: t.includes('mock failure') } })()`));
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: errScript.identifier });

// skeleton state
const slowScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const orig = window.fetch; window.fetch = (u, o) => String(u).includes('/api/memory/state') ? new Promise(res => setTimeout(() => res(orig(u, o)), 15000)) : orig(u, o); })();` });
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(800);
console.log('skeleton:', await ev(`(() => ({ count: document.querySelectorAll('.dshmem-skeleton').length, busy: document.querySelector('[aria-busy="true"]') !== null }))()`));
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: slowScript.identifier });
await send('Page.reload'); await sleep(5500);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\p2-desktop-light.png', Buffer.from(shot.data, 'base64'));
await send('Browser.close').catch(() => {});
process.exit(0);
