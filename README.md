# dsh-memory-manager — DSH 记忆管理插件

一个 DSH 插件（宿主端 + Web 客户端），把「用户长期记忆」做成可管理的产品能力：

- **入口位置可配置**：记忆入口可显示在**侧边栏**、**左下角设置页**，或**两处都显示**（默认两处）
- **记忆列表筛选**：关键词搜索 + 类型 / 范围 / 标签筛选 + 排序（更新、创建、重要性、使用频率）
- **视图选项**：分组（按时间 / 类型）、加载骨架与失败重试
- **四种记忆策略**：Simple Notes / Enhanced Notes / JSON Cards / Advanced JSON Cards（参考《用户记忆和知识库》第 3 章）
- **导入导出**：整库 JSON 导出/导入（合并或替换），可备份、可迁移
- **说明页**：解释技术名词与使用方式（策略、类型、范围、注入、工具、导入导出等）
- **个性化设置**：入口位置、自动注入开关、注入条数/字符上限、常驻预算、自动沉淀开关和轮数间隔
- **常驻记忆**：标记 pinned 的记录优先注入 `<memory-rules>`，不占普通记忆条数，有独立字符预算
- **对 Agent 隐藏**：标记 hidden 的记录仍保留在库中（管理界面可见、可编辑、可恢复），但不进入任何模型读取出口：自动注入（含常驻）、`memory_search`、`memory_list`、画像摘要与自动沉淀的提取上下文
- **全局规则**：读写固定的 `~/.dsh/AGENTS.md`，保存前确认并备份，每次会话由 DSH 自动注入
- **自动沉淀**：每隔指定轮数调用 LLM 提取最多 3 条事实，进入待确认队列，确认后写入
- **模型工具**：`memory_write` / `memory_search` / `memory_list` / `memory_forget` / `memory_update_profile` / `memory_read_agents_md` / `memory_write_agents_md`
- **自动上下文**：每轮按任务相关性选择有效记忆注入请求；宿主记录注入快照，插件在下一步通过 surface replacement 撤回旧快照，原始事件仅留作审计
- **用户画像**：Agent 通过 `memory_update_profile` 工具把记忆事实综合为 Markdown 画像摘要，展示在「画像」标签页；空状态引导用户在任意会话中让 Agent 生成；注入模式可选摘要 / 明细 / 混合

> 包名与仓库名是 `dsh-memory-manager`；**运行时标识和数据目录仍是 `dsh-memory`**（`%APPDATA%\dsh-memory`），改名不影响已有记忆和 profile 配置。

## 目录

```text
dsh-memory-manager/
  package.json          # main = lib/index.js；dsh.client 声明 Web 客户端
  lib/index.js          # 宿主端：存储、工具、注入、HTTP 路由
  lib/client.js         # 客户端：侧边栏图标 + 管理页（React，无构建步骤）
  lib/shared.js         # 宿主/客户端共享的纯函数（校验、策略、检索、注入）
  lib/rollback/         # 历史快照（回退用，见该目录 README）
  test/                 # 隔离测试：p0 / p1 / p1-client
  check-demo.mjs        # 浏览器端到端验证（CDP）
  verify-*.mjs          # 按需的定向验证脚本
  install.mjs           # 把插件挂到指定 profile（默认只打印，不写入）
```

## 数据存放

默认：`%APPDATA%\dsh-memory\memory.json`（Windows）或 `~/.local/share/dsh-memory/memory.json`。
可用环境变量 `DSH_MEMORY_DIR` 覆盖。全局规则功能另行读写固定的 `~/.dsh/AGENTS.md`，写入前备份到同目录。

文件结构：

```json
{
  "version": 1,
  "settings": { "strategy": "advanced", "inject": true, "maxInject": 6, "maxInjectChars": 1500, "pinnedBudget": 2000, "autoCapture": true, "autoCaptureInterval": 3 },
  "memories": [
    {
      "id": "mem_...", "kind": "semantic", "scope": "global",
      "text": "用户偏好靠窗座位，并且是素食者。",
      "category": "", "subcategory": "", "key": "", "value": "",
      "backstory": "", "person": "", "relationship": "",
      "tags": ["旅行", "饮食"], "importance": 4,
      "createdAt": 0, "updatedAt": 0, "useCount": 0, "lastUsedAt": 0,
      "source": "user", "pinned": false, "visibility": "visible"
    }
  ]
}
```

## 第一阶段：项目、来源与有效性（2026-10-26）

