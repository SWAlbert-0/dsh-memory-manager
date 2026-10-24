import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// No host connection, no HTTP listener, no access to the live store.
const root = await mkdtemp(join(tmpdir(), 'dsh-memory-p0-'));
const previousDir = process.env.DSH_MEMORY_DIR;
process.env.DSH_MEMORY_DIR = root;
const source = (await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')).replace("from './shared.js'", 'from ' + JSON.stringify(new URL('../lib/shared.js', import.meta.url).href));
const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
const instances = [];
let serial = 0;
let passed = 0;

async function isolated(seed, instrument = false) {
  // storeDir reads the environment dynamically: drain the previous instance
  // before switching directories so a debounce cannot write into the next fixture.
  const previous = instances.at(-1);
  if (previous) {
    process.env.DSH_MEMORY_DIR = previous.dir;
    await previous.probe.flush();
  }
  const dir = join(root, String(++serial));
  await mkdir(dir);
  if (seed !== undefined) await writeFile(join(dir, 'memory.json'), typeof seed === 'string' ? seed : JSON.stringify(seed));
  process.env.DSH_MEMORY_DIR = dir;
  // Expose internals only in an in-memory module; production exports stay unchanged.
  let code = source;
  if (instrument) code = code.replace('async function persist() {', 'async function persistImpl() {');
  code += `\nexport const probe = {
    validateRecord, normalizeRecord, loadState, digest, scheduleSave, flush, persist,
    handleRpc, extractMemories, registerCapture, registerTools, registerRoutes,
    stateView, getState: () => state, setPending: (rows) => { pendingCaptures = rows; },
    getPending: () => pendingCaptures,
  };\n// isolated instance ${serial}\n`;
  if (instrument) code += `
    let activeWrites = 0, maxWrites = 0, writes = 0;
    let releaseWrite, enteredWrite;
    const entered = new Promise((resolve) => { enteredWrite = resolve; });
    const gate = new Promise((resolve) => { releaseWrite = resolve; });
    async function persist() {
      activeWrites++; maxWrites = Math.max(maxWrites, activeWrites); writes++;
      try {
        if (writes === 1) { enteredWrite(); await gate; }
        return await persistImpl();
      } finally { activeWrites--; }
    }
    export const ioProbe = { entered, release: () => releaseWrite(), stats: () => ({ maxWrites, writes }) };
  `;
  const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  instances.push({ dir, probe: mod.probe, ioProbe: mod.ioProbe });
  await mod.probe.loadState();
  return { ...mod, dir };
}
async function test(label, run) {
  await run();
  passed++;
  console.log('PASS ' + label);
}
function host() {
  const tools = new Map(), routes = new Map(), events = new Map(), effects = [];
  return { tools: { register: (t) => tools.set(t.name, t) },
    connection: { fetch: { register: (r) => routes.set(r.path, r) } },
    on: (event, cb) => events.set(event, cb), effect: (cb) => effects.push(cb()),
    registeredTools: tools, routes, events, effects };
}
const rpc = (probe, action, payload = {}) => probe.handleRpc({ action, payload });
const record = (probe, id, text = id, extra = {}) => probe.normalizeRecord({ id, text, ...extra });

try {
  await test('R02 stale summary/hybrid fall back to details, fresh summary still works', async () => {
    const { probe } = await isolated();
    const s = probe.getState();
    const rows = [record(probe, 'visible')];
    for (const injectMode of ['summary', 'hybrid', 'details']) {
      const { text } = probe.digest(rows, { ...s.settings, injectMode }, { content: 'FORGOTTEN_SECRET', stale: true });
      assert.ok(!text.includes('FORGOTTEN_SECRET'));
      assert.ok(!text.includes('<user-profile>'));
      assert.ok(text.includes('visible'));
    }
    assert.ok(probe.digest(rows, s.settings, { content: 'FRESH_SUMMARY', stale: false }).text.includes('FRESH_SUMMARY'));
  });
  await test('R02 delete and forget mark profile stale and remove facts from injection', async () => {
    const { probe } = await isolated();
    const s = probe.getState();
    s.memories = [record(probe, 'deleted', 'deleted fact'), record(probe, 'remaining')];
    s.profile = { content: 'deleted fact', stale: false };
    await rpc(probe, 'delete', { id: 'deleted' });
    assert.equal(s.profile.stale, true);
    assert.ok(!probe.digest(s.memories, s.settings, s.profile).text.includes('deleted fact'));
    const ctx = host(); probe.registerTools(ctx);
    s.profile.stale = false;
    await ctx.registeredTools.get('memory_forget').execute({ id: 'remaining' });
    assert.equal(s.profile.stale, true);
    assert.equal(s.memories.length, 0);
  });
  await test('R03 preview counts new/update/kept/invalid and performs no mutation or write', async () => {
    const { probe, dir } = await isolated();
    const s = probe.getState();
    s.memories = [record(probe, 'same'), record(probe, 'update'), record(probe, 'untouched')];
    const before = JSON.stringify(s);
    const payload = { data: [{ id: 'same', text: 'same' }, { id: 'update', text: 'changed' }, { id: 'new', text: 'new' }, { text: 'x', kind: 'bad' }] };
    const result = await rpc(probe, 'preview-import', payload);
    assert.deepEqual(result, { ok: true, preview: { newCount: 1, updateCount: 1, keptCount: 2, invalidCount: 1, settingsChanged: false } });
    assert.equal(JSON.stringify(s), before);
    await probe.flush();
    assert.deepEqual(await readdir(dir), []);
    assert.equal((await rpc(probe, 'import', payload)).ok, false);
    assert.equal(JSON.stringify(s), before);
  });
  await test('R03 merge preview matches commit and replace snapshot is fully recoverable', async () => {
    const { probe, dir } = await isolated();
    const s = probe.getState(); s.memories = [record(probe, 'old')];
    s.profile = { content: 'profile backup', stale: false, generatedAt: 1 };
    const merge = { data: [{ id: 'new', text: 'new' }] };
    assert.equal((await rpc(probe, 'preview-import', merge)).preview.newCount, 1);
    assert.equal((await rpc(probe, 'import', merge)).count, 2);
    const before = JSON.stringify(s);
    const replace = { mode: 'replace', data: { memories: [{ id: 'replacement', text: 'replacement' }], settings: { injectMode: 'hybrid' } } };
    assert.equal((await rpc(probe, 'preview-import', replace)).preview.settingsChanged, true);
    assert.equal((await rpc(probe, 'import', replace)).count, 1);
    const backups = (await readdir(dir)).filter((f) => f.startsWith('memory.json.bak-'));
    assert.equal(backups.length, 1);
    assert.equal(await readFile(join(dir, backups[0]), 'utf8'), JSON.stringify(JSON.parse(before), null, 2));
    assert.equal(s.settings.injectMode, 'hybrid');
  });
  await test('R03 RPC and download export both include profile; snapshot import restores it stale', async () => {
    const { probe } = await isolated();
    const s = probe.getState(); s.profile = { content: 'exported profile', stale: false, generatedAt: 42 };
    const exported = await rpc(probe, 'export');
    assert.deepEqual(exported.data.profile, s.profile);
    const ctx = host(); probe.registerRoutes(ctx);
    const downloaded = await (await ctx.routes.get('/api/memory/export').fetch()).json();
    assert.deepEqual(downloaded.profile, s.profile);
    await rpc(probe, 'import', { mode: 'replace', data: exported.data });
    assert.equal(s.profile.content, 'exported profile');
    assert.equal(s.profile.stale, true);
  });
  await test('R04 extract failure preserves pending candidates', async () => {
    const { probe } = await isolated();
    const rows = [record(probe, 'candidate')]; probe.setPending(rows);
    const ctx = { llm: { stream: async () => { throw new Error('expected extraction failure'); } } };
    const result = await probe.extractMemories(ctx, 'transcript', { extractProvider: 'test', extractModel: 'test' });
    assert.equal(result.ok, false); assert.deepEqual(result.candidates, []); assert.match(result.error, /expected extraction failure/);
    assert.deepEqual(probe.getPending(), rows);
  });
  await test('R04 background capture rejection preserves queue and next capture recovers', async () => {
    const { probe } = await isolated(); const ctx = host();
    const rows = [record(probe, 'candidate')]; probe.setPending(rows);
    ctx.llm = { stream: async function* () { yield { kind: 'text-delta', text: '{"candidates":[]}' }; } };
    probe.registerCapture(ctx);
    const settings = probe.getState().settings;
    settings.autoCaptureInterval = 1;
    settings.extractProvider = 'test'; settings.extractModel = 'test';
    const session = {};
    const sendTurn = (turn) => {
      ctx.events.get('session/event')(session, { type: 'user/message', data: { content: [{ type: 'text', text: 'user' }] } });
      ctx.events.get('session/event')(session, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'reply' }] } } });
      ctx.events.get('session/event')(session, { type: 'turn/end', data: { turn } });
    };
    // Missing route returns an explicit failure; the queue must survive and recover.
    settings.extractProvider = ''; settings.extractModel = '';
    sendTurn(1); await delay(20);
    assert.deepEqual(probe.getPending(), rows);
    settings.extractProvider = 'test'; settings.extractModel = 'test';
    sendTurn(2); await delay(20);
    assert.deepEqual(probe.getPending(), rows);
    assert.ok(!client.includes('resetPendingAfterReload'));
    assert.ok(!client.includes('rpc("reject", { all: true })'));
  });
  await test('R12 schema rejects malformed records and U+FFFD without mutating inputs', async () => {
    const { probe } = await isolated();
    const invalid = [null, [], { id: '' }, { id: 2 }, { text: 2 }, { text: 'x'.repeat(5001) },
      { kind: 'bad' }, { strategy: 'bad' }, { scope: 'bad' }, { importance: 0 }, { importance: Infinity },
      { importance: '3' }, { tags: 'bad' }, { text: '\uFFFD' }, { tags: ['\uFFFD'] }, { backstory: '\uFFFD' }, { value: '\uFFFD' }];
    for (const input of invalid) {
      assert.ok(probe.validateRecord(input).length > 0);
      assert.throws(() => probe.normalizeRecord(input));
    }
    const valid = { text: 'ok', scope: 'global', strategy: '', tags: ['a'] };
    const snapshot = JSON.stringify(valid);
    assert.deepEqual(probe.validateRecord(valid), []);
    assert.equal(JSON.stringify(valid), snapshot);
  });
  await test('R12 load skips invalid records, preserving valid record metadata', async () => {
    const { probe } = await isolated({ memories: [{ id: 'valid', text: 'ok', createdAt: 123 }, { text: 'x', kind: 'bad' }, null, { text: '\uFFFD' }] });
    assert.deepEqual(probe.getState().memories, [{ id: 'valid', text: 'ok', createdAt: 123 }]);
    assert.equal(probe.getState()._loadError, undefined);
  });
  await test('R12 settings validation shared by RPC/import/load; invalid import is atomic', async () => {
    const { probe } = await isolated();
    const s = probe.getState(); const before = JSON.stringify(s);
    assert.equal((await rpc(probe, 'settings', { strategyRules: [{ field: 'bad', value: 'v', strategy: 'simple' }] })).ok, false);
    assert.equal((await rpc(probe, 'settings', { injectMode: 'bad' })).ok, false);
    await assert.rejects(rpc(probe, 'import', { mode: 'replace', data: { memories: [], settings: { strategyRules: 'bad' } } }));
    assert.equal(JSON.stringify(s), before);
    const result = await rpc(probe, 'settings', { maxInject: 999, maxInjectChars: 1, pinnedBudget: -1, entryPlacement: 'bad' });
    assert.equal(result.settings.maxInject, 50); assert.equal(result.settings.maxInjectChars, 200);
    assert.equal(result.settings.pinnedBudget, 1); assert.equal(result.settings.entryPlacement, 'both');
    const loaded = await isolated({ memories: [], settings: { injectMode: 'bad' } });
    assert.ok(loaded.probe.stateView().loadError);
  });
  await test('R13 two quick schedules coalesce and overlapping flushes serialize without data loss', async () => {
    const { probe, dir, ioProbe } = await isolated(undefined, true);
    const s = probe.getState();
    s.memories.push(record(probe, 'first')); probe.scheduleSave();
    s.memories.push(record(probe, 'second')); probe.scheduleSave();
    const firstFlush = probe.flush();
    await ioProbe.entered;
    s.memories.push(record(probe, 'third')); probe.scheduleSave();
    const secondFlush = probe.flush();
    await delay(20);
    assert.deepEqual(ioProbe.stats(), { maxWrites: 1, writes: 1 });
    ioProbe.release();
    await Promise.all([firstFlush, secondFlush]);
    assert.deepEqual(ioProbe.stats(), { maxWrites: 1, writes: 2 });
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'memory.json'), 'utf8')).memories.map((r) => r.id), ['first', 'second', 'third']);
    assert.deepEqual((await readdir(dir)).filter((f) => f.endsWith('.tmp')), []);
  });
  await test('R13 debounce timer persists and flush waits for an already queued write', async () => {
    const { probe, ioProbe, dir } = await isolated(undefined, true);
    probe.getState().memories.push(record(probe, 'timer')); probe.scheduleSave();
    await ioProbe.entered;
    let finished = false;
    const flushed = probe.flush().then(() => { finished = true; });
    await delay(20); assert.equal(finished, false);
    ioProbe.release(); await flushed;
    assert.equal(JSON.parse(await readFile(join(dir, 'memory.json'), 'utf8')).memories[0].id, 'timer');
  });
  await test('R13 malformed JSON enters read-only recovery and cannot overwrite original', async () => {
    const original = '{ broken json'; const { probe, dir } = await isolated(original);
    assert.ok(probe.stateView().loadError);
    assert.equal(await probe.persist(), false);
    await assert.rejects(rpc(probe, 'add', { text: 'must not save' }), /read-only/);
    await assert.rejects(rpc(probe, 'import', { mode: 'replace', data: [] }), /read-only/);
    const ctx = host(); probe.registerTools(ctx); probe.registerRoutes(ctx);
    await assert.rejects(ctx.registeredTools.get('memory_write').execute({ text: 'must not save' }), /read-only/);
    const res = await ctx.routes.get('/api/memory/profile').fetch(new Request('http://isolated/api/memory/profile', { method: 'POST', body: JSON.stringify({ content: 'no' }) }));
    assert.equal(res.status, 409);
    probe.scheduleSave(); await probe.flush();
    assert.equal(await readFile(join(dir, 'memory.json'), 'utf8'), original);
    assert.deepEqual(await readdir(dir), ['memory.json']);
    assert.ok(client.includes('data.loadError'));
  });
  await test('R13 non-ENOENT read failure enters recovery; missing file stays writable', async () => {
    const { probe } = await isolated();
    assert.equal(probe.getState()._loadError, undefined);
    assert.equal((await rpc(probe, 'add', { text: 'first use' })).ok, true);
    await probe.flush();
    const recovered = await isolated();
    // Reload this isolated instance from a directory-as-file to simulate a read error.
    // Use a fresh in-memory module since loadState is intentionally cached.
    await mkdir(join(recovered.dir, 'memory.json'));
    const mod = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { loadState, persist };\n// read-error').toString('base64'));
    assert.ok((await mod.loadState())._loadError);
    assert.equal(await mod.persist(), false);
  });
  await test('R01 explicit global scope overrides project and omitted scope is preserved', async () => {
    const { probe } = await isolated();
    const previous = record(probe, 'project', 'project', { scope: 'project' });
    assert.equal(probe.normalizeRecord({ scope: 'global' }, previous).scope, 'global');
    assert.equal(probe.normalizeRecord({ text: 'updated' }, previous).scope, 'project');
  });
  await test('R01 search/list scope filters isolate results; no scope retains existing behavior', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'g', 'common fact', { scope: 'global' }), record(probe, 'p', 'common fact', { scope: 'project' })];
    const ctx = host(); probe.registerTools(ctx);
    for (const name of ['memory_search', 'memory_list']) {
      const tool = ctx.registeredTools.get(name);
      assert.deepEqual(tool.parameters.properties.scope.enum, ['global', 'project']);
      for (const scope of ['global', 'project']) {
        const result = await tool.execute({ query: 'common', scope });
        assert.equal(result.memories.length, 1); assert.equal(result.memories[0].scope, scope);
      }
      assert.equal((await tool.execute({ query: 'common' })).memories.length, 2);
    }
  });
  await test('V01 digest excludes hidden records before pinned; pinned+hidden is never injected', async () => {
    const { probe } = await isolated();
    const s = probe.getState();
    const rows = [
      record(probe, 'hp', 'HIDDEN_PINNED_FACT', { pinned: true, visibility: 'hidden' }),
      record(probe, 'hr', 'HIDDEN_REGULAR_FACT', { visibility: 'hidden' }),
      record(probe, 'vp', 'VISIBLE_PINNED_FACT', { pinned: true }),
      record(probe, 'vr', 'VISIBLE_REGULAR_FACT'),
    ];
    const { text, ledger } = probe.digest(rows, { ...s.settings, injectMode: 'details' }, {});
    assert.ok(text.includes('VISIBLE_PINNED_FACT') && text.includes('VISIBLE_REGULAR_FACT'));
    assert.ok(!text.includes('HIDDEN_PINNED_FACT') && !text.includes('HIDDEN_REGULAR_FACT'));
    assert.equal(ledger.pinnedCount, 1); assert.equal(ledger.regularCount, 1);
  });
  await test('V02 pre-step never injects hidden records, including hidden pinned ones', async () => {
    const { probe, apply } = await isolated();
    const s = probe.getState();
    s.memories = [
      record(probe, 'hp', 'HIDDEN_PINNED_FACT', { pinned: true, visibility: 'hidden' }),
      record(probe, 'hr', 'HIDDEN_REGULAR_FACT', { visibility: 'hidden' }),
      record(probe, 'vr', 'VISIBLE_REGULAR_FACT'),
    ];
    s.settings.injectMode = 'details'; s.settings.maxInject = 6;
    const ctx = host(); apply(ctx);
    const decision = await ctx.events.get('agent/pre-step')({}, async () => ({ kind: 'accept', messages: [] }));
    const text = decision.messages.at(-1).content[0].text;
    assert.ok(text.includes('VISIBLE_REGULAR_FACT'));
    assert.ok(!text.includes('HIDDEN_PINNED_FACT') && !text.includes('HIDDEN_REGULAR_FACT'));
    assert.equal(decision.messages.at(-1)._memoryLedger.pinnedCount, 0);
  });
  await test('V03 memory_search and memory_list never return hidden records', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'v', 'shared fact'), record(probe, 'h', 'shared fact', { visibility: 'hidden' })];
    const ctx = host(); probe.registerTools(ctx);
    for (const name of ['memory_search', 'memory_list']) {
      const tool = ctx.registeredTools.get(name);
      const result = await tool.execute(name === 'memory_search' ? { query: 'shared' } : {});
      assert.equal(result.memories.length, 1);
      assert.equal(result.memories[0].id, 'v');
    }
  });
  await test('V04 hiding marks the profile stale and drops the summary from injection', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'secret', 'SECRET_FACT')];
    s.profile = { content: 'SUMMARY_CONTAINS_SECRET_FACT', generatedAt: 1, stale: false };
    assert.ok(probe.digest(s.memories, s.settings, s.profile).text.includes('SUMMARY_CONTAINS_SECRET_FACT'));
    const hidden = await rpc(probe, 'update', { id: 'secret', patch: { visibility: 'hidden' } });
    assert.equal(hidden.ok, true); assert.equal(s.profile.stale, true);
    const afterHide = probe.digest(s.memories, s.settings, s.profile).text;
    assert.ok(!afterHide.includes('SECRET_FACT'));
    assert.ok(!afterHide.includes('SUMMARY_CONTAINS_SECRET_FACT'));
    s.profile.stale = false;
    const shown = await rpc(probe, 'update', { id: 'secret', patch: { visibility: 'visible' } });
    assert.equal(shown.ok, true); assert.equal(s.profile.stale, true);
    assert.ok(probe.digest(s.memories, s.settings, s.profile).text.includes('SECRET_FACT'));
  });
  await test('V04b loading a store whose hidden record postdates the profile marks it stale', async () => {
    const seed = (generatedAt) => ({ memories: [{ id: 'h', text: 'H', visibility: 'hidden', updatedAt: 100 }], profile: { content: 'OLD', generatedAt, stale: false } });
    const older = await isolated(seed(50));
    assert.equal(older.probe.getState().profile.stale, true);
    const newer = await isolated(seed(200));
    assert.equal(newer.probe.getState().profile.stale, false);
  });
  await test('V05 extraction context omits hidden facts', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'h', 'HIDDEN_EXTRACT_FACT', { visibility: 'hidden' }), record(probe, 'v', 'VISIBLE_EXTRACT_FACT')];
    let prompt = '';
    const ctx = { llm: { stream: async function* (input) {
      prompt = input.messages[0].content[0].text;
      yield { kind: 'text-delta', text: '{"candidates":[]}' };
    } } };
    const result = await probe.extractMemories(ctx, '用户：测试', { extractProvider: 'test', extractModel: 'test' });
    assert.equal(result.ok, true);
    assert.ok(prompt.includes('VISIBLE_EXTRACT_FACT'));
    assert.ok(!prompt.includes('HIDDEN_EXTRACT_FACT'));
  });
  await test('V06 visibility validation, default, patch semantics and import/export persistence', async () => {
    const { probe } = await isolated();
    assert.ok(probe.validateRecord({ text: 'x', visibility: 'bad' }).length > 0);
    assert.deepEqual(probe.validateRecord({ text: 'x', visibility: 'hidden' }), []);
    assert.equal(probe.normalizeRecord({ text: 'x' }).visibility, 'visible');
    const hidden = probe.normalizeRecord({ text: 'x', visibility: 'hidden' });
    assert.equal(probe.normalizeRecord({ text: 'y' }, hidden).visibility, 'hidden');
    assert.equal(probe.normalizeRecord({ visibility: 'visible' }, hidden).visibility, 'visible');
    const imported = await rpc(probe, 'import', { data: [{ id: 'old', text: 'old' }, { id: 'hid', text: 'hid', visibility: 'hidden' }] });
    assert.equal(imported.ok, true);
    const s = probe.getState();
    assert.equal(s.memories.find((r) => r.id === 'old').visibility, 'visible');
    assert.equal(s.memories.find((r) => r.id === 'hid').visibility, 'hidden');
    const exported = await rpc(probe, 'export');
    assert.equal(exported.data.memories.find((r) => r.id === 'hid').visibility, 'hidden');
  });
  await test('V06b merge preview treats a missing visibility as visible (no false updates)', async () => {
    const { probe } = await isolated();
    const legacy = record(probe, 'legacy', 'legacy');
    delete legacy.visibility;
    probe.getState().memories = [legacy];
    const preview = await rpc(probe, 'preview-import', { data: [{ ...legacy }] });
    assert.deepEqual(preview.preview, { newCount: 0, updateCount: 0, keptCount: 1, invalidCount: 0, settingsChanged: false });
    const hiddenPreview = await rpc(probe, 'preview-import', { data: [{ ...legacy, visibility: 'hidden' }] });
    assert.equal(hiddenPreview.preview.updateCount, 1);
  });
  await test('V11 stale profile update requires the current revision', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'fact', 'PROFILE_FACT')];
    s.profile = { content: 'OLD_PROFILE', generatedAt: 1, stale: false };
    const ctx = host(); probe.registerTools(ctx); probe.registerRoutes(ctx);
    const list = ctx.registeredTools.get('memory_list');
    const update = ctx.registeredTools.get('memory_update_profile');
    const base = (await list.execute({})).revision;
    await rpc(probe, 'update', { id: 'fact', patch: { visibility: 'hidden' } });
    assert.equal(s.profile.stale, true);
    const staleRevision = await update.execute({ content: 'LEAK_PROFILE', basedOnRevision: base });
    assert.equal(staleRevision.ok, false); assert.equal(staleRevision.error, 'profile-outdated');
    assert.equal(s.profile.content, 'OLD_PROFILE'); assert.equal(s.profile.stale, true);
    const missing = await update.execute({ content: 'LEAK_PROFILE' });
    assert.equal(missing.ok, false); assert.equal(missing.error, 'profile-outdated');
    const current = (await list.execute({})).revision;
    assert.ok(current > base);
    const accepted = await update.execute({ content: 'CLEAN_PROFILE', basedOnRevision: current });
    assert.equal(accepted.ok, true); assert.equal(s.profile.stale, false); assert.equal(s.profile.content, 'CLEAN_PROFILE');
    const res = await ctx.routes.get('/api/memory/profile').fetch(new Request('http://isolated/api/memory/profile', { method: 'POST', body: JSON.stringify({ content: 'HTTP_LEAK', basedOnRevision: base }) }));
    assert.equal(res.status, 409);
  });
  await test('V12 management search hides hidden by default and forget refuses hidden', async () => {
    const { probe } = await isolated(); const s = probe.getState();
    s.memories = [record(probe, 'v', 'shared fact'), record(probe, 'h', 'shared fact', { visibility: 'hidden' })];
    const visibleSearch = await rpc(probe, 'search', { query: 'shared' });
    assert.equal(visibleSearch.memories.length, 1); assert.equal(visibleSearch.memories[0].id, 'v');
    const allSearch = await rpc(probe, 'search', { query: 'shared', includeHidden: true });
    assert.equal(allSearch.memories.length, 2);
    const ctx = host(); probe.registerTools(ctx);
    const forget = ctx.registeredTools.get('memory_forget');
    const refused = await forget.execute({ id: 'h' });
    assert.equal(refused.ok, false); assert.equal(refused.error, 'hidden-record');
    assert.equal(s.memories.length, 2);
    const removed = await forget.execute({ id: 'v' });
    assert.equal(removed.ok, true); assert.equal(s.memories.length, 1);
  });
  await test('client requires successful preview and confirmation before import; success color updated', async () => {
    const flow = client.slice(client.indexOf('const doImport ='), client.indexOf('return h("div", null, [', client.indexOf('const doImport =')));
    assert.ok(flow.indexOf('rpc("preview-import"') < flow.indexOf('if (!confirm('));
    assert.ok(flow.indexOf('if (!confirm(') < flow.indexOf('rpc("import"'));
    assert.ok(client.includes('color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, var(--dsw-alias-label-primary) 30%)'));
  });
  console.log(`\n${passed}/${passed} PASS`);
} finally {
  // Flush each instance in its own temporary store before cleanup and restore env.
  for (const { probe, dir, ioProbe } of instances) {
    process.env.DSH_MEMORY_DIR = dir;
    ioProbe?.release();
    await probe.flush();
  }
  if (previousDir === undefined) delete process.env.DSH_MEMORY_DIR;
  else process.env.DSH_MEMORY_DIR = previousDir;
  // root is the verified mkdtemp path created above, never the user's store.
  assert.ok(root.startsWith(join(tmpdir(), 'dsh-memory-p0-')));
  await rm(root, { recursive: true, force: true });
}
