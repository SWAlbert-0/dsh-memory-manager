# 任务：dsh-memory 插件 — 实现 P1 体验提升（Codex 报告 R05–R19 共 11 项）

你拥有本目录的**写权限**。​请按下面的规格逐项实现。​每项都有明确的行为规格和验收标准。​

## 背景

- `lib/index.js`（宿主，~530 行）：存储/校验/工具/注入/HTTP 路由，零外部依赖
- `lib/client.js`（客户端，~1100 行）：侧边栏 + 管理页（React 无构建），7 个标签
- 存储：`%APPDATA%\dsh-memory\memory.json`，20 字段超集记录
- 已有：混合策略（三级解析 + `strategyOf`/`resolveStrategy`）、常驻记忆（pinned）、画像摘要、AGENTS.md 桥接、自动沉淀（`extractMemories` + pendingCaptures）、简化/完整视图切换、导入预览、`validateRecord`、保存串行化、stale 摘要回退、scope 过滤
- 测试实例：端口 56001 运行中（token: `fy3S0E-splvZ7YsP5YfTYZzeqjrJgbUWfHCXB-y_3Pw`），**不要启动/停止/修改其中的数据**。​宿主端改动后需重启——由调用方负责。​
- 回退点已建：`lib/rollback/client.stage10-before-p1.js` + `host.stage5-before-p1.js`。​
- 主题 token 参考：`THEME-TOKENS.md`。​

## 硬约束（全部项目共同遵守）

- 经典脚本包装（`window.__ModuleLoader__.load`，只 `require("react")`）、无 import/export、无新依赖
- DSH token（`--dsw-*`）、中文文案、无外部字体/图标
- 不改存储超集结构、不改 `searchMemories` 算法、不改 `entryPlacement` 逻辑
- 不破坏已有的：混合策略三级解析、常驻记忆、画像摘要、AGENTS.md 桥接、简化视图切换、导入预览、`validateRecord`、保存串行化、stale 摘要回退、scope 过滤
- 每项改动完成后 `node --check` 通过

---

## R05：导航对齐用户任务

**目标**：把 7 个标签收敛为 3 层结构，简化视图保留搜索和编辑。​

**改动**：
1.​ 标签从 7 个改为 5 个：**记忆 / 画像 / 规则文件 / 设置 / 说明**
   - 「新增」合并到「记忆」内（列表页顶部加「+ 新增记忆」按钮，点击后内联展示表单或切换到内联编辑模式）
   - 「导入导出」合并到「设置」内（作为设置页的一个 section）
2.​ 「说明」保留但精简（移除与「练习」相关的引用，改为简短的快速参考卡片而非长文）
3.​ 简化视图：保留搜索、列表、编辑/删除、新增按钮；隐藏策略/规则/导入导出/说明
4.​ 简化视图的显示偏好用 `useState` 保存（会话内，不持久化）

**验收**：tabs 数组长度 = 5；「记忆」标签页有新增按钮；简化模式下可以搜索和删除；`node --check` 通过。​

## R06：表单校验、草稿和实际策略预览

**改动**：
1.​ 完整表单（MemoryForm）加 `saving` 和 `error` 状态（简化表单已有）：提交中禁用按钮，失败显示错误信息
2.​ 空内容拦截：text 为空时禁用提交按钮
3.​ 标签统一中英文逗号解析：`form.tags.split(/[,，]/).map(x => x.trim()).filter(Boolean)`（完整表单当前只按英文逗号）
4.​ 显示实际生效格式：在策略下拉旁显示 `生效格式：{resolveStrategy(form, strategy, rules) 对应的策略名}`（`rules` 从 props 传入，即 `data.settings.strategyRules`）
5.​ 切换标签时如有未保存编辑：显示确认对话框（`confirm("有未保存的编辑，确定离开？")`）
6.​ 提交后清除编辑状态并刷新列表

## R07：窄屏空间优化

**改动**：
1.​ 窄屏下筛选栏默认折叠（`filtersOpen` 初始值改为 `false`——已实现，确认）
2.​ 窄屏下筛选栏展开后的布局：
   - 类型 chips 独占一行（已有 `.dshmem-filter-group { flex-basis: 100% }`）
   - 范围 chips 独占一行（已有）
   - 标签下拉独占一行（加 `width: 100%` 到 CSS media query）
   - 清除筛选和计数独占一行
3.​ CSS media query 中增加 `.dshmem-filter-select` 宽度 `100%`
4.​ 长文折叠（已有，确认窄屏 5 行生效）
5.​ CSS media query 中所有按钮 `min-height: 36px`（从现有 44px 微调，保持可触控但不占过多空间）