### 项目边界与旧数据

- 项目身份来自**调用会话创建时的绝对目录**，规范化后生成 `projectId`；Windows 路径统一大小写。不是插件进程的当前目录，也不是最近一个会话的目录。切换工作子目录不改变归属；不同根目录/工作树分别隔离，目录搬迁需显式认领。
- 模型自动注入、搜索、列表、提取已有事实上下文以及画像，都只使用**全局 + 当前项目**的有效可见记录。缺少会话上下文时只读全局，不能由 Agent 指定另一个 `projectId` 越界读取。
- 旧 `scope=project` 记录如果没有 `projectId`，仍保留、可管理，但不提供给模型。打开“项目与事实状态筛选 → 待认领的旧项目记录”，编辑时选择已登记项目或填写项目绝对路径，保存即确认归属；不会自动猜测。
- 存储标识仍是 `dsh-memory`，schema `version: 1` 不变；新增字段为兼容性扩展，不重写现有事实。导出包含项目目录表 `projects`、全局画像 `profile` 和分项目画像 `profiles`。

### 来源、时间与冲突

| 字段 | 含义 |
|---|---|
| `projectId` | 项目身份；全局记录为空，旧项目记录为空表示尚未认领 |
| `evidence` | 保存的用户原句；没有原句时不伪造证据 |
| `sourceSessionId / sourceMessageId / sourceEventSeq` | 来源会话、消息、事件位置引用 |
| `observedAt / confirmation` | 观察时间、手动输入/用户批准/Agent 记录等确认方式 |
| `evidenceRefs` | 合并等派生事实依赖的记录 ID；来源隐藏或删除后派生记录停止提供给模型 |
| `occurredAt` | 事实发生时间，不等于记录编辑时间 |
| `validFrom / validUntil` | 生效/失效时间，UTC epoch 毫秒；区间为 `[validFrom, validUntil)`，空值代表未限定 |
| `conditions` | 适用条件；人物/关系沿用 `person / relationship` |
| `status / supersededBy` | active（当前）、historical（历史）、conflict（待确认）、superseded（被取代）及取代记录引用 |
| `injectionCount / lastInjectedAt` | 实际注入明细的次数/最近时间，与主动搜索的 `useCount / lastUsedAt` 分开 |

时间输入在界面中使用浏览器本地时间，保存为 UTC 毫秒。未生效、过期、历史、被取代和待确认冲突不进入模型出口；可见性独立判断，**恢复可见不等于恢复有效**。

相同项目/主体/关系/条件/结构化路径下的当前多值事实会暂停提供给模型，等待审阅；对象、条件不同或有效期不重叠的事实可并存。审阅中可明确选择“以此条取代本组其他记录”，保留旧记录而不是按更新时间自动覆盖。此检测是结构化规则，不是通用自然语言冲突识别。

“查看依据”显示保存的原句、来源引用及合并前的关联记录，不自动读取整段聊天。旧记录无来源、原会话未加载/已删除时不能视为已核实；手动改写后的原句也不自动证明新陈述。合并重复项现在保留其余副本为历史记录，并建立来源依赖；不会把隐藏记录的标签合入可见记录。

### 分范围画像与相关性注入

- 全局画像只总结全局事实；项目画像只总结全局 + 对应项目事实。选择“画像范围”查看，项目画像须在该项目会话中生成。没有可用项目画像时回退范围内相关明细，不借用其他项目画像。
- 画像保存范围快照与事实指纹；隐藏、状态/条件变化、有效期届满等会使摘要不可注入。旧画像没有范围清单时保留显示并标记待更新。
- `memory_update_profile` 增加 `scope`（默认 global）、`sourceIds` 与 `basedOnSnapshot`。全局画像先读 `memory_list(scope=global)`；项目画像先读不带 scope 过滤的列表（全局 + 当前项目），提交该范围返回的 `snapshot`。只有匹配最新快照并附非空、当前有效的来源 ID，画像才可注入；其他项目、隐藏/过期/冲突来源不能引用。`scopeRecordIds` 是范围清单，不等于实际引用或完整阅读证明；`sourceIds` 是 Agent 声明使用的来源，不是语义真实性证明。
- 乐观 `basedOnRevision` 校验保留，隐藏操作不被阻塞；有效集因时间变化时同样更新版本。新增快照含进程随机 epoch、范围、事实指纹与版本，不能跨重启重用。旧客户端不附快照/来源时仍可保存管理草稿，但草稿保持 stale、不进入模型，不能借新指纹洗白旧内容。
- 常驻记录仍使用独立预算；普通明细按当前用户问题检索并排序，按完整条目装入字符预算，不从限定条件中间截断。摘要模式提供范围内概览，明细/混合模式提供相关事实。检索仍是 BM25 风格词法匹配，没有加入向量服务。
- `memory_list` 返回 `truncated`；结果被截断时不得声称已读完整记忆库。分页与更完整的渐进读取属于第二阶段。
- pre-step 优先使用本次待提交的用户消息检索，提交历史仅作后备。每步先用标准 Session surface replacement 撤回旧插件注入，再提供当前快照；原始日志不删除，撤回标记不会被重复替换。隐藏不能抹去模型已读过的信息、旧工具结果、用户/助手引用或已生成的会话摘要，不宣称能清除历史知识。

