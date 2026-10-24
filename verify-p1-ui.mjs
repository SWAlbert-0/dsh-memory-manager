import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9268;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-p1verify';
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
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\' + name, Buffer.from(s.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const ui = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  return {
    tabs: [...root.querySelectorAll('[role=tab]')].map(t => t.innerText),
    cards: root.querySelectorAll('.dshmem-card').length,
    hasSearch: !!root.querySelector('input[aria-label*="搜索"]'),
    hasFilterToggle: [...root.querySelectorAll('button')].some(b => b.innerText.startsWith('筛选')),
    hasNewBtn: [...root.querySelectorAll('button')].some(b => b.innerText.includes('新增记忆')),
    hasPinned: [...root.querySelectorAll('.dshmem-card')].some(c => c.className.includes('pinned')),
  };
})()`);
console.log('UI:', JSON.stringify(ui, null, 2));
await shot('p1-list-light.png');
// settings tab
await ev(`document.getElementById('dshmem-tab-settings').click()`);
await sleep(700);
const settingsUI = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  return {
    hasInjectMode: root.innerText.includes('注入模式'),
    hasPinnedBudget: root.innerText.includes('常驻预算'),
    hasAutoCaptureInterval: root.innerText.includes('自动沉淀间隔'),
    hasRuleEditor: root.innerText.includes('混合策略规则'),
  };
})()`);
console.log('settings:', JSON.stringify(settingsUI));
await shot('p1-settings-light.png');
// agents tab
await ev(`document.getElementById('dshmem-tab-agents').click()`);
await sleep(700);
const agentsUI = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  return { hasTextarea: !!root.querySelector('textarea'), hasSave: [...root.querySelectorAll('button')].some(b => b.innerText.includes('保存')), hasIntro: root.innerText.includes('自动注入') };
})()`);
console.log('agents:', JSON.stringify(agentsUI));
// narrow
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(800);
const narrow = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const toggle = [...root.querySelectorAll('button')].find(b => b.innerText.trim().startsWith('筛选'));
  if (toggle) toggle.click();
  return new Promise(r => setTimeout(() => {
    const panel = document.getElementById('dshmem-filter-panel');
    r({
      rootOverflow: root.scrollWidth + '/' + root.clientWidth,
      panelVisible: panel ? getComputedStyle(panel).display : 'none',
      filterAreaH: panel ? Math.round(panel.getBoundingClientRect().height) : 0,
    });
  }, 500));
})()`);
console.log('narrow:', JSON.stringify(narrow));
await send('Browser.close').catch(() => {});
process.exit(0);
