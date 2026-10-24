import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9262;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-moji';
spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1200','about:blank'], { detached: true, stdio: 'ignore' }).unref();
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
const tabs = ["list","add","settings","io","practice","help"];
const MOJI = /[鈥锛鏄鎴戜細璁板繂鍐呭鍒犻櫎缂栬緫鎻掍欢鐢ㄦ埛鏉冮檺楠岃瘉鏁版嵁绛栫暐鍐呭瀹箣厛鍚庢寜]/;
for (const t of tabs) {
  await ev(`document.getElementById('dshmem-tab-${t}').click()`);
  await sleep(400);
  const text = String(await ev(`document.querySelector('[role=tabpanel]').innerText`));
  const hits = (text.match(new RegExp(MOJI, 'g')) || []).length;
  console.log('tab=' + t + ' | mojibake hits: ' + hits);
  if (hits) {
    const lines = text.split('\n').filter(l => MOJI.test(l));
    for (const l of lines.slice(0, 10)) console.log('   > ' + l.slice(0, 110));
  }
}
await send('Browser.close').catch(() => {});
process.exit(0);