### 验证与效果评测

```sh
node --check lib/index.js
node --check lib/shared.js
node --check lib/client.js
node test/p0-tests.mjs
node test/p1-tests.mjs
node test/p1-client-tests.mjs
node test/phase1-tests.mjs
node verify-p0-fixes.mjs
node test/phase1-eval.mjs
node test/phase1-live-eval-tests.mjs
node check-demo.mjs "<现有试玩页的带 token URL>"
```

回归基线：P0 **27/27**、宿主 P1 **10/10**、客户端 **20/20**、第一阶段集成 **19/19**、定向验证 **7 项**。三层合成评测包括基础回忆、跨会话理解和关联/澄清证据，共 **12 个场景**；正例计算标准 recall@6、命中率与 MRR，负例单独计拒答成功率。当前固定合成集正例 recall@6/MRR 均为 1，项目/隐藏/过期误用为 0；高频无关干扰的受控注入对比为旧策略 0、新策略 1，**不代表真实任务总体效果**。

默认评测不调用真实模型；只验证工具/注入与确定性日期规则，不把“证据已召回”宣称为模型会主动提醒。可选真实模型模式使用用户显式配置的 OpenAI 兼容端点，通过真实记忆工具进行最多 6 步只读交互，记录回答模式检查、工具轨迹、API 用量与延迟：

- 设置 `DSH_MEMORY_EVAL_LIVE=1`、`DSH_MEMORY_EVAL_BASE_URL`（例如用户自己的兼容服务 `/v1` 地址）、`DSH_MEMORY_EVAL_MODEL`，按需设置 `DSH_MEMORY_EVAL_API_KEY`，再运行 `node test/phase1-eval.mjs <报告路径>`。
- 无默认外发端点；数据均为脚本内合成案例，不读真实记忆库。可选适配器已用本地合成提供方验证，但**未运行真实模型质量评分**。
- 不提供密钥时不附 Authorization。不要把密钥写进仓库或报告。回答模式检查不能替代独立语义审核；未经测量的无依据断言率/真实 token/费用不报告为零。工具提示词开销对比记录精确 schema 字符数，不冒充模型 tokenizer 的 token 数。

## 四种策略

| 策略 | 存储形态 | 适合 | 渲染 |
|---|---|---|---|
| Simple Notes | 最小事实 | 偏好、邮箱、账号等短事实 | `- 事实` |
| Enhanced Notes | 带上下文的段落 | 经历、背景、叙事 | `- [kind] 段落` |
| JSON Cards | 类别→子类别→键值 | 结构化资料，可部分更新 | `- work.position.title: 高级工程师` |
| Advanced JSON Cards | JSON Cards + backstory/person/relationship | 需要消歧的人物/关系/来源 | `- 张医生 / 用户父亲的牙科医生 — health.doctor.dentist: 张医生（背景：…）` |

策略只影响**存储字段的侧重与渲染方式**，底层是同一份记录；切换策略不会丢数据。

## 安装（挂到 profile）

插件支持以**绝对路径**挂载，不必复制进 `~/.dsh`。在目标 profile 的 `cordis.patch.yml` 追加：

```yaml
- insert:
    - id: memory
      name: 'file:///D:/path/to/dsh-memory-manager/lib/index.js'
```

然后重启 DSH（`cordis.patch.yml` 不是热加载的）。也可以用 `install.mjs`：

```bat
node install.mjs --profile "%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml"
:: 默认只打印将要写入的内容；加 --write 才真正写入（会备份原文件）
```

> 注意：本仓库不会自动改动你的真实 profile；上面的命令只是打印将要写入的内容，确认后加 `--write` 才会生效。

