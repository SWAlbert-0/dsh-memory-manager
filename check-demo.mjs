import assert from 'node:assert/strict';

// Attach to an existing browser only. Never launch a browser, inspect a personal
// profile, or close the user's browser. The temporary test tab is always closed.
const pageUrl = process.argv[2];
const cdp = (process.argv[3] || process.env.DSH_MEMORY_BROWSER_CDP_URL || 'http://127.0.0.1:9250').replace(/\/$/, '');
if (!pageUrl) throw new Error('Usage: node check-demo.mjs <authenticated playground URL> [existing browser CDP URL]');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pending = new Map(), jsErrors = [], memoryWrites = [];
let ws, tab, serial = 0;
const deadline = Date.now() + 60000;
const failPending = error => { for (const task of pending.values()) { clearTimeout(task.timer); task.reject(error); } pending.clear(); };
const watchdog = setTimeout(() => { failPending(new Error('Browser check exceeded 60 seconds')); try { ws?.close(); } catch {} }, 60000);
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP request timed out: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}
async function waitFor(expression) {
  const until = Math.min(deadline, Date.now() + 15000);
  while (Date.now() < until) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error('Page condition timed out');
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
try {
  let available;
  try { available = await fetch(cdp + '/json/version', { signal: AbortSignal.timeout(2000) }); }
  catch { throw new Error('No existing browser control connection. Supply DSH_MEMORY_BROWSER_CDP_URL or the third argument; this script does not launch a browser.'); }
  if (!available.ok) throw new Error('Existing browser CDP endpoint is unavailable');
  const created = await fetch(cdp + '/json/new?about:blank', { method: 'PUT', signal: AbortSignal.timeout(3000) });
  if (!created.ok) throw new Error('Could not create the owned test tab');
  tab = await created.json(); ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; ws.onclose = () => reject(new Error('Browser disconnected during connection')); });
  ws.onclose = () => failPending(new Error('Browser disconnected'));
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') jsErrors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/api/memory/') && message.params.request.method !== 'GET') memoryWrites.push(message.params.request.method);
    if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); clearTimeout(task.timer); message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result); }
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pageUrl });
  await waitFor(`!!document.querySelector('[aria-label="记忆"]')`); await click('[aria-label="记忆"]');
  await waitFor(`!!document.querySelector('.dshmem-root input[aria-label="搜索记忆"]')`);
  const tabs = await evaluate(`[...document.querySelectorAll('.dshmem-root [role=tab]')].map(t => t.innerText)`);
  assert.deepEqual(tabs, ['记忆', '画像', '全局规则', '设置', '说明']);
  const cards = await evaluate(`document.querySelectorAll('.dshmem-card').length`);
  assert.equal(await evaluate(`document.querySelector('#dshmem-filter-panel').hidden`), true);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label^="快速查看："]').length`), 4);
  let details = null;
  if (cards) {
    assert.equal(await evaluate(`document.querySelector('.dshmem-card').querySelectorAll('button').length`), 1);
    await evaluate(`(() => { const trigger = document.querySelector('[aria-label="查看记忆详情"]'); trigger.focus(); trigger.click(); })()`);
    await waitFor(`!!document.querySelector('[role=dialog][aria-label="记忆详情"]')`);
    details = await evaluate(`({ edit: !!document.querySelector('[role=dialog] [aria-label="编辑记忆"]'), remove: !!document.querySelector('[role=dialog] [aria-label="删除记忆"]'), source: [...document.querySelectorAll('[role=dialog] summary')].some(s => s.innerText === '查看依据') })`);
    assert.ok(details.edit && details.remove && details.source);
    await click('[aria-label="关闭弹窗"]'); await waitFor(`!document.querySelector('[role=dialog]')`);
    assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label')`), '查看记忆详情');
  }
  await click('[aria-controls="dshmem-filter-panel"]'); await waitFor(`!!document.querySelector('[aria-label="项目筛选"]')`);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label^="可见性："]').length`), 3);
  await click('[aria-label="快速查看：已隐藏"]'); await pause(100);
  assert.equal(await evaluate(`[...document.querySelectorAll('.dshmem-card')].every(row => row.classList.contains('dshmem-hidden'))`), true);
  await click('[aria-label="快速查看：全部"]'); await click('[aria-controls="dshmem-filter-panel"]');
  await click('#dshmem-tab-settings'); await waitFor(`!!document.querySelector('.dshmem-settings-hub')`);
  assert.equal(await evaluate(`document.querySelector('#dshmem-settings-data').hidden`), true);
  await click('#dshmem-settings-data-tab'); await waitFor(`!document.querySelector('#dshmem-settings-data').hidden`);
  const data = await evaluate(`({ fileImport: !!document.querySelector('[aria-label="选择记忆备份文件"]'), preview: [...document.querySelectorAll('#dshmem-settings-data button')].some(b => b.innerText === '预览导入'), dangerousClosed: [...document.querySelectorAll('#dshmem-settings-data details')].filter(d => d.querySelector('summary')?.innerText.includes('危险操作')).every(d => !d.open) })`);
  assert.ok(data.fileImport && data.preview && data.dangerousClosed);
  await click('#dshmem-tab-list'); await waitFor(`!!document.querySelector('[aria-label="搜索记忆"]')`);
  await evaluate(`([...document.querySelectorAll('.dshmem-root button')].find(b => b.innerText === '+ 新增记忆')).click()`);
  await waitFor(`!!document.querySelector('[role=dialog][aria-label="新增记忆"]')`);
  assert.equal(await evaluate(`document.querySelector('[role=dialog] .dshmem-advanced').open`), false);
  assert.equal(await evaluate(`document.querySelectorAll('[role=dialog] input[type=datetime-local]').length`), 3);
  await click('[aria-label="关闭弹窗"]'); await waitFor(`!document.querySelector('[role=dialog]')`);
  const narrow = [];
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false }); await pause(150);
    const normal = await evaluate(`(() => { const root = document.querySelector('.dshmem-root'); const trigger = root.querySelector('.dshmem-detail-trigger'); return { overflow: root.scrollWidth > root.clientWidth, height: root.querySelector('.dshmem-filter-bar').getBoundingClientRect().height, target: trigger?.getBoundingClientRect().height }; })()`);
    assert.equal(normal.overflow, false); assert.ok(normal.height < 300); if (cards) assert.ok(normal.target >= 44);
    await click('[aria-controls="dshmem-filter-panel"]'); await waitFor(`!!document.querySelector('[aria-label="项目筛选"]')`);
    const expanded = await evaluate(`({ position: getComputedStyle(document.querySelector('.dshmem-filter-bar')).position, overflow: document.querySelector('.dshmem-root').scrollWidth > document.querySelector('.dshmem-root').clientWidth })`);
    assert.equal(expanded.position, 'static'); assert.equal(expanded.overflow, false);
    narrow.push({ width, normal, expanded }); await click('[aria-controls="dshmem-filter-panel"]');
  }
  assert.deepEqual(jsErrors, []); assert.deepEqual(memoryWrites, []);
  console.log(JSON.stringify({ tabs, cards, details, data, narrow, jsErrors, memoryWrites }, null, 2));
} catch (error) {
  console.error('Browser check not completed: ' + error.message); process.exitCode = 1;
} finally {
  clearTimeout(watchdog); failPending(new Error('Browser check ended')); try { ws?.close(); } catch {}
  if (tab?.id) await fetch(cdp + '/json/close/' + encodeURIComponent(tab.id), { signal: AbortSignal.timeout(3000) }).catch(() => {});
}
