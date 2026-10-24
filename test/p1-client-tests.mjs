import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
let code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
code = code.replace('exports.MemoryPage = MemoryPage;', 'exports.probe = { MemoryForm, QualityPanel, AgentsPanel }; exports.MemoryPage = MemoryPage;');
let cells = [], cursor = 0, queued = [], exported, intervals = new Map(), timerId = 0;
let approvals = [], approve = true, writes = [], ruleFile = '旧规则', mockedState;
const initial = () => ({ ok: true, settings: { strategy: 'enhanced', inject: true, injectMode: 'summary', strategyRules: [] }, profile: { content: '旧画像', generatedAt: 1 }, memories: [{ id: 'old', text: '旧事实', kind: 'semantic', updatedAt: 1 }], pending: [] });
const react = {
 createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity) }; },
 useState(initial) { const i = cursor++; if (!cells[i]) { const cell = { value: typeof initial === 'function' ? initial() : initial }; cell.set = next => { cell.value = typeof next === 'function' ? next(cell.value) : next; }; cells[i] = cell; } return [cells[i].value, cells[i].set]; },
 useRef(initial) { const i = cursor++; cells[i] ||= { current: initial }; return cells[i]; },
 useCallback(cb, deps) { const i = cursor++; const old = cells[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) cells[i] = { value: cb, deps }; return cells[i].value; },
 useEffect(cb, deps) { const i = cursor++; const old = cells[i]; if (!old || !deps || deps.some((v, j) => !Object.is(v, old.deps[j]))) { queued.push(() => { old?.cleanup?.(); cells[i] = { deps, cleanup: cb() }; }); } },
};
const context = { window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), __ModuleLoader__: { load: ({ factory }) => exported = factory(() => react) } },
 confirm: message => { approvals.push(message); return approve; },
 setInterval: cb => { const id = ++timerId; intervals.set(id, cb); return id; }, clearInterval: id => intervals.delete(id),
 fetch: async (url, options = {}) => {
  if (url.endsWith('/rpc')) { writes.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true }) }; }
  if (url.endsWith('/agents-md')) { if (options.method === 'POST') { ruleFile = JSON.parse(options.body).content; writes.push({ content: ruleFile }); } return { ok: true, json: async () => ({ ok: true, content: ruleFile, exists: true }) }; }
  return { ok: true, json: async () => structuredClone(mockedState) };
 },
};
vm.runInNewContext(code, context);
function reset() { for (const cell of cells) cell?.cleanup?.(); cells = []; queued = []; intervals.clear(); writes = []; approvals = []; approve = true; mockedState = initial(); }
function render(component, props = {}) { cursor = 0; const tree = component(props); const effects = queued.splice(0); effects.forEach(cb => cb()); return tree; }
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree, ...(tree.children || []).flatMap(nodes)]; }
const text = tree => tree && typeof tree === 'object' ? (tree.children || []).map(text).join('') : String(tree ?? '');
function find(tree, predicate) { const node = nodes(tree).find(predicate); assert.ok(node, 'expected node'); return node; }
const button = (tree, label) => find(tree, n => n.type === 'button' && text(n) === label);
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
let passed = 0;
async function test(label, run) { reset(); await run(); console.log('PASS ' + label); passed++; }
await test('R06 empty guard, comma tags, matching rule preview, saving and failure draft', async () => {
 const dirty = [], saved = []; let reject;
 const props = { strategy: 'enhanced', rules: [{ field: 'tag', value: '代码', strategy: 'json' }], onDirty: x => dirty.push(x), onSubmit: form => { saved.push(form); return new Promise((resolve, no) => reject = no); } };
 let tree = render(exported.probe.MemoryForm, props);
 assert.equal(button(tree, '添加记忆').props.disabled, true);
 find(tree, n => n.type === 'textarea').props.onChange({ target: { value: '我的事实' } }); tree = render(exported.probe.MemoryForm, props);
 find(tree, n => n.type === 'input' && n.props.placeholder === '旅行, 饮食').props.onChange({ target: { value: '代码， 学习, ' } }); tree = render(exported.probe.MemoryForm, props);
 assert.ok(text(tree).includes('生效格式：JSON Cards')); assert.equal(dirty.at(-1), true);
 const pending = button(tree, '添加记忆').props.onClick(); tree = render(exported.probe.MemoryForm, props);
 assert.equal(button(tree, '保存中…').props.disabled, true);
 reject(new Error('模拟失败')); await pending; tree = render(exported.probe.MemoryForm, props);
 assert.deepEqual(Array.from(saved[0].tags), ['代码', '学习']); assert.ok(text(tree).includes('模拟失败')); assert.equal(find(tree, n => n.type === 'textarea').props.value, '我的事实');
});
await test('R06 dirty tab navigation refuses without losing editor', async () => {
 let tree = render(exported.MemoryPage); await tick(); tree = render(exported.MemoryPage);
 button(tree, '+ 新增记忆').props.onClick(); tree = render(exported.MemoryPage);
 const form = find(tree, n => n.type === exported.probe.MemoryForm); form.props.onDirty(true); tree = render(exported.MemoryPage);
 approve = false; button(tree, '画像').props.onClick(); tree = render(exported.MemoryPage);
 assert.equal(approvals.at(-1), '有未保存的编辑，确定离开？'); assert.ok(nodes(tree).some(n => n.type === exported.probe.MemoryForm));
 approve = true; button(tree, '画像').props.onClick(); tree = render(exported.MemoryPage);
 assert.ok(!nodes(tree).some(n => n.type === exported.probe.MemoryForm)); assert.equal(button(tree, '画像').props['aria-selected'], true);
});
await test('R17 state poll detects Agent edits and profile; full view keeps polling', async () => {
 let tree = render(exported.MemoryPage); await tick(); tree = render(exported.MemoryPage);
 assert.equal(intervals.size, 2);
 mockedState.memories[0].text = 'Agent 新事实'; mockedState.memories[0].updatedAt = 2;
 mockedState.profile = { content: 'Agent 新画像', generatedAt: 2 };
 for (const cb of intervals.values()) await cb(); tree = render(exported.MemoryPage);
 const row = find(tree, n => n.props.rec?.id === 'old'); assert.equal(row.props.rec.text, 'Agent 新事实');
 button(tree, '画像').props.onClick(); tree = render(exported.MemoryPage);
 assert.ok(nodes(tree).some(n => n.props.profile?.content === 'Agent 新画像'));
 assert.ok(!nodes(tree).some(n => n.type === 'button' && text(n) === '切换到简化视图')); assert.equal(intervals.size, 2);
 button(tree, '记忆').props.onClick(); tree = render(exported.MemoryPage);
 assert.ok(nodes(tree).some(n => n.type === 'input' && n.props.type === 'search'));
});
await test('R09 duplicate merge confirmation and RPC update-before-delete order', async () => {
 const props = { memories: [{ id: '1', text: '重复', tags: ['甲'], updatedAt: 1 }, { id: '2', text: ' 重复 ', tags: ['乙'], updatedAt: 2 }], refresh: async () => {} };
 let tree = render(exported.probe.QualityPanel, props);
 approve = false; await button(tree, '合并标签').props.onClick(); assert.equal(writes.length, 0);
 approve = true; await button(tree, '合并标签').props.onClick();
 assert.equal(writes[0].action, 'update'); assert.equal(writes[0].payload.id, '2'); assert.deepEqual(writes[0].payload.patch.tags.sort(), ['乙', '甲'].sort());
 assert.equal(writes[1].action, 'delete'); assert.equal(writes[1].payload.id, '1');
});
await test('R14 preview first, changed draft invalidates preview, exact content written', async () => {
 const props = { onDirty() {} }; let tree = render(exported.probe.AgentsPanel, props); await tick(); tree = render(exported.probe.AgentsPanel, props);
 find(tree, n => n.type === 'textarea').props.onChange({ target: { value: '新规则' } }); tree = render(exported.probe.AgentsPanel, props);
 assert.ok(!nodes(tree).some(n => n.type === 'button' && text(n) === '确认写入'));
 button(tree, '预览差异').props.onClick(); tree = render(exported.probe.AgentsPanel, props); assert.ok(text(tree).includes('- 旧规则\n+ 新规则'));
 find(tree, n => n.type === 'textarea').props.onChange({ target: { value: '确定的新规则' } }); tree = render(exported.probe.AgentsPanel, props);
 assert.ok(!nodes(tree).some(n => n.type === 'button' && text(n) === '确认写入'));
 button(tree, '预览差异').props.onClick(); tree = render(exported.probe.AgentsPanel, props);
 await button(tree, '确认写入').props.onClick(); assert.equal(ruleFile, '确定的新规则'); assert.equal(writes.length, 1);
});
reset(); console.log(`\n${passed}/${passed} PASS (mocked React hooks and fetch, no live requests)`);