## 本地测试实例

开发时可用隔离的 `DSH_HOME` 起一个实例，不影响真实的 `~/.dsh` 会话与设置：

```bat
set DSH_HOME=%USERPROFILE%\.dsh-test-home
"<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd" web --port 56001 --no-open
```

启动后会打印带 token 的 URL。注意：`DSH_HOME` 只隔离会话与设置，**记忆库仍读 `%APPDATA%\dsh-memory`**；要隔离数据请再设 `DSH_MEMORY_DIR`。

## HTTP 接口（宿主端）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/memory/state` | 读取设置 + 全部记忆 |
| POST | `/api/memory/rpc` | `{action, payload}`，action ∈ add/update/delete/clear/settings/search/import/export/preview-import/approve/reject/register-project/supersede/merge-duplicates |
| GET | `/api/memory/export` | 下载整库 JSON |
| GET / POST | `/api/memory/agents-md` | 读取 / 保存固定全局规则（写入前备份） |
| GET | `/api/memory/pending` | 查询自动提取待确认队列（宿主内存态） |
| GET / POST | `/api/memory/profile` | 分范围画像；GET 用 `?projectId=` 选择，POST 支持 `projectId / basedOnRevision / basedOnSnapshot / sourceIds` |

路由只对 owner Peer 开放，浏览器同源 cookie 即可（`ctx.connection.fetch.register`）。

## 模型工具

| 工具 | 作用 |
|---|---|
| `memory_write` | 写入一条长期事实（含 kind/scope/tags/结构化字段） |
| `memory_search` | 关键词/自然语言检索（中文按 bigram 切分） |
| `memory_list` | 按更新时间列出 |
| `memory_forget` | 按 id 删除 |

## 设计说明

- **宿主零外部依赖**：只用 Node 内置模块，工具定义用普通 JSON Schema 对象，因此插件可以从任意绝对路径加载，无需 `node_modules`。
- **客户端无构建**：`lib/client.js` 直接写 `window.__ModuleLoader__` 工厂，只依赖平台共享的 `react`，改完刷新页面即可（DSH 会按文件 mtime 重新发布 bundle）。
- **注入不落盘**：`agent/pre-step` 里把记忆作为一条临时 `user` 消息加入本次请求，不写会话事件日志；同一请求内不会重复注入。
- **持久化**：内存态 + 200ms 防抖写盘（临时文件 + rename 原子替换），进程退出时 flush。

## 已知限制

- 自动沉淀依赖可选 LLM 服务，默认使用 `deepseek-official` / `deepseek-v4-flash`；按会话计算轮数，队列只在宿主内存中，宿主重载或浏览器刷新后清空（面板内「刷新」只更新数据）。
- 检索是 BM25 风格的词法匹配，没有向量语义检索。
- 没有加密；记忆文件是明文 JSON，请勿存放密码/token（提示词里也明确禁止）。
- 导入/导出为整库级别，暂不支持单条文件导入。
- `hidden` 只约束“从记忆库读取”的出口；自动沉淀的输入是对话原文，若用户在对话中再次说出被隐藏事实的改写版，仍可能作为新候选入库（精确同文会被去重，改写不会）。需要绝对不再出现的事实，请同时删除该记录。
- 设置页在「记忆」面板内，尚未注册到 DSH 全局 Settings 页面。

## UI 改版（Codex + 前端设计技能）

2026-10-23 由 Codex（`gpt-6-astra`，`codex exec`，danger-full-access）按
`frontend-design` / `webapp-testing` 技能重做了 `lib/client.js` 的视觉层：

- 居中 1040px 布局、分段式标签、类型色点（语义=deepseek 蓝 / 情景=琥珀 / 程序=绿）、
  轻量记忆卡片、策略单选卡、导入方式分段控件
- 全部颜色/圆角/阴影改用 DSH 的 `--dsw-*` token（见 `THEME-TOKENS.md`），明暗主题自动适配
- 720px 以下单列布局；键盘导航（方向键/Home/End）、`aria-selected` / `aria-pressed`、
  可见焦点环、`prefers-reduced-motion`
- 保留经典脚本包装、`apply`/`inject` 导出、槽位注册与全部 API 字段

### 「说明」标签页

当前标签顺序为「记忆 / 画像 / 全局规则 / 设置 / 说明」；新增与审阅使用弹窗，导入导出位于设置；「说明」用于解释技术名词与使用方法：

