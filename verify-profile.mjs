import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9264;
const URL = process.argv[2];
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile-profverify';
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
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync('D:\\Documents\\Temp\\dsh-memory-plugin\\' + name, Buffer.from(s.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await sleep(5500);

console.log('llmAvailable:', await ev(`fetch('/api/memory/state',{credentials:'same-origin'}).then(r=>r.json()).then(j=>j.llmAvailable)`));

// 1. profile tab exists
await ev(`(() => { const b = document.querySelector('[aria-label="记忆"]'); if (b) b.click(); return !!b })()`);
await sleep(1200);
const tabs = await ev(`[...document.querySelectorAll('[role=tab]')].map(t => t.innerText)`);
console.log('tabs:', JSON.stringify(tabs));

// 2. click profile tab, check panel
await ev(`document.getElementById('dshmem-tab-profile').click()`);
await sleep(800);
const profileUI = await ev(`(() => { const p = document.querySelector('[role=tabpanel]'); return { hasTitle: p.innerText.includes('用户画像'), hasGenerate: p.innerText.includes('生成摘要'), hasCount: p.innerText.includes('基于'), llmWarn: p.innerText.includes('LLM 服务不可用') } })()`);
console.log('profile tab:', JSON.stringify(profileUI));

// 3. click generate (real LLM call — may take time)
console.log('generating...');
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('生成摘要')); if (b) b.click(); return !!b })()`);
await sleep(20000);
const afterGen = await ev(`(() => { const p = document.querySelector('[role=tabpanel]'); return { contentLen: (p.querySelector('.dshmem-text, [aria-label="用户画像"] div') || {}).innerText?.length || 0, hasContent: p.innerText.includes('偏好') || p.innerText.includes('环境') || p.innerText.length > 200, genTime: p.innerText.includes('生成于') } })()`);
console.log('after generate:', JSON.stringify(afterGen));
await shot('profile-generated.png');

// 4. settings: injectMode select present
await ev(`document.getElementById('dshmem-tab-settings').click()`);
await sleep(700);
const settingsUI = await ev(`(() => { const p = document.querySelector('[role=tabpanel]'); return { hasMode: p.innerText.includes('注入模式'), hasSummary: p.innerText.includes('摘要模式'), hasDetails: p.innerText.includes('明细模式'), hasHybrid: p.innerText.includes('混合模式'), hasRegen: p.innerText.includes('重新生成摘要') } })()`);
console.log('settings:', JSON.stringify(settingsUI));

// 5. simple mode toggle
await ev(`document.getElementById('dshmem-tab-list').click()`);
await sleep(500);
const toggle = await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '切换到简化视图'); if (b) { b.click(); return true } return false })()`);
await sleep(800);
const simple = await ev(`(() => { const root = document.querySelector('.dshmem-root'); return { isSimple: root.innerText.includes('用户画像'), tabsHidden: !root.querySelector('.dshmem-tabs') || getComputedStyle(root.querySelector('.dshmem-tabs')).display === 'none', hasAdd: root.innerText.includes('添加记忆'), hasToggle: root.innerText.includes('切换到完整视图') } })()`);
console.log('simple mode:', JSON.stringify(simple));
await shot('p2-simple-mode.png');
// back to full
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '切换到完整视图'); if (b) b.click(); return true })()`);
await sleep(500);
console.log('back to full:', await ev(`!!document.querySelector('.dshmem-tabs')`));

// cleanup
await send('Browser.close').catch(() => {});
process.exit(0);
