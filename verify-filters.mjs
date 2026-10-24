import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9248;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-filters';
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
const reload = async () => { await send('Page.reload'); await sleep(5500); };
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);

const add = (payload) => ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'add',payload:${JSON.stringify(payload)}})}).then(r=>r.json())`);
const delTag = (tag) => ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => { const ids = j.memories.filter(m => (m.tags||[]).includes(${JSON.stringify(tag)})).map(m=>m.id); for (const id of ids) await fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',payload:{id}})}); return ids.length })`);

await add({ text: '筛选测试：情景记忆 A', kind: 'episodic', scope: 'global', tags: ['筛选测试A'], importance: 2 });
await add({ text: '筛选测试：项目记忆 B', kind: 'semantic', scope: 'project', tags: ['筛选测试B'], importance: 5 });
await reload();
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) { b.click(); return true } return false })()`);
await sleep(1200);

const cards = () => ev(`document.querySelectorAll('.dshmem-card').length`);
const clickLabel = (label) => ev(`(() => { const b = document.querySelector('[aria-label=${JSON.stringify(label)}]'); if (b) { b.click(); return true } return false })()`);
const setSelect = (label, value) => ev(`(() => { const s = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); if (!s) return 'no-select'; const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok' })()`);
const setSearch = (value) => ev(`(() => { const i = document.querySelector('input[aria-label="搜索记忆"]'); if (!i) return 'no-input'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true })); return 'ok' })()`);

console.log('total cards:', await cards());
await clickLabel('类型：情景'); await sleep(300); console.log('kind=episodic:', await cards());
await clickLabel('类型：全部'); await clickLabel('范围：项目'); await sleep(300); console.log('scope=project:', await cards());
await clickLabel('范围：全部'); await sleep(200);
console.log('tag select:', await setSelect('标签筛选', '筛选测试A')); await sleep(300); console.log('tag=筛选测试A:', await cards());
await setSelect('标签筛选', ''); await sleep(200);
console.log('search:', await setSearch('筛选测试B')); await sleep(400); console.log('search=筛选测试B:', await cards());
const clear = await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim() === '清除筛选'); if (b) { b.click(); return true } return false })()`);
await sleep(400);
console.log('clear clicked:', clear, 'cards after clear:', await cards());
console.log('count label:', await ev(`(() => { const s = [...document.querySelectorAll('.dshmem-root span')].find(x => /显示 \\d+ \\/ \\d+ 条/.test(x.innerText)); return s ? s.innerText : null })()`));

const d1 = await delTag('筛选测试A');
const d2 = await delTag('筛选测试B');
console.log('cleanup deleted:', d1, d2);
await send('Browser.close').catch(() => {});
process.exit(0);
