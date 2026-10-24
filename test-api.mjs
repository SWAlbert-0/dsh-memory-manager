// End-to-end API test for dsh-memory against the isolated test instance.
const BASE = process.env.BASE || 'http://127.0.0.1:56001';
const TOKEN = process.env.TOKEN;

async function login() {
  const res = await fetch(`${BASE}/?token=${TOKEN}`, { redirect: 'manual' });
  const cookie = res.headers.getSetCookie?.() ?? [];
  const raw = cookie.map((c) => c.split(';')[0]).join('; ');
  if (!raw) throw new Error('no cookie, status ' + res.status);
  return raw;
}

async function main() {
  const cookie = await login();
  const call = async (action, payload) => {
    const res = await fetch(`${BASE}/api/memory/rpc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ action, payload }),
    });
    return { status: res.status, body: await res.json() };
  };
  const state = async () => {
    const res = await fetch(`${BASE}/api/memory/state`, { headers: { cookie } });
    return { status: res.status, body: await res.json() };
  };

  console.log('state', JSON.stringify(await state()));
  console.log('clear', JSON.stringify(await call('clear', {})));

  const a = await call('add', { text: '用户偏好靠窗座位，并且是素食者。', kind: 'semantic', tags: ['旅行', '饮食'], importance: 4 });
  console.log('add1', JSON.stringify(a));
  const b = await call('add', { text: '用户在 TechCorp 担任高级软件工程师。', category: 'work', subcategory: 'position', key: 'title', value: '高级软件工程师', tags: ['工作'], importance: 5 });
  console.log('add2', JSON.stringify(b));

  const s = await call('search', { query: '靠窗 座位' });
  console.log('search', JSON.stringify(s));

  console.log('settings', JSON.stringify(await call('settings', { strategy: 'advanced', inject: true, maxInject: 3 })));

  const adv = await call('add', {
    text: '张医生是用户父亲的牙科医生。',
    category: 'health', subcategory: 'doctor', key: 'dentist',
    value: '张医生',
    person: '张医生', relationship: '用户父亲的牙科医生',
    backstory: '2026-10 陪父亲就诊时提到',
    tags: ['健康'], importance: 5,
  });
  console.log('addAdvanced', JSON.stringify(adv));

  const st = await state();
  console.log('stateAfter', JSON.stringify({ count: st.body.memories.length, settings: st.body.settings }));

  const exp = await call('export', {});
  console.log('export', JSON.stringify({ ok: exp.body.ok, memories: exp.body.data.memories.length }));

  const imp = await call('import', { mode: 'merge', data: { version: 1, memories: [{ id: 'imported_1', text: '用户使用 DSH。', kind: 'semantic', tags: ['dsh'] }] } });
  console.log('import', JSON.stringify(imp));

  const st2 = await state();
  console.log('finalCount', st2.body.memories.length);
  console.log('finalTexts', st2.body.memories.map((m) => m.text));
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