- **这个面板做什么**：长期记忆与会话轨迹的区别、两个写入入口
- **快速上手**：4 步（让 Agent 记 / 手动添加 / 使用记忆 / 维护备份）
- **四种记忆策略**：Simple Notes、Enhanced Notes、JSON Cards、Advanced JSON Cards 的定义、
  适用场景与代价，以及「怎么选」的建议
- **记忆类型**：语义 / 情景 / 程序
- **其他技术名词**：范围、重要性、标签、自动注入、autoCapture、模型工具、检索方式、
  导入/导出、存储位置
- **使用建议与注意**：只记长期事实、不存敏感信息、注入的 token 成本、记忆是数据不是指令、
  替换导入前先备份

说明页沿用同一套 `--dsw-*` token 与组件样式；390px 下标签自动换行、无横向溢出。

### 入口位置（侧边栏 / 设置页 / 两处）

「策略与设置」里新增「入口位置」单选：

| 选项 | 效果 |
|---|---|
| 两处都显示（默认） | 左侧栏「记忆」+ 左下角账号菜单 → 设置 → 记忆 |
| 仅侧边栏 | 只注册 `sidebar.panellist` + `main` |
| 仅设置页 | 只注册 `settings.section`（设置对话框的「记忆」页） |

实现上，客户端在 `apply` 时读取 `/api/memory/state` 的 `entryPlacement`，按值动态注册
`sidebar.panellist` / `main` / `settings.section`，并保存各自的 disposer；保存设置后通过
`dsh-memory:placement` 事件即时重挂载，无需刷新页面。设置项持久化在宿主端 `settings.entryPlacement`。

验证（本机测试实例）：

| 检查 | 结果 |
|---|---|
| `node --check lib/client.js` | 通过 |
| 侧边栏「记忆」入口 + 面板渲染 | 通过（20 条记忆） |
| 亮色主题 | 卡片 `#fff`、边框 `rgba(0,0,0,.1)`、文字 `#0f1115` |
| 暗色主题 | 卡片 `#232325`、边框 `rgba(255,255,255,.12)`、文字 `#f9fafb` |
| UI 交互 | 新增 20→21、搜索过滤到 1 条、删除后回到 20 |
| 390px 窄屏 | 无横向溢出；5 个标签自动换行（两行） |
| 「说明」页 | 5 个标签齐全，内容渲染完整，无横向溢出 |
| 入口位置 `both` | 侧边栏「记忆」存在；设置对话框导航含「记忆」 |
| 入口位置 `sidebar` | 侧边栏存在；设置导航不含「记忆」 |
| 入口位置 `settings` | 侧边栏不存在；设置导航含「记忆」，点击后完整渲染面板 |
| 动态切换（不刷新） | `both → settings → both` 侧边栏入口即时消失/恢复 |
| 筛选：类型 | 情景筛选 = 1 条（基数 22） |
| 筛选：范围 | 项目筛选 = 1 条 |
| 筛选：标签 | `#筛选测试A` = 1 条 |
| 筛选：搜索 | 关键词 = 1 条；清除后恢复 22 条 |
| 排序 | 切换「重要性」后首条变为最高重要性记忆 |

## P0 + P1 可读性优化（2026-10-23）

按 Codex 分析报告（`analysis/memory-tab-review.zh-CN.md`）实施：

**P0（纯样式）**
- 正文 **14/22**、元信息 **12/18 secondary**（亮色对比度从 3.4–3.7:1 提升到约 5.3–5.8:1）
- 卡片 padding 16px（窄屏 12px）、间距 12px、`overflow-wrap:anywhere`
- 操作按钮默认 secondary、删除仅在 hover/focus 显示 error 色；窄屏命中区 44×44
- 焦点改为 secondary 实线 outline（2px + offset 2px）
- 卡片 hover 只改边框，不再整卡变底

**P1（显示交互）**
- 长文 **4 行（窄屏 5 行）clamp + 展开全文/收起**（`aria-expanded`/`aria-controls`）
- 标签最多 **3 个（窄屏 2 个）**，其余 `+N` 展开、可收起
- 时间改为相对时间（刚刚 / X 分钟前 / X 小时前 / X 天前 / 日期），`<time datetime>` + `title` 保留完整时间
- 窄屏筛选折叠为「筛选（N）」按钮，展开后类型/范围各占整行；桌面筛选保持单行
- 筛选栏吸顶（`position: sticky`，滚动后 top=0）
- 类型用色点+文字、范围用纯文字、标签用轻底；结果计数 `role=status aria-live=polite`
- 编辑/删除按钮通过 `aria-describedby` 关联本卡正文

