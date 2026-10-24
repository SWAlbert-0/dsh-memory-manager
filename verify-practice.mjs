import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9251;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-practice';
spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1200','about:blank'], { detached: true, stdio: 'ignore' }).unref();
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
await ev(`window.confirm = () => true; true`);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1000);
const tabs = await ev(`[...document.querySelectorAll('[role=tab]')].map(t => t.innerText)`);
console.log('tabs:', JSON.stringify(tabs));
await ev(`document.getElementById('dshmem-tab-practice').click()`);
await sleep(800);
const info = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const grid = root.querySelector('[role=table]');
  return {
    hasIntro: root.innerText.includes('练习模式'),
    hasTasks: root.innerText.includes('练习任务'),
    headers: [...root.querySelectorAll('[role=columnheader]')].map(x => x.innerText),
    rows: root.querySelectorAll('[role=rowheader]').length,
    cells: root.querySelectorAll('[role=cell]').length,
    degraded: [...root.querySelectorAll('[role=cell]')].filter(c => c.innerText.includes('退化')).length,
    overflow: { scroll: root.scrollWidth, client: root.clientWidth },
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
  };
})()`);
console.log(JSON.stringify(info, null, 2));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\practice-light.png', Buffer.from(shot.data, 'base64'));

const count = () => ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(j=>j.memories.length)`);
console.log('count before:', await count());
const imp = await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim() === '导入示例到记忆库'); if (b) { b.click(); return true } return false })()`);
console.log('clicked import:', imp);
await sleep(1500);
console.log('count after import:', await count());
const cleared = await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim() === '清除练习示例'); if (b) { b.click(); return true } return false })()`);
console.log('clicked clear:', cleared);
await sleep(1500);
console.log('count after clear:', await count());

await ev(`document.body.setAttribute('data-ds-dark-theme',''); true`);
await sleep(500);
const dark = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\practice-dark.png', Buffer.from(dark.data, 'base64'));
await send('Browser.close').catch(() => {});
process.exit(0);
