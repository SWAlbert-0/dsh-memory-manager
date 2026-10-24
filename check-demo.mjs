import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9250;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-demo-check';
spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+PORT,'--remote-allow-origins=*','--user-data-dir='+PROFILE,'--window-size=1440,1000','about:blank'], { detached: true, stdio: 'ignore' }).unref();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const jsErrors = [], memoryWrites = [];
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => { const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/memory/') && m.params.request.method !== 'GET') memoryWrites.push(m.params.request.method);
 if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await sleep(5500);
const entry = await ev(`!!document.querySelector('[aria-label="记忆"]')`);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const info = await ev(`(() => ({
  cards: document.querySelectorAll('.dshmem-card').length,
  tabs: [...document.querySelectorAll('[role=tab]')].map(t => t.innerText),
  filters: !!document.querySelector('input[aria-label="搜索记忆"]'),
  kindChips: document.querySelectorAll('[aria-label^="类型："]').length,
  scopeChips: document.querySelectorAll('[aria-label^="范围："]').length,
  countLabel: ([...document.querySelectorAll('.dshmem-root span')].find(x => /显示 \\d+ \\/ \\d+ 条/.test(x.innerText))||{}).innerText || null,
}))()`);
const checks = [];
for (const name of info.tabs) {
  const clicked = await ev(`(() => { const t = [...document.querySelectorAll('.dshmem-root [role=tab]')].find(t => t.innerText === ${JSON.stringify(name)}); if (!t) return false; t.click(); return true; })()`);
  await sleep(200);
  checks.push({ name, clicked, selected: await ev(`document.querySelector('.dshmem-root [role=tab][aria-selected=true]')?.innerText`), rendered: await ev(`!!document.querySelector('.dshmem-root [role=tabpanel]')?.textContent.trim()`) });
}
await ev(`document.querySelector('#dshmem-tab-settings').click()`);
await sleep(200);
const io = await ev(`({ previewImport: [...document.querySelectorAll('.dshmem-root button')].some(b => b.innerText === '预览导入'), importHeading: [...document.querySelectorAll('.dshmem-root div')].some(d => d.innerText === '导入（先预览）') })`);
await ev(`document.querySelector('#dshmem-tab-list').click()`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await sleep(300);
await ev(`document.querySelector('[aria-controls="dshmem-filter-panel"]').click()`);
await sleep(200);
const narrow = await ev(`(() => { const root = document.querySelector('.dshmem-root'); const bar = root.querySelector('.dshmem-filter-bar'); const tag = root.querySelector('.dshmem-filter-select'); const action = root.querySelector('.dshmem-actions button'); return { filterHeight: bar.getBoundingClientRect().height, filterPosition: getComputedStyle(bar).position, actionHeight: action ? action.getBoundingClientRect().height : null, overflow: root.scrollWidth > root.clientWidth, tagWidth: tag.getBoundingClientRect().width, panelWidth: root.querySelector('#dshmem-filter-panel').getBoundingClientRect().width, clamp: getComputedStyle(root.querySelector('.dshmem-text')).webkitLineClamp }; })()`);
const full = await ev(`({ tabs: document.querySelectorAll('.dshmem-root [role=tab]').length, search: !!document.querySelector('.dshmem-root input[type=search]'), edit: !!document.querySelector('.dshmem-root [aria-label="编辑记忆"]'), remove: !!document.querySelector('.dshmem-root [aria-label="删除记忆"]'), add: [...document.querySelectorAll('.dshmem-root button')].some(b => b.innerText === '+ 新增记忆'), simpleToggle: [...document.querySelectorAll('.dshmem-root button')].some(b => b.innerText === '切换到简化视图'), hiddenFilter: [...document.querySelectorAll('.dshmem-root button')].some(b => b.innerText === '仅看已隐藏'), visibilityToggle: [...document.querySelectorAll('.dshmem-root button')].some(b => b.getAttribute('aria-label') === '对 Agent 隐藏' || b.getAttribute('aria-label') === '恢复为对 Agent 可见'), hideHint: [...document.querySelectorAll('.dshmem-root p')].some(p => p.innerText.includes('隐藏会立即生效')) })`);
const report = { entry, ...info, checks, io, narrow, full, jsErrors, memoryWrites };
console.log(JSON.stringify(report, null, 2));
await writeFile(new globalThis.URL('./analysis/p1-browser-live.json', import.meta.url), JSON.stringify(report, null, 2));
await send('Browser.close').catch(() => {});
assert.deepEqual(jsErrors, []);
assert.deepEqual(memoryWrites, []);
assert.deepEqual(info.tabs, ['记忆', '画像', '规则文件', '设置', '说明']);
assert.ok(checks.every(c => c.clicked && c.selected === c.name && c.rendered));
assert.ok(narrow.filterHeight <= 300, 'narrow filter height');
assert.equal(narrow.filterPosition, 'static', 'expanded narrow filter is not sticky');
assert.ok(narrow.actionHeight >= 44, 'narrow action hit area');
assert.equal(narrow.overflow, false);
assert.equal(narrow.tagWidth, narrow.panelWidth);
assert.equal(narrow.clamp, '5');
assert.ok(full.tabs === 5 && full.search && full.edit && full.remove && full.add && !full.simpleToggle && full.hiddenFilter && full.visibilityToggle && full.hideHint && io.previewImport && io.importHeading);
process.exit(0);