实测：桌面首卡 y≈278（原 254）、窄屏 y≈352（原 436）；390px 无横向溢出；明暗主题
卡片/文字/元信息颜色均随 token 切换；长文展开后高度 220px、`data-collapsed=false`。

**回退**：所有历史版本已归档到 `lib/rollback/`，命名与恢复命令见
[lib/rollback/README.md](lib/rollback/README.md)。

## P2 完整实现（2026-10-23）

按报告 P2 全部落地：

| 项 | 实现 |
|---|---|
| **P2-1 分组** | 新增「分组」选择：不分组 / 按更新时间（今天 / 昨天 / 更早）/ 按类型（语义 / 情景 / 程序）；组标题 `12/18 600`、组间 24px、标题下 8px，组内沿用当前排序 |
| **P2-2 紧凑模式** | 已按反馈**移除**；不再有「紧凑」按钮，默认始终为非紧凑样式（卡片 padding 16px / 窄屏 12px） |
| **P2-3 结构化正文** | `renderParts()` 把正文拆成结构化片段：人物/关系 `13/20 secondary`、字段路径 `12/18 secondary` + 等宽字体、值 `14/22 primary`、背景 `12/20 tertiary`；不再按冒号硬切字符串，存储与注入不变 |
| **P2-4 加载 / 空 / 失败** | 初次加载显示 3 张骨架卡（`aria-busy`、`bg-skeleton`、`radius-md`）；失败显示原因 + 「重试」（复用 `refresh`）；无匹配保留原文案与「清除筛选」 |

另外修复：客户端改为**乐观挂载两处入口**，状态接口变慢时侧边栏「记忆」不再延迟出现。

验证：结构化片段字号 13/12(mono)/14/12；分组标题 `今天 · 41`、`语义 · 29 / 情景 · 1 / 程序 · 11`；
类型/范围/标签间距 20px（窄屏 panel gap 12px）、紧凑按钮已移除、卡片 padding 16px；错误态含「加载失败 / 重试 / mock failure」；慢请求下骨架 3 张且
`aria-busy=true`；入口位置与筛选回归通过。

截图：`p2-spacing-light.png`、`p2-grouping-light.png`、`p2-narrow-light.png`。

截图：`p0p1-desktop-light.png`、`p0p1-desktop-dark.png`、`p0p1-narrow-light.png`、`p0p1-narrow-dark.png`。

## P1 体验提升（2026-10-24）

按 Codex 报告 P1 全部 11 项落地（R05–R19）：

| 项 | 实现 |
|---|---|
| **R05 导航收敛** | 7 个标签收敛为 5 个：记忆 / 画像 / 全局规则 / 设置 / 说明；「新增」内联到记忆页；「导入导出」移入设置 |
| **R06 表单** | 保存中禁用 + error 状态；空内容拦截；标签支持中英文逗号；显示实际生效格式；切标签脏表单确认 |
| **R07 窄屏筛选折叠** | 高级筛选折叠为「筛选（N）」按钮；标签/下拉宽度 100%；无横向溢出 |
| **R08 注入追踪** | `digest` 返回 `{text, ledger}`（pinned/regular 条数、字符数、省略数） |
| **R09 重复/矛盾审阅** | 「质量」按钮检测精确重复和同路径多值，提供保留最新/合并标签/忽略操作 |
| **R10 检索修复** | CJK bigram 不再跨标点；单字母技术词保留；BM25 长度归一化修复 |
| **R11 提取窗口** | 提取覆盖间隔内所有轮次（buffer 累积）；候选带 `evidence` 来源 |
| **R14 全局规则审批** | 保存前预览差异；工具描述加用户确认要求；幂等检查 |
| **R15 渐进模块化** | 宿主端校验/归一化/渲染/检索函数拆到 `lib/shared.js`（相对 import，零依赖不变） |
| **R17 变更同步** | 10s 轮询 state 差异自动刷新面板（简化模式不轮询） |
| **R19 边界说明** | 注入开关文案、全局规则说明、帮助页 Term 均已更新 |

验证：Codex 报告 + 独立复核：语法 × 3、P0 回归 17/17、P1 新增 9/9、客户端模拟 5/5、浏览器 5 标签 + 44 卡 + 窄屏筛选折叠。

**回退**：`lib/rollback/client.stage10-before-p1.js` + `host.stage5-before-p1.js`。

## P0 安全与可靠性修复（2026-10-24）

