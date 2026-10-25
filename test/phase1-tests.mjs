import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { normalizeRecord, modelRecords, isCurrent, conflictingIds, selectForInjection, packRecords, DEFAULT_SETTINGS } from '../lib/shared.js';

// Synthetic data only. Every production entry point runs against temporary storage.
const root = await mkdtemp(join(tmpdir(), 'dsh-memory-phase1-'));
const oldDir = process.env.DSH_MEMORY_DIR;
const source = (await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')).replace("from './shared.js'", 'from ' + JSON.stringify(new URL('../lib/shared.js', import.meta.url).href));
let serial = 0, passed = 0, previous;
async function fixture(seed) {
  if (previous) { process.env.DSH_MEMORY_DIR = previous.dir; await previous.mod.flush(); }
  const dir = join(root, String(++serial)); await mkdir(dir); process.env.DSH_MEMORY_DIR = dir;
  if (seed) await writeFile(join(dir, 'memory.json'), JSON.stringify(seed));
  const mod = await import('data:text/javascript;base64,' + Buffer.from(source + `\nexport { loadState, flush, handleRpc, projectForSession, extractMemories, profileFingerprint, usableProfile }; // ${serial}`).toString('base64'));
  const tools = new Map(), events = new Map(), routes = new Map(), live = new Map();
  const ctx = { tools: { register(t) { tools.set(t.name, t); } }, on(name, cb) { events.set(name, cb); }, effect() {},
    sessions: { get: id => live.get(id) }, connection: { fetch: { register(r) { routes.set(r.path, r); } } } };
  mod.apply(ctx); const state = await mod.loadState();
  function session(id, cwd) {
    const s = { id, header: { cwd } }; live.set(id, s);
    const project = mod.projectForSession(s);
    return { s, exec: { agent: { id } }, project };
  }
  const a = session('session-a', '/synthetic/alpha'), b = session('session-b', '/synthetic/beta');
  const f = { dir, mod, state, ctx, events, tools, routes, a, b,
    rpc: (action, payload = {}) => mod.handleRpc({ action, payload }),
    call: (name, args = {}, owner = a) => tools.get(name).execute(args, owner.exec),
    emit: (owner, type, data, seq = 1, time = Date.now()) => events.get('session/event')(owner.s, { type, data, seq, time }),
    inject: async (query = '', owner = a) => events.get('agent/pre-step')({ agent: owner.exec.agent }, async () => ({ kind: 'enter', messages: query ? [{ role: 'user', content: [{ type: 'text', text: query }], source: { kind: 'user' } }] : [] })),
  };
  previous = { dir, mod }; return f;
}
const rec = (id, text, more = {}) => normalizeRecord({ id, text, ...more });
const injectedText = decision => decision.messages.filter(m => m.source?.kind === 'memory').map(m => m.content[0].text).join('\n');
async function test(name, run) { await run(); passed++; console.log('PASS ' + name); }
try {
  await test('C3-01 stable project identity and fail-closed legacy migration', async () => {
    const f = await fixture();
    assert.equal(f.mod.projectForSession({ header: { cwd: 'C:\\Work\\Repo\\' } }).id, f.mod.projectForSession({ header: { cwd: 'c:/work/repo' } }).id);
    assert.equal(f.mod.projectForSession({ header: { cwd: 'relative' } }), null);
    f.state.memories = [rec('global', 'shared global'), rec('a', 'alpha project', { scope: 'project', projectId: f.a.project.id, pinned: true }), rec('b', 'beta project', { scope: 'project', projectId: f.b.project.id, pinned: true }), rec('legacy', 'unbound project', { scope: 'project' })];
    for (const owner of [f.a, f.b]) {
      const rows = (await f.call('memory_list', {}, owner)).memories;
      assert.deepEqual(rows.map(r => r.id).sort(), ['global', owner === f.a ? 'a' : 'b'].sort());
      const text = injectedText(await f.inject('', owner));
      assert.ok(!text.includes(owner === f.a ? 'beta project' : 'alpha project')); assert.ok(!text.includes('unbound'));
    }
    assert.equal((await f.call('memory_forget', { id: 'b' })).ok, false);
    assert.equal((await f.tools.get('memory_write').execute({ text: 'unknown', scope: 'project' })).ok, false);
    assert.equal((await f.rpc('state')).memories.length, 4);
    assert.equal((await f.rpc('update', { id: 'legacy', patch: { projectId: f.a.project.id } })).ok, true);
    assert.ok((await f.call('memory_list')).memories.some(r => r.id === 'legacy'));
  });
  await test('C3-01 every model exit shares project/hidden/status/temporal filtering', async () => {
    const f = await fixture(); const now = Date.now();
    f.state.settings.injectMode = 'details';
    f.state.memories = [rec('ok', 'shared current'), rec('other', 'OTHER_SENTINEL', { scope: 'project', projectId: f.b.project.id }),
      rec('hidden', 'HIDDEN_SENTINEL', { visibility: 'hidden', pinned: true }), rec('expired', 'EXPIRED_SENTINEL', { validUntil: now - 1 }),
      rec('future', 'FUTURE_SENTINEL', { validFrom: now + 60000 }), rec('historical', 'HISTORICAL_SENTINEL', { status: 'historical' }),
      rec('conflict', 'CONFLICT_SENTINEL', { status: 'conflict' }), rec('super', 'SUPERSEDED_SENTINEL', { status: 'superseded', supersededBy: 'ok' })];
    assert.deepEqual((await f.call('memory_list')).memories.map(r => r.id), ['ok']);
    assert.equal((await f.call('memory_search', { query: 'SENTINEL' })).memories.length, 0);
    assert.ok(!injectedText(await f.inject()).includes('SENTINEL'));
    let prompt = '';
    await f.mod.extractMemories({ llm: { stream: async function* (input) { prompt = input.messages[0].content[0].text; yield { kind: 'text-delta', text: '{"candidates":[]}' }; } } }, '用户：新事实', { extractProvider: 'test', extractModel: 'test' }, { projectId: f.a.project.id });
    assert.ok(prompt.includes('shared current')); assert.ok(!prompt.includes('SENTINEL'));
  });
  await test('C3-02 candidate confirmation, export and reload preserve source evidence', async () => {
    const f = await fixture(); f.state.settings.autoCaptureInterval = 1; f.state.settings.extractProvider = 'test'; f.state.settings.extractModel = 'test';
    f.ctx.llm = { stream: async function* () { yield { kind: 'text-delta', text: JSON.stringify({ candidates: [{ text: 'alpha uses SQLite', kind: 'semantic', scope: 'project', tags: ['db'], evidence: '本项目使用 SQLite' }] }) }; } };
    f.emit(f.a, 'user/message', { id: 'message-17', source: { kind: 'user' }, content: [{ type: 'text', text: '本项目使用 SQLite' }] }, 17, 1770000000000);
    f.emit(f.a, 'turn/end', { turn: 1 }); await delay(40);
    const candidate = (await f.rpc('state')).pending[0]; assert.ok(candidate);
    assert.equal(candidate.projectId, f.a.project.id);
    const approved = await f.rpc('approve', { id: candidate.id }); assert.equal(approved.ok, true);
    const memory = (await f.rpc('export')).data.memories[0];
    assert.equal(memory.evidence, '本项目使用 SQLite'); assert.equal(memory.sourceSessionId, 'session-a'); assert.equal(memory.sourceMessageId, 'message-17'); assert.equal(memory.sourceEventSeq, 17); assert.equal(memory.observedAt, 1770000000000); assert.equal(memory.confirmation, 'user-approved');
    await f.mod.flush(); const saved = JSON.parse(await readFile(join(f.dir, 'memory.json'), 'utf8')); assert.equal(saved.memories[0].evidence, memory.evidence);
    const restored = await fixture(saved); assert.equal((await restored.call('memory_list')).memories[0].sourceMessageId, 'message-17');
  });
  await test('C3-02 direct Agent writes cannot forge a user quote', async () => {
    const f = await fixture();
    f.emit(f.a, 'user/message', { id: 'm', content: [{ type: 'text', text: '我喜欢茶' }] }, 3);
    const result = await f.call('memory_write', { text: '用户喜欢茶', evidence: '我喜欢茶' }); assert.equal(result.ok, true);
    assert.equal(f.state.memories[0].sourceMessageId, 'm');
    await assert.rejects(() => f.call('memory_write', { text: 'wrong', evidence: '不存在的原句' }), /evidence/);
    assert.equal(f.state.memories.length, 1);
  });
  await test('C3-02 consolidation retains all evidence and hidden lineage cannot leak', async () => {
    const f = await fixture();
    f.state.memories = [rec('one', 'same fact', { tags: ['one'], evidence: '原句一' }), rec('two', 'same fact', { tags: ['two'], evidence: '原句二' })];
    assert.equal((await f.rpc('merge-duplicates', { keepId: 'one', otherIds: ['two'], mergeTags: true })).ok, true);
    assert.equal(f.state.memories[1].status, 'historical'); assert.equal(f.state.memories[1].evidence, '原句二'); assert.equal(f.state.memories[0].evidenceRefs[0].recordId, 'two');
    assert.equal((await f.call('memory_list')).memories.length, 1);
    await f.rpc('update', { id: 'two', patch: { visibility: 'hidden' } }); assert.equal((await f.call('memory_list')).memories.length, 0);
    assert.ok(!injectedText(await f.inject()).includes('same fact'));
  });
  await test('C3-03 effective intervals, patch validation and condition preservation', async () => {
    const f = await fixture(); const now = Date.now();
    const r = rec('timed', 'valid', { validFrom: now, validUntil: now + 1000, conditions: '仅工作日', person: '父亲' });
    assert.equal(isCurrent(r, now - 1), false); assert.equal(isCurrent(r, now), true); assert.equal(isCurrent(r, now + 1000), false);
    assert.throws(() => normalizeRecord({ validUntil: now - 1 }, r), /validUntil/);
    f.state.memories = [r]; const row = (await f.call('memory_list')).memories[0]; assert.ok(row.rendered.includes('仅工作日')); assert.ok(row.rendered.includes('父亲'));
  });
  await test('C3-03 unresolved structured conflicts are withheld, not newest-wins', async () => {
    const f = await fixture();
    f.state.memories = [rec('old', '住北京', { category: 'personal', key: 'city', value: '北京' }), rec('new', '住上海', { category: 'personal', key: 'city', value: '上海' })];
    assert.equal(conflictingIds(f.state.memories).size, 2); assert.equal((await f.call('memory_list')).memories.length, 0);
    assert.equal((await f.rpc('supersede', { oldId: 'old', newId: 'new' })).ok, true);
    assert.equal(f.state.memories[0].status, 'superseded'); assert.deepEqual((await f.call('memory_list')).memories.map(r => r.id), ['new']);
    assert.equal((await f.rpc('export')).data.memories.length, 2);
    await f.rpc('update', { id: 'new', patch: { visibility: 'hidden' } }); assert.equal((await f.call('memory_list')).memories.length, 0); // No fallback to obsolete address.
  });
  await test('C3-03 subjects, conditions and projects do not create false conflicts', async () => {
    const f = await fixture(); const base = { category: 'food', key: 'spice' };
    f.state.memories = [rec('me', '喜欢辣', { ...base, value: '辣', person: '本人' }), rec('dad', '不吃辣', { ...base, value: '不辣', person: '父亲' }), rec('weekend', '周末清淡', { ...base, value: '清淡', person: '本人', conditions: '周末' })];
    assert.equal(conflictingIds(f.state.memories).size, 0); assert.equal((await f.call('memory_list')).memories.length, 3);
    assert.equal((await f.rpc('supersede', { oldId: 'dad', newId: 'me' })).ok, false);
  });
  await test('C3-01/03 scoped profile manifests invalidate on expiry and edits', async () => {
    const f = await fixture(); f.state.memories = [rec('g', 'global tea'), rec('a', 'alpha db', { scope: 'project', projectId: f.a.project.id }), rec('b', 'BETA_SECRET', { scope: 'project', projectId: f.b.project.id })];
    const projectRead = await f.call('memory_list');
    const globalRead = await f.call('memory_list', { scope: 'global' });
    const revision = projectRead.revision;
    assert.equal((await f.call('memory_update_profile', { scope: 'global', content: 'global profile', basedOnRevision: revision, basedOnSnapshot: globalRead.snapshot, sourceIds: ['g'] })).ok, true);
    assert.deepEqual(f.state.profile.sourceIds, ['g']);
    assert.equal((await f.call('memory_update_profile', { scope: 'project', content: 'alpha profile', basedOnRevision: revision, basedOnSnapshot: projectRead.snapshot, sourceIds: ['a', 'g'] })).ok, true);
    assert.deepEqual(f.state.profiles[f.a.project.id].sourceIds.sort(), ['a', 'g']);
    assert.ok(injectedText(await f.inject('', f.a)).includes('alpha profile')); assert.ok(!injectedText(await f.inject('', f.b)).includes('alpha profile'));
    await f.rpc('update', { id: 'a', patch: { validUntil: Date.now() - 1 } }); assert.equal(f.mod.usableProfile(f.a.project.id).stale, true);
    const currentRead = await f.call('memory_list');
    const current = currentRead.revision;
    await f.call('memory_update_profile', { scope: 'project', content: 'clean', basedOnRevision: current, basedOnSnapshot: currentRead.snapshot, sourceIds: ['g'] });
    const fp = f.state.profiles[f.a.project.id].fingerprint;
    f.state.memories[0].validUntil = Date.now() - 1; // Clock-driven effective-set change without a mutation/revision bump.
    assert.notEqual(f.mod.profileFingerprint(f.a.project.id), fp); assert.equal(f.mod.usableProfile(f.a.project.id).stale, true);
  });
  await test('C3-04 query relevance beats popularity and injection counters do not self-reinforce', async () => {
    const f = await fixture(); f.state.settings.injectMode = 'details'; f.state.settings.maxInject = 1;
    f.state.memories = [rec('popular', 'gardening flowers', { importance: 5 }), rec('relevant', 'SQLite database migration', { importance: 2 })];
    f.state.memories[0].useCount = 100000;
    const text = injectedText(await f.inject('SQLite database'));
    assert.ok(text.includes('SQLite')); assert.ok(!text.includes('gardening'));
    assert.equal(f.state.memories[1].useCount, 0); assert.equal(f.state.memories[1].injectionCount, 1);
    await f.call('memory_search', { query: 'SQLite' }); assert.equal(f.state.memories[1].useCount, 1);
    f.state.settings.inject = false; assert.equal(injectedText(await f.inject('SQLite')), '');
  });
  await test('C3-04 budgets omit whole facts instead of truncating qualifications', async () => {
    const f = await fixture();
    const rows = [rec('long', 'x'.repeat(500), { conditions: '不得用于生产环境' }), rec('short', 'short complete fact')];
    const packed = packRecords(rows, DEFAULT_SETTINGS, 100);
    assert.deepEqual(packed.rows.map(r => r.id), ['short']); assert.equal(packed.omitted, 1); assert.ok(!packed.text.includes('xxx'));
    assert.equal(selectForInjection(rows, 'no-match', 6).length, 0);
  });
  await test('C3 schema v1, metadata import/export and summary compatibility remain safe', async () => {
    const f = await fixture({ version: 1, memories: [{ id: 'legacy', text: 'legacy', scope: 'project' }], profile: { content: 'UNSCOPED_OLD_PROFILE', stale: false, generatedAt: Date.now() } });
    assert.equal(f.state.version, 1); assert.equal(f.state.profile.stale, true); assert.equal(f.state.memories[0].projectId, undefined);
    assert.equal(injectedText(await f.inject()), '');
    const preview = await f.rpc('preview-import', { data: [{ ...f.state.memories[0] }] }); assert.equal(preview.preview.keptCount, 1);
  });
  await test('audit retained injections are replaced on active surface without deleting audit history', async () => {
    const f = await fixture(); f.state.settings.injectMode = 'details'; f.state.memories = [rec('secret', 'OLD_INJECTION_SENTINEL', { pinned: true })];
    const log = [], nodes = [];
    Object.assign(f.a.s, { surface: { nodes }, eventAt: seq => log[seq], append(type, data, intent) {
      assert.ok(data.id && data.role === 'user'); const event = { type, data, seq: log.length, time: Date.now() }; log.push(event);
      if (intent.surfaceOp?.op === 'replace') { const i = nodes.indexOf(intent.surfaceOp.startSeq); assert.ok(i >= 0); nodes.splice(i, 1, event.seq); } else nodes.push(event.seq);
      f.a.s.seq = log.length; return event;
    } });
    const first = await f.inject(); const snapshot = first.messages.find(m => m.source?.kind === 'memory');
    f.a.s.append('user/message', snapshot, { surfaceOp: 'append' });
    await f.rpc('update', { id: 'secret', patch: { visibility: 'hidden' } });
    assert.equal(injectedText(await f.inject()), '');
    assert.ok(log.some(e => JSON.stringify(e).includes('OLD_INJECTION_SENTINEL'))); // Append-only original retained.
    assert.ok(nodes.every(seq => !JSON.stringify(log[seq]).includes('OLD_INJECTION_SENTINEL')));
    const count = log.length; await f.inject(); assert.equal(log.length, count); // Tombstones are not replaced repeatedly.
  });
  await test('audit queued current prompt wins over previous committed user message', async () => {
    const f = await fixture(); f.state.settings.injectMode = 'details'; f.state.settings.maxInject = 1;
    f.state.memories = [rec('garden', 'gardening flowers'), rec('db', 'SQLite database')];
    f.emit(f.a, 'user/message', { id: 'previous', content: [{ type: 'text', text: 'gardening flowers' }] });
    const text = injectedText(await f.inject('SQLite database')); assert.ok(text.includes('SQLite')); assert.ok(!text.includes('gardening'));
  });
  await test('audit draft/global/project profiles require matching scope snapshots for injection', async () => {
    const f = await fixture(); f.state.memories = [rec('g', 'global'), rec('a', 'ALPHA_PRIVATE', { scope: 'project', projectId: f.a.project.id })];
    const mixed = await f.call('memory_list');
    assert.equal((await f.call('memory_update_profile', { content: 'ALPHA_PRIVATE', basedOnRevision: mixed.revision, sourceIds: ['a'], basedOnSnapshot: mixed.snapshot })).ok, false);
    assert.equal((await f.call('memory_update_profile', { content: 'ALPHA_PRIVATE', basedOnRevision: mixed.revision, basedOnSnapshot: mixed.snapshot, sourceIds: ['g'] })).error, 'profile-outdated');
    const draft = await f.call('memory_update_profile', { content: 'UNVERIFIED_DRAFT', basedOnRevision: mixed.revision });
    assert.equal(draft.ok, true); assert.equal(draft.stale, true); assert.equal(f.mod.usableProfile().stale, true);
    const global = await f.call('memory_list', { scope: 'global' });
    const valid = await f.call('memory_update_profile', { content: 'global only', basedOnRevision: global.revision, basedOnSnapshot: global.snapshot, sourceIds: ['g'] });
    assert.equal(valid.ok, true); assert.equal(valid.stale, false);
  });
  await test('audit scoped snapshot tokens cannot be reused after module reload', async () => {
    let f = await fixture(); f.state.memories = [rec('g', 'fact')];
    const old = await f.call('memory_list', { scope: 'global' }); const exported = (await f.rpc('export')).data;
    f = await fixture(exported); const current = await f.call('memory_list', { scope: 'global' });
    assert.equal(old.revision, current.revision); assert.notEqual(old.snapshot, current.snapshot);
    const result = await f.call('memory_update_profile', { content: 'obsolete', basedOnRevision: old.revision, basedOnSnapshot: old.snapshot, sourceIds: ['g'] });
    assert.equal(result.error, 'profile-outdated'); assert.equal(f.state.profile.content, '');
  });
  await test('audit derived records inherit explicit and inferred source conflicts', async () => {
    const f = await fixture();
    f.state.memories = [rec('one', 'Beijing', { category: 'home', key: 'city', value: 'Beijing' }), rec('two', 'Shanghai', { category: 'home', key: 'city', value: 'Shanghai' }), rec('derived', 'derived Beijing', { evidenceRefs: [{ recordId: 'one' }] })];
    assert.equal((await f.call('memory_list')).memories.length, 0);
    await f.rpc('update', { id: 'one', patch: { status: 'conflict' } });
    const ids = (await f.call('memory_list')).memories.map(r => r.id); assert.deepEqual(ids, ['two']);
  });
  await test('audit structured fact edits mark provenance as edited and retain original quote', async () => {
    const f = await fixture(); f.state.memories = [rec('fact', 'doctor', { value: 'dentist', evidence: '用户的牙医', confirmation: 'user-approved' })];
    await f.rpc('update', { id: 'fact', patch: { value: 'cardiologist', conditions: '父亲就诊' } });
    assert.equal(f.state.memories[0].confirmation, 'user-edited'); assert.equal(f.state.memories[0].evidence, '用户的牙医');
  });
  await test('audit reload rejects missing or empty profile evidence despite retained verification metadata', async () => {
    let f = await fixture(); f.state.memories = [rec('g', 'public fact')];
    const read = await f.call('memory_list', { scope: 'global' });
    await f.call('memory_update_profile', { content: 'PROFILE_SOURCE_SENTINEL', basedOnRevision: read.revision, basedOnSnapshot: read.snapshot, sourceIds: ['g'] });
    const serialized = (await f.rpc('export')).data;
    for (const missing of [true, false]) {
      const seed = structuredClone(serialized); if (missing) delete seed.profile.sourceIds; else seed.profile.sourceIds = [];
      f = await fixture(seed); assert.equal(f.mod.usableProfile().stale, true); assert.equal(f.mod.usableProfile().verified, false);
      const result = await f.events.get('agent/pre-step')({ agent: {} }, async () => ({ kind: 'enter', messages: [] }));
      assert.ok(!injectedText(result).includes('PROFILE_SOURCE_SENTINEL'));
    }
  });
  console.log(`\n${passed}/${passed} phase-one integration checks passed`);
} finally {
  if (previous) { process.env.DSH_MEMORY_DIR = previous.dir; await previous.mod.flush(); }
  if (oldDir === undefined) delete process.env.DSH_MEMORY_DIR; else process.env.DSH_MEMORY_DIR = oldDir;
  assert.ok(root.startsWith(join(tmpdir(), 'dsh-memory-phase1-'))); await rm(root, { recursive: true, force: true });
}
