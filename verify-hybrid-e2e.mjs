import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9261;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-hybrid-e2e';
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
const rpc = (action, payload) => ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:${JSON.stringify(action)},payload:${JSON.stringify(payload)}})}).then(r=>r.json())`);
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);

// 1. set global enhanced + rule tag=混合 → simple
console.log('set global+rules:', JSON.stringify(await rpc('settings', { strategy: 'enhanced', strategyRules: [{ field: 'tag', value: '混合策略测试', strategy: 'simple' }] })));

// 2. three records
const r1 = await rpc('add', { text: '混合测试：无覆盖，命中规则。', kind: 'semantic', tags: ['混合策略测试'], importance: 3 });
const r2 = await rpc('add', { text: '混合测试：覆盖为 advanced。', kind: 'semantic', tags: ['混合策略测试'], strategy: 'advanced', importance: 3 });
const r3 = await rpc('add', { text: '混合测试：无覆盖，无规则命中。', kind: 'semantic', importance: 3 });

// 3. search → check resolved strategies
const found = await rpc('search', { query: '混合测试' });
const results = (found.memories || []).map(m => ({ text: m.text?.slice(6, 14), strategy: m.strategy, rendered: m.rendered }));
console.log('resolved:', JSON.stringify(results, null, 2));
const byStrategy = Object.fromEntries(results.map(r => [r.text, r.strategy]));
console.log('checks:', {
  ruleHit: byStrategy['无覆盖，命中'] === 'simple',
  override: byStrategy['覆盖为 advanced'] === 'advanced',
  globalDefault: byStrategy['无规则命中'] === 'enhanced',
});

// 4. invalid rules rejected
const invalid = await rpc('settings', { strategyRules: [{ field: 'bad', value: 'x', strategy: 'simple' }] });
console.log('invalid-rules rejected:', invalid.ok === false && invalid.error === 'invalid-rules');

// 5. UI checks
await send('Page.reload'); await sleep(5500);
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const ui = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  const strategyChips = [...root.querySelectorAll('.dshmem-tag')].map(x => x.innerText).filter(x => !x.startsWith('#'));
  const ruleEditor = root.innerText.includes('混合策略规则');
  const stratLabel = root.innerText.includes('本记录格式');
  return { strategyChips, ruleEditor, stratLabel };
})()`);
console.log('UI:', JSON.stringify(ui));

// open settings tab to confirm rule editor UI
await ev(`document.getElementById('dshmem-tab-settings').click()`);
await sleep(700);
const settingsUI = await ev(`(() => {
  const root = document.querySelector('.dshmem-root');
  return {
    hasRuleEditor: root.innerText.includes('混合策略规则'),
    hasAddRule: [...root.querySelectorAll('button')].some(b => b.innerText.trim() === '添加规则'),
    hasGlobalLabel: root.innerText.includes('全局默认策略'),
  };
})()`);
console.log('settings UI:', JSON.stringify(settingsUI));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\hybrid-settings-light.png', Buffer.from(shot.data, 'base64'));

// 6. cleanup
const cleaned = await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(async j => { const ids = j.memories.filter(m => (m.tags||[]).includes('混合策略测试')).map(m=>m.id); for (const id of ids) await fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',payload:{id}})}); return ids.length })`);
console.log('cleanup:', cleaned);
await ev(`fetch('/api/memory/rpc',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'settings',payload:{strategyRules:[]}})})`);
await send('Browser.close').catch(() => {});
process.exit(0);
