// Headless Chrome CDP verification for the dsh-memory client plugin.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const URL = process.argv[2] || process.env.PAGE_URL;
const PROFILE = 'D:\\Documents\\Temp\\chrome-dsh-profile';

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--remote-allow-origins=*',
  '--user-data-dir=' + PROFILE, '--window-size=1440,900', 'about:blank',
], { detached: true, stdio: 'ignore' });
chrome.unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitVersion() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('chrome devtools not ready');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); }
    } else {
      events.push(msg);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ws, ready, send, events };
}

const main = async () => {
  await waitVersion();
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json();
  const { ready, send } = connect(tab.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(6000);

  const text = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  const body = await text('document.body.innerText');
  console.log('--- body text (first 1200) ---');
  console.log(String(body).slice(0, 1200));

  const hasEntry = await text(`[...document.querySelectorAll('button,a,div')].some(e => e.innerText && e.innerText.trim() === '记忆')`);
  console.log('sidebar entry present:', hasEntry);

  await text(`(() => { const el = [...document.querySelectorAll('button,a,div')].find(e => e.innerText && e.innerText.trim() === '记忆'); if (el) el.click(); return !!el; })()`);
  await sleep(1500);

  const panel = await text('document.body.innerText');
  console.log('--- after click (first 1500) ---');
  console.log(String(panel).slice(0, 1500));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('D:\\Dev\\Projects\\Personal\\dsh-plugin\\dsh-memory-manager\\verify-shot.png', Buffer.from(shot.data, 'base64'));
  console.log('screenshot saved');

  await send('Browser.close').catch(() => {});
  process.exit(0);
};

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
