import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
let code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
code = code.replace('exports.MemoryPage = MemoryPage;', 'exports.probe = { MemoryForm, QualityPanel, AgentsPanel, MemoryRow, ProfilePanel, ProfileScopePanel, EvidenceDetails, qualityGroups, serviceState, Modal }; exports.MemoryPage = MemoryPage;');
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
const visibilityButton = (tree, label) => find(tree, n => n.type === 'button' && n.props['aria-label'] === '可见性：' + label);
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
let passed = 0;
async function test(label, run) { reset(); await run(); console.log('PASS ' + label); passed++; }
await test('R06 empty guard, comma tags, matching rule preview, saving and failure draft', async () => {
 const dirty = [], saved = []; let reject;
 const props = { strategy: 'enhanced', rules: [{ field: 'tag', value: '代码', strategy: 'json' }], onDirty: x => dirty.push(x), onSubmit: form => { saved.push(form); return new Promise((resolve, no) => reject = no); } };
 let tree = render(exported.probe.MemoryForm, props);
 assert.equal(button(tree, '新增记忆').props.disabled, true);
 find(tree, n => n.type === 'textarea').props.onChange({ target: { value: '我的事实' } }); tree = render(exported.probe.MemoryForm, props);
 find(tree, n => n.type === 'input' && n.props.placeholder === '旅行, 饮食').props.onChange({ target: { value: '代码， 学习, ' } }); tree = render(exported.probe.MemoryForm, props);
 assert.ok(text(tree).includes('生效格式：JSON Cards')); assert.equal(dirty.at(-1), true);
 const pending = button(tree, '新增记忆').props.onClick(); tree = render(exported.probe.MemoryForm, props);
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
 assert.ok(nodes(tree).some(n => n.props.data?.profile?.content === 'Agent 新画像'));
 assert.ok(!nodes(tree).some(n => n.type === 'button' && text(n) === '切换到简化视图')); assert.equal(intervals.size, 2);
 button(tree, '记忆').props.onClick(); tree = render(exported.MemoryPage);
 assert.ok(nodes(tree).some(n => n.type === 'input' && n.props.type === 'search'));
});
await test('R09/C3 duplicate consolidation is confirmed, atomic and preserves evidence', async () => {
 const props = { memories: [{ id: '1', text: '重复', tags: ['甲'], updatedAt: 1 }, { id: '2', text: ' 重复 ', tags: ['乙'], updatedAt: 2 }], refresh: async () => {} };
 let tree = render(exported.probe.QualityPanel, props);
 approve = false; await button(tree, '合并标签').props.onClick(); assert.equal(writes.length, 0);
 approve = true; await button(tree, '合并标签').props.onClick();
 assert.equal(writes.length, 1); assert.equal(writes[0].action, 'merge-duplicates');
 assert.equal(writes[0].payload.keepId, '2'); assert.deepEqual(writes[0].payload.otherIds, ['1']); assert.equal(writes[0].payload.mergeTags, true);
});
await test('V08 hidden filter chip filters the management list and visibility toggle sends the patch', async () => {
 mockedState.memories = [
  { id: 'vis', text: '可见事实', kind: 'semantic', updatedAt: 2, visibility: 'visible' },
  { id: 'hid', text: '隐藏事实', kind: 'semantic', updatedAt: 1, visibility: 'hidden' },
 ];
 let tree = render(exported.MemoryPage); await tick(); tree = render(exported.MemoryPage);
 assert.ok(text(tree).includes('隐藏会立即生效'));
 const kindLabel = find(tree, n => n.type === 'span' && text(n) === '类型');
 assert.ok(String(kindLabel.props.style.color).includes('label-secondary'));
 const rows = nodes(tree).filter(n => n.type === exported.probe.MemoryRow);
 assert.equal(rows.length, 2);
 const visRow = rows.find(n => n.props.rec.id === 'vis');
 await visRow.props.onToggleVisibility(visRow.props.rec);
 assert.deepEqual(writes.at(-1), { action: 'update', payload: { id: 'vis', patch: { visibility: 'hidden' } } });
 tree = render(exported.MemoryPage);
 visibilityButton(tree, '已隐藏').props.onClick(); tree = render(exported.MemoryPage);
 assert.equal(visibilityButton(tree, '已隐藏').props['aria-pressed'], true);
 assert.ok(text(tree).includes('显示 1 / 2 条'));
});
await test('V09 hidden card shows the badge and a pressed restore toggle', async () => {
 const props = { strategy: 'enhanced', rules: [], onPin() {}, onToggleVisibility() {}, onEdit() {}, onDelete() {} };
 const hiddenRow = render(exported.probe.MemoryRow, { ...props, rec: { id: 'hid', text: '隐藏事实', kind: 'semantic', visibility: 'hidden', tags: [], updatedAt: 1 } });
 assert.ok(text(hiddenRow).includes('已隐藏'));
 assert.equal(button(hiddenRow, '恢复对 Agent 可见').props['aria-pressed'], true);
 const visibleRow = render(exported.probe.MemoryRow, { ...props, rec: { id: 'vis', text: '可见事实', kind: 'semantic', visibility: 'visible', tags: [], updatedAt: 1 } });
 assert.ok(!text(visibleRow).includes('已隐藏'));
 assert.equal(button(visibleRow, '对 Agent 隐藏').props['aria-pressed'], false);
 assert.equal(button(visibleRow, '设为常驻').props['aria-pressed'], false);
 const pinnedRow = render(exported.probe.MemoryRow, { ...props, rec: { id: 'pin', text: '常驻事实', kind: 'semantic', pinned: true, visibility: 'visible', tags: [], updatedAt: 1 } });
 assert.ok(text(pinnedRow).includes('📌 常驻'));
 assert.equal(button(pinnedRow, '取消常驻').props['aria-pressed'], true);
 const jsonRow = render(exported.probe.MemoryRow, { ...props, strategy: 'json', rec: { id: 'j', text: '', value: '高级工程师', category: 'work', key: 'title', kind: 'semantic', visibility: 'visible', tags: [], updatedAt: 1 } });
 const pathPart = find(jsonRow, n => n.type === 'span' && text(n).includes('work.title'));
 assert.equal(pathPart.props.style.display, 'block');
});
await test('V10 memory form exposes the hide checkbox', async () => {
 const form = render(exported.probe.MemoryForm, { strategy: 'enhanced', rules: [], onDirty() {}, onSubmit() {} });
 assert.ok(text(form).includes('对 Agent 隐藏（保留在库中'));
});
await test('V13 quality merge does not copy hidden tags into a visible record', async () => {
 const props = { memories: [
  { id: 'vis', text: '重复', tags: ['可见'], updatedAt: 2, visibility: 'visible' },
  { id: 'hid', text: '重复', tags: ['隐藏标签'], updatedAt: 1, visibility: 'hidden' },
 ], refresh: async () => {} };
 let tree = render(exported.probe.QualityPanel, props);
 assert.ok(!nodes(tree).some(n => n.type === 'button' && text(n) === '合并标签'));
 assert.equal(writes.length, 0); // Hidden/visible records are never consolidation candidates.
});
await test('V14 profile Markdown renders headings, grouped lists and inline code at a consistent scale', async () => {
 const profile = { content: '# 总览\n\n## 偏好\n- 喜欢 `手冲` 咖啡\n- 养猫\n\n普通段落', generatedAt: 1, stale: false };
 const tree = render(exported.probe.ProfilePanel, { profile, memories: [] });
 const h1 = find(tree, n => n.type === 'h3' && text(n) === '总览');
 assert.equal(h1.props.style.fontSize, 18);
 const h2 = find(tree, n => n.type === 'h4' && text(n) === '偏好');
 assert.equal(h2.props.style.fontSize, 15);
 const uls = nodes(tree).filter(n => n.type === 'ul');
 assert.equal(uls.length, 1);
 assert.equal(uls[0].children.length, 2);
 assert.ok(nodes(tree).some(n => n.type === 'code' && text(n) === '手冲'));
 const p = find(tree, n => n.type === 'p' && text(n) === '普通段落');
 assert.equal(p.props.style.fontSize, 14);
});
await test('V15 stale profile warning uses the high-contrast text color', async () => {
 const tree = render(exported.probe.ProfilePanel, { profile: { content: '## 偏好\n- 咖啡', generatedAt: 1, stale: true }, memories: [] });
 const warn = find(tree, n => n.type === 'p' && text(n) === '数据已变更，摘要待更新');
 assert.ok(String(warn.props.style.color).includes('color-mix'));
 assert.ok(String(warn.props.style.color).includes('55%'));
});
await test('V16 hidden filter empty state explains and offers a way back', async () => {
 mockedState.memories = [{ id: 'vis', text: '可见事实', kind: 'semantic', updatedAt: 1, visibility: 'visible' }];
 let tree = render(exported.MemoryPage); await tick(); tree = render(exported.MemoryPage);
 visibilityButton(tree, '已隐藏').props.onClick(); tree = render(exported.MemoryPage);
 assert.ok(text(tree).includes('还没有已隐藏的记忆'));
 button(tree, '查看全部记忆').props.onClick(); tree = render(exported.MemoryPage);
 assert.equal(visibilityButton(tree, '全部').props['aria-pressed'], true);
});
await test('V17 advanced options are a styled collapsible section', async () => {
 const props = { strategy: 'enhanced', rules: [], onDirty() {}, onSubmit() {} };
 let tree = render(exported.probe.MemoryForm, props);
 const details = find(tree, n => n.type === 'details');
 assert.equal(details.props.className, 'dshmem-advanced');
 assert.equal(details.props.open, false);
 assert.ok(text(details).includes('高级选项（格式与结构字段）'));
 assert.ok(text(details).includes('格式、类别、人物关系等可选字段'));
 details.props.onToggle({ currentTarget: { open: true } });
 tree = render(exported.probe.MemoryForm, props);
 assert.equal(find(tree, n => n.type === 'details').props.open, true);
});
await test('V18 add and review open as modal dialogs', async () => {
 let tree = render(exported.MemoryPage); await tick(); tree = render(exported.MemoryPage);
 button(tree, '+ 新增记忆').props.onClick(); tree = render(exported.MemoryPage);
 let modal = find(tree, n => n.type === exported.probe.Modal);
 assert.equal(modal.props.title, '新增记忆');
 modal.props.onClose(); tree = render(exported.MemoryPage);
 assert.ok(!nodes(tree).some(n => n.type === exported.probe.Modal));
 button(tree, '审阅重复与矛盾').props.onClick(); tree = render(exported.MemoryPage);
 modal = find(tree, n => n.type === exported.probe.Modal);
 assert.equal(modal.props.title, '审阅重复与矛盾');
});
await test('V19 modal dialog exposes labelled dialog markup and a close button', async () => {
 let closed = 0;
 const tree = render(exported.probe.Modal, { title: '测试弹窗', onClose: () => closed++, children: '弹窗内容' });
 const dialog = find(tree, n => n.props && n.props.role === 'dialog');
 assert.equal(dialog.props['aria-modal'], 'true');
 assert.ok(text(dialog).includes('测试弹窗'));
 assert.ok(text(dialog).includes('弹窗内容'));
 find(tree, n => n.type === 'button' && n.props['aria-label'] === '关闭弹窗').props.onClick();
 assert.equal(closed, 1);
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
await test('C3 form preserves explicit project, status, dates and conditions', async () => {
 const saved = []; const props = { strategy: 'enhanced', rules: [], projects: [{ id: 'a', name: 'Alpha', path: '/alpha' }], initial: { id: 'x', text: '事实', scope: 'project', projectId: '', status: 'historical' }, onSubmit: value => saved.push(value) };
 let tree = render(exported.probe.MemoryForm, props);
 const select = label => find(tree, n => n.props['aria-label'] === label);
 assert.equal(select('项目归属').props.value, '');
 select('项目归属').props.onChange({ target: { value: 'a' } }); tree = render(exported.probe.MemoryForm, props);
 select('适用条件').props.onChange({ target: { value: '仅工作日' } }); tree = render(exported.probe.MemoryForm, props);
 select('失效时间（不含）').props.onChange({ target: { value: '2030-01-01T12:30' } }); tree = render(exported.probe.MemoryForm, props);
 await button(tree, '保存修改').props.onClick(); assert.equal(saved[0].projectId, 'a'); assert.equal(saved[0].status, 'historical'); assert.equal(saved[0].conditions, '仅工作日'); assert.equal(saved[0].validUntil, new Date('2030-01-01T12:30').getTime());
});
await test('C3 evidence view distinguishes stored excerpt from verified origin', () => {
 const tree = render(exported.probe.EvidenceDetails, { rec: { evidence: '我喜欢茶', sourceSessionId: 'session-a', sourceMessageId: 'message-1', sourceEventSeq: 7, confirmation: 'user-approved' } });
 assert.ok(text(tree).includes('我喜欢茶')); assert.ok(text(tree).includes('session-a')); assert.ok(text(tree).includes('事件 #7')); assert.ok(text(tree).includes('可能未加载或已删除'));
 assert.ok(!nodes(tree).some(n => n.type === 'button')); assert.equal(writes.length, 0);
});
await test('C3 duplicate/conflict grouping separates identities, conditions and structured values', () => {
 const group = exported.probe.qualityGroups;
 const base = { id: 'a', text: '相同', category: 'food', key: 'spice', value: '辣' };
 for (const more of [{ scope: 'project', projectId: 'b' }, { person: '父亲' }, { conditions: '周末' }, { status: 'historical' }, { validFrom: 200, validUntil: 300 }]) {
  const a = { ...base, validFrom: 0, validUntil: 100 }, b = { ...base, id: 'b', ...more };
  assert.equal(group([a, b]).length, 0);
 }
 const conflicts = group([base, { ...base, id: 'b', value: '清淡' }]); assert.equal(conflicts.length, 1); assert.equal(conflicts[0].type, 'conflict');
});
await test('C3 conflict choice is explicit and keeps old facts rather than deleting', async () => {
 const props = { memories: [{ id: 'one', text: '住北京', category: 'home', key: 'city', value: '北京' }, { id: 'two', text: '住上海', category: 'home', key: 'city', value: '上海' }], refresh: async () => {} };
 let tree = render(exported.probe.QualityPanel, props);
 const choices = nodes(tree).filter(n => n.type === 'button' && text(n) === '以此条取代本组其他记录'); assert.equal(choices.length, 2);
 approve = false; await choices[1].props.onClick(); assert.equal(writes.length, 0);
 approve = true; await choices[1].props.onClick(); assert.deepEqual(writes[0], { action: 'supersede', payload: { oldId: 'one', newId: 'two' } });
 assert.ok(!writes.some(w => w.action === 'delete'));
});
await test('C3 profile selector keeps global and project summaries separate', () => {
 const props = { data: { profile: { content: 'global' }, profiles: { a: { content: 'alpha' }, b: { content: 'beta' } }, projects: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], memories: [{ id: 'g', scope: 'global' }, { id: 'a', scope: 'project', projectId: 'a' }, { id: 'b', scope: 'project', projectId: 'b' }] } };
 let tree = render(exported.probe.ProfileScopePanel, props);
 assert.equal(find(tree, n => n.type === exported.probe.ProfilePanel).props.profile.content, 'global');
 find(tree, n => n.props['aria-label'] === '画像范围').props.onChange({ target: { value: 'a' } }); tree = render(exported.probe.ProfileScopePanel, props);
 const panel = find(tree, n => n.type === exported.probe.ProfilePanel); assert.equal(panel.props.profile.content, 'alpha'); assert.deepEqual(Array.from(panel.props.memories.map(r => r.id)), ['g', 'a']);
});
reset(); console.log(`\n${passed}/${passed} PASS (mocked React hooks and fetch, no live requests)`);