**验收**：390px 下展开筛选后，筛选区总高度 ≤ 300px；无横向溢出。​

## R08：注入追踪（注入明细）

**改动**：
1.​ 宿主端 `digest` 改为返回 `{ text, ledger }`：
```js
function digest(records, settings, profile) {
  const pinned = records.filter(r => r.pinned);
  const regular = records.filter(r => !r.pinned);
  const sections = [];
  const ledger = { pinnedCount: pinned.length, pinnedChars: 0, regularCount: regular.length, regularChars: 0, omittedCount: 0, omittedReason: '' };
  // ...现有 pinned/regular 逻辑，同时统计字符数和省略数...
  // omitted：regular 中未入选的记录数（pickForInjection 的 limit 截断掉的）
  return { text: sections.join('\n'), ledger };
}
```
2.​ `pre-step` 钩子中把 `digest` 返回的 `ledger` 附加到 message 的自定义属性（不写入会话日志，仅内存）：`message._memoryLedger = ledger`。​
3.​ 客户端不直接访问 ledger（宿主内存态），但设置页显示当前注入模式和预算（已有）。​
4.​ 列表页不再声称「相关记忆」，改为「优先注入的记忆」。​

**最小改动**：只改 `digest` 返回结构和 `pre-step` 中的调用方式，客户端 UI 不需要大改。​

## R09：重复/矛盾审阅

**改动**：
1.​ `MemoryPage` 加一个「质量」按钮（筛选栏右侧或列表页底部）：
   - 点击后计算：精确重复（trim 后 text 相同的记录组）、同路径多值（category.subcategory.key 相同但 value 不同）
   - 显示为卡片列表，每组显示涉及的记录和操作按钮
2.​ 操作选项：
   - 精确重复：「保留最新」（删除旧记录）/「合并标签」（保留最新，合并旧标签到新）/「忽略」
   - 同路径多值：「显示详情」（并排展示两条的完整字段）/「忽略」（不自动处理，因为可能是时间变化或不同人物）
3.​ 操作通过现有 `rpc('delete', ...)` 和 `rpc('update', ...)` 执行
4.​ 操作前 `confirm()` 确认
5.​ 操作后 `refresh()`

## R10：检索口径统一

**改动**：
1.​ 面板搜索保持「包含关键词」行为不变（可预测），但更新 placeholder 文字为「按关键词过滤（非 Agent 检索）」
2.​ 说明页增加一条「面板搜索 vs Agent 检索」的区别说明（已有类似内容，确认覆盖）​
3.​ `tokens()` 修复 CJK bigram 跨标点问题：改为对**连续 CJK 片段**分别提取 bigram（不跨标点）
```js
const cjkRuns = s.match(new RegExp(CJK.source + '+', 'g')) || [];
for (const run of cjkRuns) {
  const chars = [...run];
  for (let i = 0; i + 1 < chars.length; i++) out.push(chars[i] + chars[i + 1]);
  for (const c of chars) out.push(c);
}
```
4.​ 单字母技术词（C、R、X）在 `tokens` 中不再被过滤：把 `if (w.length > 1)` 改为 `if (w.length >= 1 && w.length <= 20)`（但过滤纯数字单字符如 "0"、"1"）
5.​ `searchMemories` 中的 BM25 评分修复长度归一化：`hay.length / 20` 中的 20 改为实际平均文档长度（计算所有 haystack 的 token 数平均值）​

## R11：提取窗口与证据

**改动**：
1.​ 提取提示词改为覆盖**间隔内的所有轮次**（不是只发最后一轮）：
   - `registerCapture` 中 `progress` 增加一个 `buffer: []` 数组，每轮 push `{ user, assistant }`
   - 触发提取时，把 buffer 中所有轮次的 transcript 拼接后发送，然后清空 buffer
2.​ 提取结果结构化：
```js
// 提示词输出改为：
// {"candidates": [{"text": "...", "kind": "...", "tags": [...], "evidence": "用户原句"}]}
// 无新事实时：{"candidates": []}
```
3.​ 提取结果中的每条候选带 `evidence` 字段（用户原句），存入 `pendingCaptures` 时一并保留。​
4.​ 待确认队列中的记录显示 evidence 来源（12px muted）。​
5.​ 宿主端 `extractMemories` 返回 `[{ok, candidates, error}]` 结构（不是裸数组），调用方检查 `ok` 后再取 `candidates`。​
6.​ **约束**：不自行删除旧事实；不把助手承诺写成用户偏好；不自行设为常驻。​

