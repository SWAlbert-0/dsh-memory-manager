import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9253;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-p0p1';
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

// add a long record with many tags for clamp / +N testing
const longText = '长文测试：' + '这是一段用于验证多行截断与展开按钮的长文本。'.repeat(24);
await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'add',payload:{text:${JSON.stringify(longText)},kind:'semantic',tags:['长文测试1','长文测试2','长文测试3','长文测试4','长文测试5','长文测试6'],importance:2}})}).then(r=>r.json()).then(j=>!!j.ok)`);
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);

const desktop = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const card = document.querySelector('.dshmem-card');
  const text = card.querySelector('.dshmem-text');
  const meta = card.querySelector('.dshmem-meta');
  const content = document.querySelector('.dshmem-content');
  const long = [...document.querySelectorAll('.dshmem-card')].find(c => c.innerText.includes('长文测试'));
  const lt = long.querySelector('.dshmem-text');
  return {
    contentPadding: getComputedStyle(content).padding,
    cardPadding: getComputedStyle(card).padding,
    textFont: getComputedStyle(text).fontSize + '/' + getComputedStyle(text).lineHeight,
    metaFont: getComputedStyle(meta).fontSize + '/' + getComputedStyle(meta).lineHeight,
    metaColor: getComputedStyle(meta).color,
    firstCardTop: Math.round(card.getBoundingClientRect().top),
    longCollapsed: lt.getAttribute('data-collapsed'),
    longOverflowBtn: [...long.querySelectorAll('button')].some(b => b.innerText.trim() === '展开全文'),
    longTagsMore: [...long.querySelectorAll('button')].some(b => /^\\+\\d+$/.test(b.innerText.trim())),
    timeText: card.querySelector('time')?.innerText,
    timeTitle: card.querySelector('time')?.getAttribute('title'),
    liveCount: !!document.querySelector('[role=status][aria-live=polite]'),
    describedBy: card.querySelector('button[aria-label="编辑记忆"]')?.getAttribute('aria-describedby'),
  };
})()`);
console.log('DESKTOP', JSON.stringify(desktop, null, 2));

// expand long text
const longCardSel = `[...document.querySelectorAll('.dshmem-card')].find(c => c.innerText.includes('长文测试'))`;
await ev(`(() => { const c = ${longCardSel}; const b = [...c.querySelectorAll('button')].find(x => x.innerText.trim() === '展开全文'); if (b) { b.click(); return true } return false })()`);
await sleep(300);
console.log('after expand:', await ev(`(() => { const c = ${longCardSel}; const t = c.querySelector('.dshmem-text'); return { collapsed: t.getAttribute('data-collapsed'), h: Math.round(t.getBoundingClientRect().height) } })()`));

// expand tags
await ev(`(() => { const c = ${longCardSel}; const b = [...c.querySelectorAll('button')].find(x => /^\\+\\d+$/.test(x.innerText.trim())); if (b) { b.click(); return true } return false })()`);
await sleep(300);
console.log('after +N:', await ev(`(() => { const c = ${longCardSel}; return { tags: [...c.querySelectorAll('.dshmem-tag')].map(x => x.innerText), hasCollapse: [...c.querySelectorAll('button')].some(b => b.innerText.trim() === '收起') } })()`));

const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\p0p1-1440-light.png', Buffer.from(shot1.data, 'base64'));

// sticky check
const beforeTop = await ev(`Math.round(document.querySelector('.dshmem-filter-bar').getBoundingClientRect().top)`);
await ev(`document.querySelector('.dshmem-root').scrollTop = 500; true`);
await sleep(300);
const afterTop = await ev(`Math.round(document.querySelector('.dshmem-filter-bar').getBoundingClientRect().top)`);
console.log('sticky:', { beforeTop, afterTop });
await ev(`document.querySelector('.dshmem-root').scrollTop = 0; true`);

// narrow
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(900);
const narrow = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const panel = document.getElementById('dshmem-filter-panel');
  const toggle = [...root.querySelectorAll('button')].find(b => b.innerText.trim().startsWith('筛选'));
  const card = document.querySelector('.dshmem-card');
  return {
    rootOverflow: { scroll: root.scrollWidth, client: root.clientWidth },
    panelDisplay: getComputedStyle(panel).display,
    toggleText: toggle?.innerText,
    firstCardTop: Math.round(card.getBoundingClientRect().top),
    cardPadding: getComputedStyle(card).padding,
    tabsHeight: Math.round(document.querySelector('.dshmem-tabs').getBoundingClientRect().height),
  };
})()`);
console.log('NARROW', JSON.stringify(narrow, null, 2));
await ev(`(() => { const b = [...document.querySelectorAll('.dshmem-root button')].find(x => x.innerText.trim().startsWith('筛选')); if (b) { b.click(); return true } return false })()`);
await sleep(400);
const narrowOpen = await ev(`(() => {
  const panel = document.getElementById('dshmem-filter-panel');
  const groups = [...panel.querySelectorAll('.dshmem-filter-group')];
  return {
    panelDisplay: getComputedStyle(panel).display,
    groupWidths: groups.map(g => ({ w: Math.round(g.getBoundingClientRect().width), basis: getComputedStyle(g).flexBasis })),
    rootOverflow: { scroll: document.querySelector('.dshmem-root').scrollWidth, client: document.querySelector('.dshmem-root').clientWidth },
  };
})()`);
console.log('NARROW OPEN', JSON.stringify(narrowOpen, null, 2));
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\p0p1-390-light.png', Buffer.from(shot2.data, 'base64'));

// cleanup temp record
const removed = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => { const ids = j.memories.filter(m => (m.tags||[]).some(t => t.startsWith('长文测试'))).map(m => m.id); for (const id of ids) await fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',payload:{id}})}); return ids.length })`);
console.log('cleanup deleted:', removed);
await send('Browser.close').catch(() => {});
process.exit(0);
