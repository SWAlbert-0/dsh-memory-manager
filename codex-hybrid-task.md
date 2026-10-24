# 任务：实现记忆插件的「混合策略」（完整设计已定，按规格实现）

你拥有本目录的**写权限**。请按下面的设计规格，在 `dsh-memory` 插件里实现混合策略：
**全局默认策略 + 路由规则 + 每条记录覆盖**，三级解析。

## 背景

- 插件结构：`lib/index.js`（宿主：存储/工具/注入/HTTP 路由）、`lib/client.js`（客户端：侧边栏 + 管理页）。
- 存储是 18 字段超集（`text/category/subcategory/key/value/backstory/person/relationship/tags/kind/scope/strategy`…），**不需要迁移数据**。
- 当前 `settings.strategy` 是全局单选；本任务把它变成「默认值」，并加两级覆盖。
- 参考概念来自《用户记忆和知识库》：多数生产系统采用混合模式——关键且少量用 Advanced JSON Cards，大量非关键用 Simple Notes。

## 设计规格（必须严格遵守）

### 1. 策略解析优先级

```text
生效策略 =
  ① rec.strategy（记录自己的覆盖，'' 表示未指定）
  ↓ 未指定
  ② settings.strategyRules 中第一条命中的规则
  ↓ 无命中
  ③ settings.strategy（全局默认）
```

### 2. 宿主端 lib/index.js

1. `DEFAULT_SETTINGS` 增加 `strategyRules: []`；`STRATEGIES`/`PLACEMENTS` 常量保持。
2. `normalizeRecord` 增加：`strategy: STRATEGIES.includes(input.strategy) ? input.strategy : (STRATEGIES.includes(prev?.strategy) ? prev.strategy : '')`（空串 = 跟随全局，旧记录读入天然为空，零迁移）。
3. 新增：
```js
function matchRule(rec, rule) {
  if (rule.field === 'kind') return rec.kind === rule.value;
  if (rule.field === 'scope') return (rec.scope || 'global') === rule.value;
  if (rule.field === 'category') return (rec.category || '').startsWith(rule.value);
  if (rule.field === 'tag') return (rec.tags || []).includes(rule.value);
  return false;
}
function strategyOf(rec, settings) {
  if (STRATEGIES.includes(rec?.strategy)) return rec.strategy;
  for (const rule of settings.strategyRules || []) {
    if (matchRule(rec, rule)) return rule.strategy;
  }
  return settings.strategy;
}
```
4. 三个消费点改为按记录解析：
   - `digest`：`renderLine(r, strategyOf(r, settings))`
   - `memory_search` 返回：附带 `strategy: strategyOf(r, state.settings)` 与按它渲染的 `rendered`
   - `memory_list` 返回：同上
5. `memory_write` 参数表加可选 `strategy`（enum STRATEGIES，描述：per-record override；empty = follow global）。`normalizeRecord` 已能接住。
6. `settings` 分支校验 `strategyRules`：
   - 非数组 → 返回 `{ ok:false, error:'invalid-rules' }`
   - 每条规则必须 `field ∈ ['kind','scope','category','tag']`、`value` 非空字符串、`strategy ∈ STRATEGIES`，否则整次写入拒绝
   - 合法则归一化为 `{ field, value, strategy }` 存入 `next.strategyRules`

### 3. 客户端 lib/client.js