按 Codex 双视角报告的 P0 建议实施：

| 项 | 修复内容 |
|---|---|
| **R02 画像遗忘** | `profile.stale=true` 时 `digest` 跳过摘要注入，回退明细模式；删除/修改/遗忘均触发 `markStale` |
| **R03 导入预览** | 新增 `preview-import` action（无副作用预览：新增/更新/保留/无效计数）；replace 导入前自动创建完整 state 快照备份；导出包含画像 |
| **R03 导出含画像** | RPC 和下载导出均包含 `profile` |
| **R04 队列保全** | `extractMemories` 失败和后台 capture 失败不再清空 pendingCaptures；客户端 reload 不触发 reject-all |
| **R12 统一校验** | 新增 `validateRecord`（id/text/importance/tags/strategy/kind/scope + U+FFFD 检测）；load/import normalize 前校验；settings 校验统一 |
| **R13 保存可靠性** | `pendingSave` + Promise 链串行化；UUID tmp 文件；损坏 JSON/权限错误进入只读恢复态，不覆盖原文件；`persist` 在恢复态拒绝写入 |
| **R01 范围隔离** | `normalizeRecord` scope 更新修复；`memory_search`/`memory_list` 工具增加可选 `scope` 过滤参数 |
| **对比度** | 成功色 `c.msg("ok")` 从 `#22c55e` 改为 success+label-primary 混合 |
| **客户端** | 导入预览流程 + 确认文案 + 错误处理；loadError 显示只读恢复态警告 |

验证：Codex 隔离测试 **17/17 PASS**；独立复核 7 项关键行为全部通过（含 U+FFFD 拒绝、scope 覆盖、preview-import 计数、export 含 profile、R02 stale 检测）。

**回退**：`lib/rollback/client.stage8-before-p0fix.js` + `host.stage5-before-p0fix.js`。

## 记录可见性 visible / hidden（2026-10-24）

每条记忆新增 `visibility` 字段（`visible` 默认 / `hidden`）。隐藏语义是**只对模型隐藏**，不是删除：

- 记录仍保存在 `memory.json`，管理界面正常显示，可编辑、可恢复；
- 不进入任何模型读取出口：
  1. `agent/pre-step` 自动注入 —— 过滤发生在 pinned 之前，**hidden 的常驻记忆也不注入**；
  2. `pickForInjection()` 普通记忆 Top N 选择；
  3. `memory_search` 工具；
  4. `memory_list` 工具；
  5. 用户画像 —— 摘要模式整段注入 `profile.content`，因此隐藏/恢复记录时调用 `markStale()`，摘要过期后回退明细；
  6. 自动沉淀的提取上下文（提示词里的「已有记忆」）；
- 工具侧不提供「读取 hidden」的参数；`memory_write` 也不暴露 `visibility`；
- 管理 RPC `search` 默认不含 hidden，只有显式 `includeHidden: true` 才返回；`memory_forget` 工具拒绝删除 hidden（管理界面仍可删除）；
- 质量审阅「合并标签」不会把 hidden 行的 tags 并入 visible 记录；
- 记忆列表页有一条非阻塞提示：隐藏会立即生效，Agent 不再读取；记录仍保留，画像摘要会标记为待更新；
- 画像写入带 revision 乐观锁：`memory_list` / `memory_search` 返回 `revision`，`memory_update_profile` 在画像 stale 时必须携带该 revision，版本不匹配返回 `profile-outdated` 并拒绝写入，避免隐藏/删除前生成的旧摘要覆盖失效标记；加载旧库时若 hidden 记录的 `updatedAt` 不早于 `profile.generatedAt`，画像自动标记 stale；
- 导入旧数据没有该字段时按 `visible` 处理；导出保留该字段；存储版本号不变（超集字段，`normalizeRecord` 兜底）；
- 客户端：卡片上有「对 Agent 隐藏 / 恢复对 Agent 可见」开关与「已隐藏」徽标；筛选栏有可见性三态（全部 / Agent 可见 / 已隐藏）；新增/编辑表单有隐藏复选框；说明页补充文案。

验证：`node --check` × 3；`p0-tests` **27/27**、`p1-tests` **10/10**、`p1-client-tests` **15/15**；`verify-p0-fixes` 7 项；浏览器 `check-demo` 额外断言三态可见性、弹窗开关、高级选项、窄屏 44px 操作命中区与导入预览按钮。

## 设计评审 P1 修整（2026-10-24）

