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

## 回退命令

在 `dsh-memory-plugin` 目录下，把目标快照复制回对应文件即可（刷新试玩页生效；宿主端变更需重启 DSH）：

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
- 新增阶段时按 `client.stageN-before-<改动名>.js` / `host.stageN-before-<改动名>.js` 命名，并在上表补一行。
- 混合策略实验（stage 5 / host stage 0）曾实现后回退；stage 6 / host stage 1 是第二次实现前的快照。