## R14：规则文件写入审批

**改动**：
1.​ 客户端「规则文件」标签页：保存前显示**当前内容 vs 新内容的差异预览**（简单 diff：逐行比较，标记新增 `+` 和删除 `-`）
2.​ 保存按钮改为「预览差异」，先展示差异，再显示「确认写入」按钮
3.​ 工具 `memory_write_agents_md` 的描述改为：**"Replace the user permanent rules file ~/.dsh/AGENTS.md. IMPORTANT: You MUST obtain explicit user confirmation of the exact content before calling this tool. Show the proposed content to the user and ask them to approve."**
4.​ 宿主端 `writeAgentsMd` 加一个简单的内容哈希检查：写入前计算 `sha256(content)`，如果与上次写入的哈希相同则跳过写入（幂等）。​

## R15：渐进模块化

**改动**（最小化，不做大拆分）：
1.​ 宿主端 `lib/index.js` 把 `validateRecord`、`normalizeRecord`、`normalizeSettings`、`strategyOf`、`renderLine`、`matchRule`、`tokens`、`haystack`、`scoreRecord`、`searchMemories`、`renderParts`（如果存在）、`groupRecords`、`digest`、`resolveLlmRoute` 移到一个 `lib/shared.js` 文件（宿主端可 ESM 相对 import）
2.​ `lib/index.js` 改为 `import { validateRecord, ... } from './shared.js'`（相对路径，零依赖不变）
3.​ `lib/client.js` 保持单文件（ModuleLoader 发布契约限制），但把重复的策略解析统一为一个 `effectiveStrategy` 函数（如果尚不存在）
4.​ **确认**：`lib/shared.js` 能被 `lib/index.js` 相对 import，因为两者都在同一目录且都不在 asar 中

## R17：Agent 变更同步

**改动**：
1.​ `MemoryPage` 加一个轮询 effect：
```js
useEffect(() => {
  if (simpleMode) return; // 简化模式不轮询
  const interval = setInterval(() => {
    fetch('/api/memory/state', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(j => {
        // 只在 revision 变化时刷新（比较 profile.generatedAt + memories.length + 最新 updatedAt）
        setData(prev => {
          if (!prev) return j;
          const prevSig = JSON.stringify([prev.memories.length, prev.profile?.generatedAt, prev.settings.injectMode]);
          const nextSig = JSON.stringify([j.memories.length, j.profile?.generatedAt, j.settings.injectMode]);
          return prevSig !== nextSig ? j : prev;
        });
      })
      .catch(() => {});
  }, 10000);
  return () => clearInterval(interval);
}, [simpleMode]);
```
2.​ Agent 更新画像后，面板在 10s 内自动刷新显示新内容（不需要手动点击「刷新」）
3.​ 修改说明页文案：「生成后 10 秒内自动展示最新内容」（替换原来「点击刷新查看」）

## R19：常驻与 AGENTS.md 边界说明

**改动**：
1.​ 设置页的注入开关文案改为：「每轮自动注入普通记忆（常驻记忆不受此开关影响）」
2.​ 「规则文件」标签页的说明文字改为：「此文件由 DSH 宿主按会话自动读取注入，独立于插件的自动注入开关。​关闭插件的自动注入不会停用此文件。​」
3.​ 说明页增加一条 Term 区分两者。​

---

## 验证（必须全部执行）

1.​ `node --check lib/index.js && node --check lib/client.js && node --check lib/shared.js`
2.​ `node test/p0-tests.mjs` → 全部 PASS（确认 P0 修复没有回退）
3.​ grep 确认：`PRACTICE_SAMPLES` 零匹配、`PracticePanel` 零匹配、`strategyOf` 存在、`effectiveStrategy`/`resolveStrategy` 存在
4.​ 浏览器验证（使用 CDP 脚本 `check-demo.mjs`，URL: `http://127.0.0.1:56001/?token=8VobqKp0ECW4RVb4jniQEy__1AkWKAHt-POmiDPmkek`——**只验证标签数和渲染，不改数据**）：5 个标签存在、每个标签可点击
5. 报告写到 `analysis/p1-report.zh-CN.md`：每项实现摘要、验证结果、已知边界

## 交付

- 修改 `lib/index.js`、`lib/client.js`
- 新建 `lib/shared.js`
- 生成 `analysis/p1-report.zh-CN.md`
- 最终回复：改动摘要 + 验证结果 + 已知边界（中文）