按 Codex `frontend-design` 评审（本地报告 `analysis/design-review/codex-report.md`）处理 4 项 P1：

| 项 | 修整 |
|---|---|
| **P1-01 对比度** | 警告文字改用 `warnText`（warn 55% + label-primary 45%）：亮色约 5.6:1、暗色约 10:1；筛选标签、策略说明、辅助文字从 tertiary 改为 secondary |
| **P1-02 状态 / 操作分离** | 卡片元信息只保留状态徽标（常驻 / 已隐藏）与类型、范围、标签、时间；常驻、隐藏、编辑、删除收进独立操作组，文案改为「设为常驻 / 取消常驻」「对 Agent 隐藏 / 恢复对 Agent 可见」 |
| **P1-03 窄屏筛选** | 展开筛选时整条筛选栏不再吸顶（`position: static`）；窄屏搜索独占一行；窄屏隐藏次要注入提示 |
| **P1-04 画像排版** | 支持 `# / ## / ###`、连续 `-` 列表合并、行内代码与粗体；正文统一 14px，标题 18 / 15 / 14px |

验证：`p1-client-tests` **11/11**；`check-demo` 新增 `filterPosition=static` 断言；窄屏实测展开前首卡 y≈402、展开后 y≈548，滚动 420px 后筛选栏 y=-158（不再吸顶）。

**回退**：`lib/rollback/client.stage16-before-design-p1.js`。

## 设计评审 P2 修整（2026-10-24）

按同一份 Codex 评审处理 8 项 P2：

| 项 | 修整 |
|---|---|
| **P2-01 可见性筛选** | 先改为「仅看已隐藏」+ 默认包含说明；后续升级为三态，见下节 |
| **P2-02 隐藏空状态** | 仅隐藏筛选且库内 0 条时显示「还没有已隐藏的记忆…」，并提供「查看全部记忆」 |
| **P2-03 设置保存** | 顶部提示「修改后点底部『保存设置』生效」；有未保存修改时就近显示状态；入口说明改为「保存后…」 |
| **P2-04 导入** | 标题「导入（先预览）」、按钮「预览导入」；消息区分 info / ok / err |
| **P2-05 表单层次** | 内容（必填）置顶 → 类型 / 范围 / 重要性 / 标签 → 常驻 / 隐藏 → 「高级选项」折叠（格式与结构字段）；提交统一「新增记忆 / 保存修改」 |
| **P2-06 文案** | 列表合并为一条结论；说明页去掉首句术语；隐藏卡片补「默认显示全部」 |
| **P2-07 触屏命中区** | 窄屏记录操作按钮最小高度 44px（桌面 30px） |
| **P2-08 结构化路径** | 路径独立成行（`display:block`），值仍在首要阅读位置；不改宿主 secondary token |

验证：`p1-client-tests` **12/12**；`check-demo` 新增 `previewImport`、`importHeading`、`actionHeight=44` 断言；DOM 探针确认表单首字段为「内容（必填）」、高级选项默认折叠、设置未保存提示生效；无 console 错误。

**回退**：`lib/rollback/client.stage17-before-design-p2.js`。

## 设计评审 P2 增强（2026-10-24）

在 P2 基础上继续处理三项 UI 增强：

| 项 | 实现 |
|---|---|
| **可见性三态** | 筛选栏改为「全部 / Agent 可见 / 已隐藏」三态控件；默认全部（含隐藏）；窄屏筛选高度 294px，展开时 `position: static` |
| **新增/审阅弹窗** | 「+ 新增记忆」「审阅重复与矛盾」改为 `role=dialog` 弹窗；`aria-modal`、遮罩 / Esc 关闭、焦点进入与循环、关闭后恢复焦点与 body 滚动；编辑沿用同一弹窗 |
| **高级选项样式** | `details` 卡片化：边框、底色、两行标题（主标题 + 副标题）、旋转箭头；`summary` 高约 54px，展开时箭头旋转 180° |

验证：`p1-client-tests` **15/15**；`check-demo` 断言 `visibilityFilter`（3 个可见性按钮）、`modal.open/closed`、`advanced.present/open=false`；DOM 探针实测 44 / 1 / 43 条三态切换、弹窗 720×531、焦点在弹窗内、Esc 关闭并恢复 body 滚动、无 console 错误与写请求。

**回退**：`lib/rollback/client.stage18-before-ui-modal.js`。

**回退**：`lib/rollback/client.stage12-before-visibility.js` + `host.stage6-before-visibility.js`。
