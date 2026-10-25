# dsh-memory-manager 会话交接文档

> 交接时间：2026-10-26（UTC+8，第一阶段收尾）
> 交接人会话：dsh-memory-manager 插件开发全流程

## 项目概述

`dsh-memory-manager` 是一个 DSH 插件（宿主端 + Web 客户端），实现用户长期记忆管理。包名与仓库名为 `dsh-memory-manager`，运行时标识与数据目录仍为 `dsh-memory`。

- **路径**：`D:\Dev\Projects\Personal\dsh-plugin\dsh-memory-manager\`
- **仓库**：https://github.com/SWAlbert-0/dsh-memory-manager （public，分支 `main`）
- **npm 包名**：`dsh-memory-manager`（尚未发布；`npm pack` 仅含 `lib/*.js` + README + LICENSE）
- **宿主端**：`lib/index.js`（~530 行，零外部依赖，只用 Node 内置）
- **客户端**：`lib/client.js`（~1100 行，React 无构建，`window.__ModuleLoader__.load` 包装）
- **共享模块**：`lib/shared.js`（宿主端函数拆分）
- **测试实例**：端口 56001，隔离 `DSH_HOME=D:\Dev\Projects\Personal\dsh-plugin\.dsh-test-home`
- **存储**：`%APPDATA%\dsh-memory\memory.json`（44 条真实记忆，未动）
- **回退点**：`lib/rollback/`（stage 0–20 + host stage 0–9 + shared stage 0，命名规则见该目录 README.md）

## 已完成功能

| 功能 | 要点 |
|---|---|
| 四种策略 + 混合路由 | 全局默认 + 路由规则 + 每条覆盖（三级解析 `strategyOf`/`resolveStrategy`） |
| 常驻记忆（pinned） | 全量注入 `<memory-rules>`，独立预算，UI 3px 边框标识 |
| 记录可见性（hidden） | hidden 记录保留在库、管理界面可见可编辑可恢复；不进注入（pinned 之前过滤）/ 搜索 / 列表 / 画像 / 提取上下文；画像写入带 revision 乐观锁；管理 RPC 搜索默认排除、工具拒绝删除 hidden |
| AGENTS.md 桥接 | 读写 `~/.dsh/AGENTS.md`，保存前备份，幂等检查 |
| 自动沉淀 | `session/event` → `turn/end` → LLM 提取 → 待确认队列 |
| 记忆列表筛选 | 关键词 + 类型/范围/标签 + 排序（更新/创建/重要性/频率） |
| 入口位置配置 | 侧边栏 / 设置页 / 两处（`entryPlacement`，动态挂载） |
| 用户画像摘要 | Agent 通过 `memory_update_profile` 工具生成 Markdown；空状态引导 |
| 简化视图 | 已取消，始终完整视图 |
| P0/P1/P2 可读性优化 | 层级 / 截断 / 相对时间 / 吸顶 / 焦点 / 分组 / 紧凑（已移除）/ 结构化正文 / 骨架 |
| P0 安全修复 | stale 摘要回退 / 导入预览 / 队列保全 / 统一校验 / 保存串行化 / scope 修复 / U+FFFD 拒绝 |
| P1 体验提升 | 导航收敛 7→5 / 表单校验 / 窄屏折叠 / 注入追踪 / 质量审阅 / 检索修复 / 提取窗口 / 审批 / 模块化 / 同步 |
| 说明页 | 技术名词 / 策略对比 / 快速上手 / 注意事项 |
| 设计评审 P1 修整 | 对比度 / 卡片状态与操作分离 / 画像 Markdown 排版 / 窄屏筛选不吸顶 |
| 设计评审 P2 修整 | 可见性筛选文案 / 隐藏空状态 / 设置保存提示 / 导入预览 / 表单层次 / 文案 / 触屏命中区 / 结构化路径 |
| 设计评审 P2 增强 | 可见性三态 / 新增与审阅弹窗 / 高级选项卡片样式 |

## 第一阶段交接（C3-01～C3-05，2026-10-26）

- 已完成项目隔离、证据保全、时间与冲突治理、任务相关注入、三层评测基线。详见 README 的第一阶段章节与开发计划；第二阶段 C3-06～C3-11 尚未实施。
- 项目基于 Session.header.cwd（原始目录）生成稳定哈希 ID。工具通过 execute 第二参数的 agent.id → ctx.sessions.get 取得准确会话；不能用最新会话或 process.cwd 代替。缺少上下文只提供全局。旧项目记录必须人工指定归属，不自动推断。
- 所有模型出口使用 shared.modelRecords：hidden / 项目边界 / 时间状态 / 结构化冲突 / 派生来源可见性先过滤，之后才排名计数。模型不能选择任意项目读取；管理面板仍能管理所有记录。
- 新字段是 version:1 的兼容扩展，运行时/数据目录仍为 dsh-memory。导出保留 projects/profiles，旧画像没有范围指纹时仅留管理显示并标记待更新。
- 来源原句及会话/消息/事件号经候选批准后保留；查看依据不自动读完整会话。合并副本改为 merge-duplicates 原子操作：保留来源为 historical，建立 evidenceRefs，来源隐藏/删除会阻止派生记录继续提供给模型。
- 全局 profile 与分项目 profiles 独立。画像 fingerprint 是可用事实范围快照；scopeRecordIds 不等于模型已读过的证据，sourceIds 才是 Agent 声明使用的引用。未声明来源时显示覆盖未知。时间边界改变有效集时同样使画像过期/版本变化；继续乐观锁，不阻塞隐藏。版本仍是内存计数，不能保证跨重启唯一。
- 独立审查确认安装宿主会把 pre-step 消息提交会话历史。每步先通过 Session.append 的 surface replacement 撤回旧插件注入，保留审计原始事件；检索优先本次 decision 中尚未提交的用户消息。画像要附目标范围最新 snapshot（epoch/版本/事实指纹）和非空有效 sourceIds 才可注入；无证明保存仅保留 stale 草稿，旧版本计数不能单独授权发布。来源冲突会传播到派生记录；结构化字段变化统一标记 user-edited。不能清除模型既有知识、历史工具结果或会话摘要。
- 普通明细按当前用户问题关键词检索；常驻独立预算；整条装入字符预算。injectionCount/lastInjectedAt 与搜索 useCount/lastUsedAt 分开。自然语言语义冲突不做全自动判定，结构化规则冲突由用户确认取代。
- 验证：P0 27/27，宿主 P1 10/10，客户端 20/20，phase1 集成 19/19，定向 7 项；三层合成评测 12 场景，可选真实模型适配器经本地合成提供方验证。真实模型质量评分未运行，不能把合成集结果等同于主动服务能力。
- 试玩已在原端口 56001 重启加载宿主更新，原 44 条记忆仍在；浏览器只读验证无记忆写入/JS 异常，390px 无横向溢出。启动 token 会变化，应从当前后台任务输出获取，不把 token 写入文档。
- 本次提交范围包含第一阶段实现、测试、回退基线、说明及此前“全局规则”改名；按用户要求，开发计划的本地修改不纳入本次提交，远端已有版本保持不变。提交/推送状态以 Git 日志为准，勿纳入 analysis 截图/报告或任何真实记忆。

## 架构要点

### 策略解析（三级）

```text
生效策略 = rec.strategy（'' = 跟随） → strategyRules 第一条命中 → settings.strategy
```

宿主端 `strategyOf(rec, settings)`；客户端 `resolveStrategy(rec, global, rules)`。

### 注入（pre-step 钩子）

`digest(records, settings, profile)` 返回 `{text, ledger}`：
- `<memory-rules>`：pinned 全量（预算 `pinnedBudget` 2000 字符）
- `<memory-context>`：摘要模式用 profile.content / 明细模式用 Top N / stale 时跳过摘要回退明细
- `<user-profile>`：hybrid 模式附加

### 存储

- `normalizeRecord` 固定 20+ 字段（含 `strategy`/`pinned`）
- `validateRecord` 纯校验（U+FFFD 检测、长度、枚举值）
- 保存：`pendingSave` + Promise 链串行化，UUID tmp + rename 原子替换
- 损坏 JSON 进只读恢复态（`_loadError`），`persist` 拒绝写入

### HTTP 路由

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/memory/state` | GET | 设置 + 记忆 + profile + llmAvailable |
| `/api/memory/rpc` | POST | `{action, payload}`；action：state/add/update/delete/clear/settings/search/import/export/preview-import |
| `/api/memory/profile` | GET/POST | 画像读写（POST 由 Agent 工具调用） |
| `/api/memory/export` | GET | 整库 JSON 下载 |
| `/api/memory/agents-md` | GET/POST | AGENTS.md 读写 |
| `/api/memory/pending` | GET | 自动沉淀待确认队列 |

### 工具

| 工具 | 作用 |
|---|---|
| `memory_write` | 写入一条记忆（含 strategy/pinned/结构化字段） |
| `memory_search` | BM25 风格搜索（CJK bigram 按连续片段切分） |
| `memory_list` | 按更新时间列出 |
| `memory_forget` | 按 id 删除 |
| `memory_update_profile` | Agent 写入画像摘要（Markdown，≤3000 字符） |
| `memory_read_agents_md` | 读 AGENTS.md |
| `memory_write_agents_md` | 写 AGENTS.md（幂等：内容哈希相同则跳过） |

## 关键文件

| 文件 | 说明 |
|---|---|
| `lib/client.js` | 客户端 UI |
| `lib/index.js` | 宿主端 |
| `lib/shared.js` | 宿主共享函数 |
| `lib/rollback/` | 回退点（stage 0–11 + host stage 0–5.1） |
| `lib/rollback/README.md` | 回退点清单 + 恢复命令 |
| `test/p0-tests.mjs` | P0 隔离测试（27/27） |
| `test/p1-tests.mjs` / `test/p1-client-tests.mjs` | P1 宿主 / 客户端测试（10/10、15/15） |
| `check-demo.mjs` | 浏览器端到端验证（CDP，5 标签 + 窄屏 + 简化视图已移除断言） |
| `verify-*.mjs` | 定向验证脚本（CDP） |
| `THEME-TOKENS.md` | DSH 设计 token 参考 |
| `开发计划.md` | 开发计划（待做 / 已决策 / 风险） |
| `README.md` | 完整文档 |

## 验证命令

```bat
cd /d D:\Dev\Projects\Personal\dsh-plugin\dsh-memory-manager
node --check lib\client.js
node --check lib\index.js
node test\p0-tests.mjs
node test\p1-tests.mjs
node test\p1-client-tests.mjs
node check-demo.mjs "http://127.0.0.1:56001/?token=<token>"
node verify-p0-fixes.mjs "http://127.0.0.1:56001/?token=<token>"
node verify-placement.mjs "http://127.0.0.1:56001/?token=<token>"
node verify-filters.mjs "http://127.0.0.1:56001/?token=<token>"
node verify-hybrid-e2e.mjs "http://127.0.0.1:56001/?token=<token>"
```

## 试玩实例

```bat
cd /d D:\Dev\Projects\Personal\dsh-plugin
set DSH_HOME=D:\Dev\Projects\Personal\dsh-plugin\.dsh-test-home
"D:\Dev\Software\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" web --port 56001 --no-open
:: 输出 URL 带 token，用浏览器打开
```

## 待做事项（详见 开发计划.md）

### 高优先级

| 项目 | 说明 | 依赖 |
|---|---|---|
| 归档流程 | 会话删除 → 关联记忆归档 → 归档超时删除 | `sourceSessionId` + DSH 事件确认（DSH 无此事件，已确认） |
| 自动淘汰 | 归档超 N 天 → 物理删除 | `status` 字段 |

### P1（Codex 报告，已全部完成）

R05–R19 已全部实现，见 `analysis/p1-report.zh-CN.md`。

### P2 / 低优先级

| 项目 | 说明 |
|---|---|
| R18 画像 Markdown 增强 | 一级标题渲染、主题导航 |
| R20 批量维护 | 批量停用/归属/标签 |
| 向量语义检索 | 先建评测基线 |

### 已决策（不要重新讨论）

| 决策 | 结论 |
|---|---|
| 简化 vs 进阶 | 同一存储，不同 UI |
| 画像呈现 | 底层事实列表 + LLM 综合摘要呈现 |
| 画像生成 | Agent 通过工具生成（方案 A），不依赖插件独立调 LLM |
| 注入模式 | 摘要 / 明细 / 混合 |
| 归档 → 删除 | 两阶段 |
| 会话删除触发 | DSH 无此事件，需轮询 |
| 物理格式迁移 | 不做 |
| 练习模式 | 已移除 |
| 紧凑模式 | 已移除 |
| 简化视图 | 已移除 |

## 风险 / 已确认限制

- DSH 无 `session/deleted` 事件（已通过代码扫描确认）
- LLM 路由发现：`listProviders()` 不含 model 列表；`lastRoute` 需先完成一轮对话
- Cordis `inject` 中 `llm` 为必需依赖，无 LLM 环境下插件可能无法加载
- 检索是 BM25 词法匹配，非向量语义检索
- 记忆文件是明文 JSON，无加密

## 编码注意事项

1.​ 客户端必须用 `window.__ModuleLoader__.load` 包装，只 `require("react")`
2.​ 宿主端零外部依赖（只用 Node 内置），否则绝对路径挂载会失败
3.​ 修改后必须 `node --check` + 用 `verify-*.mjs` 脚本验证
4.​ 宿主端变更需重启测试实例（客户端热加载即可）
5.​ **不要在 Windows 终端用 curl 发中文 JSON**（GBK 编码会损坏数据），用 Node 脚本发 UTF-8
6.​ 写入时检测 U+FFFD（`validateRecord` 已实现）
7.​ `client.js` 第 2 行的 bundle id 必须等于 `package.json` 的 `name`（当前 `dsh-memory-manager`）；改名或回退旧快照后不改这里，客户端会报 `duplicate factory registration`、入口不激活
8.​ 包名/仓库名是 `dsh-memory-manager`，但运行时标识与存储目录仍是 `dsh-memory`（`%APPDATA%\dsh-memory`），不要跟着改，否则丢已有记忆

## 仓库约定

- `.gitignore` 排除 `analysis/`（含真实记忆的截图与快照）、根目录 `*.png`、`tools-lib.js`（DSH 源码摘录）
- 一次性脚本与旧任务书放在 `analysis/legacy/`（本地保留、不进库）；仓库根只保留可复用入口
- 提交前用 `git status` 确认没带入截图；`npm pack --dry-run` 应只有 6 个文件（3 个 `lib/*.js` + README + LICENSE + package.json）
- 远端 `origin` = https://github.com/SWAlbert-0/dsh-memory-manager ，push 走 `gh` 凭据（仓库级 credential helper，未改全局配置）
