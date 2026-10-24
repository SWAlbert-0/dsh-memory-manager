import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { tokens, scoreRecord, searchMemories, strategyOf, digest, DEFAULT_SETTINGS, normalizeRecord } from '../lib/shared.js';
const root = await mkdtemp(join(tmpdir(), 'dsh-memory-p1-'));
const oldDir = process.env.DSH_MEMORY_DIR, oldUser = process.env.USERPROFILE;
process.env.DSH_MEMORY_DIR = join(root, 'store'); process.env.USERPROFILE = join(root, 'user');
const source = (await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')).replace("from './shared.js'", 'from ' + JSON.stringify(new URL('../lib/shared.js', import.meta.url).href));
const mod = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { loadState, flush, registerCapture, extractMemories, writeAgentsMd }; export const _pending = () => pendingCaptures;').toString('base64'));
let passed = 0;
async function test(name, run) { await run(); console.log('PASS ' + name); passed++; }
const events = new Map(), tools = new Map(), effects = [];
const ctx = { on: (name, cb) => events.set(name, cb), tools: { register: t => tools.set(t.name, t) }, connection: { fetch: { register() {} } }, effect: cb => effects.push(cb()) };
try {
 const state = await mod.loadState();
 await test('R10 CJK punctuation boundaries and C/R/X tokens', () => {
  assert.deepEqual(tokens('中文，学习'), ['中文', '中', '文', '学习', '学', '习']);
  assert.deepEqual(tokens('C R X 0 1 12'), ['c', 'r', 'x', '12']);
 });
 await test('R10 BM25 actual corpus average length', () => {
  const rows = [{ text: 'alpha', updatedAt: 1 }, { text: 'alpha beta gamma', updatedAt: 1 }];
  const idf = Math.log(1 + .5 / 2.5);
  const expected = 2.2 / (1 + 1.2 * (.25 + .75 / 2)) * idf + .45;
  assert.ok(Math.abs(scoreRecord(rows[0], ['alpha'], 2, new Map([['alpha', 2]]), 2) - expected) < 1e-10);
  assert.equal(searchMemories('alpha', 10, rows)[0], rows[0]);
 });
 await test('R15 strategy override/rule/global priority', () => {
  const settings = { ...DEFAULT_SETTINGS, strategyRules: [{ field: 'tag', value: '代码', strategy: 'json' }] };
  assert.equal(strategyOf({ tags: ['代码'] }, settings), 'json');
  assert.equal(strategyOf({ tags: ['代码'], strategy: 'simple' }, settings), 'simple');
  assert.equal(strategyOf({ tags: [] }, settings), 'enhanced');
 });
 await test('R08 digest ledger and disabled ordinary injection retain pinned', () => {
  const rows = [normalizeRecord({ text: '常驻', pinned: true }), normalizeRecord({ text: '普通' })];
  const result = digest(rows, { ...DEFAULT_SETTINGS, injectMode: 'details' }, {}, { omittedCount: 4 });
  assert.equal(result.ledger.pinnedCount, 1); assert.equal(result.ledger.regularCount, 1); assert.equal(result.ledger.omittedCount, 4);
  assert.ok(result.ledger.pinnedChars > 0 && result.ledger.regularChars > 0);
  const disabled = digest([rows[0]], { ...DEFAULT_SETTINGS, inject: false }, { content: '不注入' });
  assert.ok(disabled.text.includes('常驻')); assert.ok(!disabled.text.includes('memory-context')); assert.equal(disabled.ledger.regularChars, 0);
 });
 await test('R11 interval includes all rounds, filters assistant-only evidence, clears next window', async () => {
  const prompts = [];
  ctx.llm = { stream: async function* (input) {
    prompts.push(input.messages[0].content[0].text);
    yield { kind: 'text-delta', text: JSON.stringify({ candidates: [
      { text: '用户喜欢茶', kind: 'semantic', tags: ['饮食'], evidence: '我喜欢茶' },
      { text: '错误助手承诺', kind: 'semantic', tags: [], evidence: '我会永远记住' },
    ] }) };
  } };
  state.settings.autoCaptureInterval = 3; state.settings.extractProvider = 'test'; state.settings.extractModel = 'test';
  mod.registerCapture(ctx);
  const session = {};
  function turn(n, user) {
    const emit = (type, data) => events.get('session/event')(session, { type, data });
    emit('user/message', { content: [{ type: 'text', text: user }] });
    emit('assistant/message', { message: { content: [{ type: 'text', text: '我会永远记住' }] } });
    emit('turn/end', { turn: n });
  }
  turn(1, '我喜欢茶'); turn(2, '第二轮事实'); turn(3, '第三轮事实'); await delay(40);
  assert.equal(prompts.length, 1); for (const text of ['我喜欢茶', '第二轮事实', '第三轮事实']) assert.ok(prompts[0].includes(text));
  const pending = mod._pending();
  assert.equal(pending.length, 1); assert.equal(pending[0].evidence, '我喜欢茶'); assert.equal(pending[0].pinned, false);
  turn(4, '第四轮事实'); turn(5, '第五轮事实'); turn(6, '第六轮事实'); await delay(40);
  assert.equal(prompts.length, 2); assert.ok(!prompts[1].includes('第二轮事实')); assert.ok(prompts[1].includes('第四轮事实'));
 });
 await test('R11 unavailable route and malformed output have explicit failures', async () => {
  const unavailable = await mod.extractMemories({}, '', state.settings); assert.equal(unavailable.ok, false); assert.deepEqual(unavailable.candidates, []);
  const bad = await mod.extractMemories({ llm: { stream: async function* () { yield { kind: 'text-delta', text: '[]' }; } } }, '用户：我喜欢茶', state.settings);
  assert.equal(bad.ok, false); assert.deepEqual(bad.candidates, []);
 });
 await test('R08 pre-step attaches ledger, omission counts, pinned survives switch', async () => {
  mod.apply(ctx);
  state.memories = [normalizeRecord({ text: '常驻事实', pinned: true }), ...Array.from({ length: 4 }, (_, i) => normalizeRecord({ text: '普通事实' + i }))];
  state.settings.maxInject = 1; state.settings.injectMode = 'details';
  const hook = events.get('agent/pre-step');
  let result = await hook({}, async () => ({ kind: 'accept', messages: [] }));
  assert.equal(result.messages.at(-1)._memoryLedger.omittedCount, 3);
  state.settings.inject = false;
  result = await hook({}, async () => ({ kind: 'accept', messages: [] }));
  assert.equal(result.messages.at(-1)._memoryLedger.pinnedCount, 1);
  assert.ok(!result.messages.at(-1).content[0].text.includes('普通事实'));
 });
 await test('R14 sequential same-content writes are idempotent with backup', async () => {
  const first = await mod.writeAgentsMd('测试规则'); assert.equal(first.ok, true);
  const before = await readdir(join(root, 'user', '.dsh'));
  const result = await mod.writeAgentsMd('测试规则'); assert.equal(result.skipped, true);
  assert.deepEqual(await readdir(join(root, 'user', '.dsh')), before);
  assert.ok(tools.get('memory_write_agents_md').description.includes('explicit user confirmation of the exact content'));
 });
 await test('R09/R14/R15 client quality grouping, line diff, shared strategy resolver', async () => {
  let exported;
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  const react = { createElement() {} };
  const instrumented = client.replace('exports.MemoryPage = MemoryPage;', 'exports.probe = { qualityGroups, lineDiff, effectiveStrategy }; exports.MemoryPage = MemoryPage;');
  vm.runInNewContext(instrumented, { window: { __ModuleLoader__: { load: ({ factory }) => { exported = factory(() => react); } } } });
  const p = exported.probe;
  const records = [{ id: '1', text: ' 相同 ', category: 'a', key: 'k', value: '一' }, { id: '2', text: '相同', category: 'a', key: 'k', value: '二' }];
  const groups = p.qualityGroups(records); assert.equal(groups.length, 2); assert.equal(groups[0].type, 'duplicate'); assert.equal(groups[1].type, 'conflict');
  assert.deepEqual(Array.from(p.lineDiff('旧\n相同', '新\n相同')), ['- 旧', '+ 新', '  相同']);
  assert.equal(p.effectiveStrategy({ tags: ['a'] }, 'enhanced', [{ field: 'tag', value: 'a', strategy: 'json' }]), 'json');
 });
 console.log(`\n${passed}/${passed} PASS`);
} finally {
 await mod.flush();
 if (oldDir === undefined) delete process.env.DSH_MEMORY_DIR; else process.env.DSH_MEMORY_DIR = oldDir;
 if (oldUser === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = oldUser;
 assert.ok(root.startsWith(join(tmpdir(), 'dsh-memory-p1-'))); await rm(root, { recursive: true, force: true });
}
