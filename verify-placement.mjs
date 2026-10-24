import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9246;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-placement';
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
const sleepLong = () => sleep(5500);
await send('Page.enable'); await send('Runtime.enable');

const setPlacement = (p) => ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'settings',payload:{entryPlacement:${JSON.stringify(p)}}})}).then(r=>r.json()).then(j=>j.settings.entryPlacement)`);
const reload = async () => { await send('Page.reload', { ignoreCache: false }); await sleepLong(); };
const sidebarEntry = () => ev(`!!document.querySelector('[aria-label="记忆"]')`);
const openSettings = async () => {
  await ev(`(() => { const b = document.querySelector('[aria-label="账号菜单"]'); if (b) b.click(); return !!b })()`);
  await sleep(500);
  const clicked = await ev(`(() => { const items = [...document.querySelectorAll('[role=menuitem]')]; const s = items.find(x => x.innerText.includes('设置')); if (s) { s.click(); return true } return false })()`);
  await sleep(900);
  return clicked;
};
const closeSettings = async () => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);
};
const settingsNavHasMemory = () => ev(`(() => { const d = document.querySelector('[role=dialog]'); return d ? d.innerText.includes('记忆') : null })()`);

await sleepLong();
for (const placement of ['both', 'sidebar', 'settings']) {
  console.log('set placement:', await setPlacement(placement));
  await reload();
  const sidebar = await sidebarEntry();
  const opened = await openSettings();
  const nav = await settingsNavHasMemory();
  console.log(`  placement=${placement} sidebar=${sidebar} settingsOpened=${opened} settingsNavHasMemory=${nav}`);
  if (placement !== 'sidebar') {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`D:\\Documents\\Temp\\dsh-memory-plugin\\settings-${placement}.png`, Buffer.from(shot.data, 'base64'));
  }
  await closeSettings();
}

// dynamic remount without reload
await setPlacement('both');
await reload();
console.log('dynamic start sidebar:', await sidebarEntry());
await ev(`window.dispatchEvent(new CustomEvent('dsh-memory:placement',{detail:{placement:'settings'}})); true`);
await sleep(700);
console.log('after event settings: sidebar:', await sidebarEntry());
await ev(`window.dispatchEvent(new CustomEvent('dsh-memory:placement',{detail:{placement:'both'}})); true`);
await sleep(700);
console.log('after event both: sidebar:', await sidebarEntry());
await send('Browser.close').catch(() => {});
process.exit(0);
