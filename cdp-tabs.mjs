import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const URL = process.env.PAGE_URL;
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile2';
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
const clickText = async (t) => text(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === ${JSON.stringify(t)}); if (el) { el.click(); return true } return false })()`);
await sleep(6000);
await clickText('记忆'); await sleep(1200);
for (const t of ['策略与设置', '导入导出', '新增']) {
  await clickText(t); await sleep(900);
  const body = String(await text('document.body.innerText'));
  console.log('\n=== TAB ' + t + ' ===');
  console.log(body.split('\n').filter(Boolean).slice(-40).join('\n'));
}
await send('Browser.close').catch(() => {});
process.exit(0);
