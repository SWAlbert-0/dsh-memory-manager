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
- **规则文件**：读写固定的 `~/.dsh/AGENTS.md`，保存前确认并备份，每次会话由 DSH 自动注入
- **自动沉淀**：每隔指定轮数调用 LLM 提取最多 3 条事实，进入待确认队列，确认后写入
- **模型工具**：`memory_write` / `memory_search` / `memory_list` / `memory_forget` / `memory_update_profile` / `memory_read_agents_md` / `memory_write_agents_md`
- **自动上下文**：每轮把高价值记忆以 `<memory-context>` 注入请求（不写入会话日志，不污染历史）
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
可用环境变量 `DSH_MEMORY_DIR` 覆盖。规则文件功能另行读写固定的 `~/.dsh/AGENTS.md`，写入前备份到同目录。

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
      "source": "user", "pinned": false
    }
  ]
}
```

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
| POST | `/api/memory/rpc` | `{action, payload}`，action ∈ add/update/delete/clear/settings/search/import/export/approve/reject |
| GET | `/api/memory/export` | 下载整库 JSON |
| GET / POST | `/api/memory/agents-md` | 读取 / 保存固定规则文件（写入前备份） |
| GET | `/api/memory/pending` | 查询自动提取待确认队列（宿主内存态） |

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

当前标签顺序为「记忆 / 新增 / 策略与设置 / 导入导出 / 规则文件 / 说明」；「说明」用于解释技术名词与使用方法：

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
| **R05 导航收敛** | 7 个标签收敛为 5 个：记忆 / 画像 / 规则文件 / 设置 / 说明；「新增」内联到记忆页；「导入导出」移入设置 |
| **R06 表单** | 保存中禁用 + error 状态；空内容拦截；标签支持中英文逗号；显示实际生效格式；切标签脏表单确认 |
| **R07 窄屏筛选折叠** | 高级筛选折叠为「筛选（N）」按钮；标签/下拉宽度 100%；无横向溢出 |
| **R08 注入追踪** | `digest` 返回 `{text, ledger}`（pinned/regular 条数、字符数、省略数） |
| **R09 重复/矛盾审阅** | 「质量」按钮检测精确重复和同路径多值，提供保留最新/合并标签/忽略操作 |
| **R10 检索修复** | CJK bigram 不再跨标点；单字母技术词保留；BM25 长度归一化修复 |
| **R11 提取窗口** | 提取覆盖间隔内所有轮次（buffer 累积）；候选带 `evidence` 来源 |
| **R14 规则文件审批** | 保存前预览差异；工具描述加用户确认要求；幂等检查 |
| **R15 渐进模块化** | 宿主端校验/归一化/渲染/检索函数拆到 `lib/shared.js`（相对 import，零依赖不变） |
| **R17 变更同步** | 10s 轮询 state 差异自动刷新面板（简化模式不轮询） |
| **R19 边界说明** | 注入开关文案、规则文件说明、帮助页 Term 均已更新 |

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
