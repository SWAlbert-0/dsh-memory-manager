import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9247;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-section';
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
// ensure settings placement
await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'settings',payload:{entryPlacement:'settings'}})})`);
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="账号菜单"]'); if (b) b.click(); return !!b })()`);
await sleep(500);
await ev(`(() => { const s = [...document.querySelectorAll('[role=menuitem]')].find(x => x.innerText.includes('设置')); if (s) { s.click(); return true } return false })()`);
await sleep(900);
const nav = await ev(`(() => { const d = document.querySelector('[role=dialog]'); return d ? [...d.querySelectorAll('button,[role=tab],[role=menuitem]')].map(x => x.innerText.trim()).filter(Boolean).slice(0,20) : null })()`);
console.log('settings nav:', JSON.stringify(nav));
const clicked = await ev(`(() => { const d = document.querySelector('[role=dialog]'); if (!d) return false; const b = [...d.querySelectorAll('button,[role=tab],[role=menuitem]')].find(x => x.innerText.trim() === '记忆'); if (b) { b.click(); return true } return false })()`);
console.log('clicked 记忆 nav:', clicked);
await sleep(1000);
const panel = await ev(`(() => { const d = document.querySelector('[role=dialog]'); return d ? { hasTabs: d.innerText.includes('策略与设置'), hasCount: /记忆（\\d+）/.test(d.innerText), sample: d.innerText.slice(0, 500) } : null })()`);
console.log('panel:', JSON.stringify(panel, null, 2));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\settings-section-memory.png', Buffer.from(shot.data, 'base64'));
// restore both
await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'settings',payload:{entryPlacement:'both'}})})`);
await send('Browser.close').catch(() => {});
process.exit(0);
