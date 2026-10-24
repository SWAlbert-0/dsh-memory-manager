# 回退点清单

`lib/client.js` 和 `lib/index.js` 的历次快照。每个文件是**该阶段开始前**的完整版本，复制回去即可回退。

## 客户端快照（lib/client.js）

| 阶段 | 文件 | 时间 | 说明 |
|---|---|---|---|
| stage 0 | `client.stage0-before-design.js` | 2026-10-23 00:59 | 手写初版（Codex 视觉改版之前） |
| stage 1 | `client.stage1-before-p0p1.js` | 2026-10-23 16:22 | Codex 设计改版后、P0/P1 可读性优化之前 |
| stage 2 | `client.stage2-before-p2.js` | 2026-10-23 16:32 | P0/P1 完成后、P2 之前 |
| stage 3 | `client.stage3-after-p2.js` | 2026-10-23 16:36 | P2 完成后的基线 |
| stage 4 | `client.stage4-before-spacing.js` | 2026-10-23 16:40 | 调整筛选间距、移除紧凑模式之前 |
| stage 5 | `client.stage5-before-hybrid.js` | 2026-10-23 17:44 | 混合策略实验前（该实验已回退） |
| stage 6 | `client.stage6-before-hybrid.js` | 2026-10-23 19:49 | 二次混合策略实现前 |
| stage 7 | `client.stage7-before-roadmap.js` | 2026-10-23 22:32 | 移除练习页 + 记忆路线图（P0/P1/P2 之后） |
| stage 8 | `client.stage8-before-profile.js` | 2026-10-24 00:35 | 用户画像摘要功能之前 |
| stage 9 | `client.stage9-before-profiletool.js` | 2026-10-24 00:31 | 画像工具改造（方案 A）之前 |
| stage 10 | `client.stage8-before-p0fix.js` | 2026-10-24 01:29 | P0 安全可靠性修复之前 |
| stage 11 | `client.stage10-before-p1.js` | 2026-10-24 02:49 | P1 体验提升之前 |
| stage 12 | `client.stage12-before-visibility.js` | 2026-10-24 21:33 | 记录 `visibility` 字段（visible / hidden）之前 |
| stage 13 | `client.stage13-before-profile-revision.js` | 2026-10-24 21:51 | 画像写入 revision 乐观锁之前 |
| stage 14 | `client.stage14-before-hidden-boundaries.js` | 2026-10-24 22:03 | hidden 边界收紧（质量合并标签 / RPC 搜索 / 工具删除）之前 |
| stage 15 | `client.stage15-before-hide-hint.js` | 2026-10-24 22:26 | 列表页「隐藏立即生效」提示之前 |
| stage 16 | `client.stage16-before-design-p1.js` | 2026-10-24 22:52 | 设计评审 P1（对比度 / 状态操作 / 画像排版 / 窄屏筛选）之前 |

## 宿主端快照（lib/index.js）

| 阶段 | 文件 | 时间 | 说明 |
|---|---|---|---|
| host stage 0 | `host.stage0-before-hybrid.js` | 2026-10-23 17:44 | 混合策略实验前 |
| host stage 1 | `host.stage1-before-hybrid.js` | 2026-10-23 19:49 | 二次混合策略实现前 |
| host stage 2 | `host.stage2-before-roadmap.js` | 2026-10-23 22:32 | 记忆路线图（移除练习 + 常驻记忆 + AGENTS.md 桥接 + 自动沉淀）之前 |
| host stage 3 | `host.stage3-before-profile.js` | 2026-10-24 00:35 | 用户画像摘要功能之前 |
| host stage 4 | `host.stage4-before-profiletool.js` | 2026-10-24 00:31 | profile 工具改造之前 |
| host stage 5 | `host.stage5-before-p0fix.js` | 2026-10-24 01:29 | P0 安全修复之前 |
| host stage 5.1 | `host.stage5-before-p1.js` | 2026-10-24 02:49 | P1 体验提升之前 |
| host stage 6 | `host.stage6-before-visibility.js` | 2026-10-24 21:33 | 记录 `visibility` 字段（visible / hidden）之前 |
| host stage 7 | `host.stage7-before-profile-revision.js` | 2026-10-24 21:51 | 画像写入 revision 乐观锁之前 |
| host stage 8 | `host.stage8-before-hidden-boundaries.js` | 2026-10-24 22:03 | hidden 边界收紧（质量合并标签 / RPC 搜索 / 工具删除）之前 |

## 回退命令

在 `dsh-memory-manager` 目录下，把目标快照复制回对应文件即可（刷新试玩页生效；宿主端变更需重启 DSH）：

```bat
copy /Y lib\rollback\client.stage11-before-p1.js lib\client.js
copy /Y lib\rollback\host.stage5-before-p1.js lib\index.js
```

回退后建议跑一次：

```bat
node --check lib\client.js
node --check lib\index.js
```

## 说明

- **`client.js` 第 2 行的 bundle id 必须与 `package.json` 的 `name` 一致**（当前为 `dsh-memory-manager`）。回退到 2026-10-24 改名之前的快照后，需把该行改成 `id: "dsh-memory-manager"`，否则客户端会报 `duplicate factory registration` 且入口不激活。
- 快照只包含代码；存储数据（`%APPDATA%\dsh-memory\memory.json`）不会被任何回退操作修改。
- **回退到 `client.stage12` / `host.stage6` 之前的快照会丢失 `visibility` 语义**：旧代码不认识 hidden 字段，会把隐藏记录当作可见记录注入和检索。若库中已有 hidden 记录，回退前请先备份，回退后不要把该库继续用于隐私场景。
- 新增阶段时按 `client.stageN-before-<改动名>.js` / `host.stageN-before-<改动名>.js` 命名，并在上表补一行。
- 混合策略实验（stage 5 / host stage 0）曾实现后回退；stage 6 / host stage 1 是第二次实现前的快照。