1. 新增：
```js
function resolveStrategy(rec, globalStrategy, rules) {
  if (STRATEGIES.some((s) => s.id === rec?.strategy)) return rec.strategy;
  for (const rule of rules || []) {
    const hit = rule.field === "kind" ? rec.kind === rule.value
      : rule.field === "scope" ? (rec.scope || "global") === rule.value
      : rule.field === "category" ? (rec.category || "").startsWith(rule.value)
      : rule.field === "tag" ? (rec.tags || []).includes(rule.value)
      : false;
    if (hit) return rule.strategy;
  }
  return globalStrategy;
}
```
2. `MemoryRow`：props 加 `rules`；正文渲染改用 `renderParts(rec, resolveStrategy(rec, strategy, rules))`。
3. `MemoryRow` meta 区：`rec.strategy` 非空时显示一个策略 chip（如 `Simple Notes`），让覆盖在列表可见；跟随全局的不显示。
4. `MemoryPage` 搜索匹配与删除确认同样用 `resolveStrategy(r, strategy, rules)`。
5. `MemoryForm`：加「本记录格式」下拉——首项 `跟随全局（<当前全局策略名>）`（value=''），其余四种；选中非「跟随」后，下方结构化字段立即按该策略显隐（`activeStrategy = form.strategy || strategy`）。保存时 `strategy` 一起提交（空串=跟随）。
6. `SettingsPanel`：在策略卡片下方加「混合策略规则」卡片：
   - 规则列表：每条 = 条件字段下拉（类型 kind / 范围 scope / 类别前缀 category / 标签 tag）+ 条件值输入 + 目标策略下拉（四种）+ 删除按钮
   - 「添加规则」按钮；`添加规则` 后必须填条件值才能保存
   - 保存：把 `strategyRules` 并入 form 一起 `rpc("settings", form)`；host 校验失败显示错误
   - 说明文字：规则按顺序匹配，第一条命中即生效；未命中的记录使用全局默认策略
7. `HelpPanel`：在策略 section 加一个 Term「混合策略」，解释两级解析与规则。​
8. 硬约束不变：经典脚本包装（`window.__ModuleLoader__.load`，只 `require("react")`）、无 import/export、无新依赖、中文文案、DSH token（`--dsw-*`）。

### 4. 明确不要做

- 不做物理格式迁移（存储仍是超集）
- 不改 `searchMemories` 的检索算法
- 不改自动注入的选取逻辑（`pickForInjection`）与 `maxInjectChars` 截断
- 不改练习模式（`PracticePanel`）与其示例数据
- 不改入口位置（`entryPlacement`）逻辑

## 验证（必须全部执行并在报告中给结果）

1. `node --check lib/index.js && node --check lib/client.js`
2. **宿主逻辑驱动测试**（不启动服务器、不碰真实数据）：写一个临时脚本，
   `import('file:///D:/Documents/Temp/dsh-memory-plugin/lib/index.js')`，构造 fake ctx
   （`logger/tools.register→Map`、`connection.fetch.register→Map`、`on(){}、effect(fn){fn()}`），
   `mod.apply(ctx)` 后：
   - 先设 `process.env.DSH_MEMORY_DIR` 为临时目录（脚本开头，import 之前），确保**不读写** `%APPDATA%\dsh-memory`
   - 通过 `ctx.tools` 的 `memory_write` 写入 3 条：①无 strategy（跟随全局）②strategy='simple' ③strategy='advanced'
   - 先把全局 settings 设为 enhanced（通过 routes.get('/api/memory/rpc').fetch(new Request(...)) 调 settings）
   - 断言：`memory_search` 返回的三条 `strategy` 分别为 enhanced/simple/advanced，`rendered` 各按其策略渲染
   - 测试规则：settings 写入 `strategyRules:[{field:'tag',value:'规则测试',strategy:'json'}]`，再写一条带该标签、无 strategy 的记录，断言其生效策略为 json
   - 测试校验：提交非法规则（field:'bad'），断言返回 `{ok:false,error:'invalid-rules'}`
   - 测试完删除临时目录
3. 完成后**不要**重启或操作正在运行的测试实例（端口 56001）——宿主端重启由调用方负责。
4. 报告写到 `analysis/hybrid-report.zh-CN.md`：实现摘要、解析流程、验证结果、已知边界。

## 交付

- 修改 `lib/index.js` 与 `lib/client.js`
- 生成 `analysis/hybrid-report.zh-CN.md`
- 最终回复：改动摘要 + 验证结果 + 已知边界（中文）
