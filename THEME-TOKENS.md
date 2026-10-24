# DSH 主题 token 参考（dsh-memory-manager 插件 UI 必须使用）

DSH 的 Web 客户端在 `body`（亮色）与 `body[data-ds-dark-theme]`（暗色）上定义了一套 CSS 变量。
插件必须用 `var(--token, fallback)` 引用，**不要硬编码白/黑/灰背景**，这样明暗主题自动适配。

## 表面与文字

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--dsw-alias-bg-base` | #fff | #151517 | 页面底色 |
| `--dsw-alias-bg-layer-1` | #fff | #232325 | 卡片/输入框表面 |
| `--dsw-alias-bg-layer-2` | #fff | #2c2c2e | 次级表面 |
| `--dsw-alias-bg-layer-3` | #fff | #353638 | 三级表面 / 标签 |
| `--dsw-alias-bg-skeleton` | rgba(0,0,0,.04) | rgba(255,255,255,.08) | 分段控件底、占位 |
| `--dsw-alias-label-primary` | #0f1115 | #f9fafb | 主文字 |
| `--dsw-alias-label-secondary` | #61666b | #cfd3d6 | 次文字 |
| `--dsw-alias-label-tertiary` | #81858c | #adb2b8 | 弱文字 |
| `--dsw-alias-label-caption` | #adb2b8 | #81858c | 说明文字 |
| `--dsw-alias-label-primary-inverted` | #fff | #353638 | 主按钮文字 |
| `--dsw-alias-border-l1` | rgba(0,0,0,.04) | rgba(255,255,255,.06) | 最浅分隔 |
| `--dsw-alias-border-l2` | rgba(0,0,0,.10) | rgba(255,255,255,.12) | 默认卡片/输入边框 |
| `--dsw-alias-border-l3` | rgba(0,0,0,.12) | rgba(255,255,255,.16) | hover/强调边框 |
| `--dsw-alias-border-l4` | rgba(0,0,0,.16) | rgba(255,255,255,.20) | 强边框 |

## 品牌与交互

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--dsw-alias-brand-primary` | #0f1115 | #f9fafb | 主按钮填充、选中态 |
| `--dsw-alias-button-primary-fill` | = brand | = brand | 主按钮 |
| `--dsw-alias-button-primary-hover` | #43454a | #f1f3f5 | 主按钮 hover |
| `--dsw-alias-interactive-bg-hover` | rgba(38,49,72,.06) | rgba(255,255,255,.08) | 行/卡片 hover |
| `--dsw-alias-interactive-bg-active` | rgba(38,49,72,.10) | rgba(255,255,255,.14) | 选中/按下 |
| `--dsw-alias-state-error-primary` | #ec1313 | #f25a5a | 错误/危险 |
| `--dsw-alias-state-success-primary` | #22c55e | #22c55e | 成功 |
| `--dsw-alias-state-warn-primary` | #f59e0b | #f59e0b | 警告 |
| `--dsw-static-deepseek-500` | #4176e6 | #4176e6 | 品牌蓝点缀（克制使用） |
| `--dsw-static-amber-500` | #f59e0b | #f59e0b | 情景记忆标记 |

## 形状 / 字体 / 阴影

- 圆角：`--dsw-radius-xs:4px`、`--dsw-radius-sm:8px`、`--dsw-radius-md:12px`、`--dsw-radius-lg:16px`、`--dsw-radius-xl:20px`、`--dsw-radius-panel:28px`
- 字体：`--dsw-font-family`（系统 UI，含 PingFang / Microsoft YaHei）
- 等宽：`--ds-font-family-code`
- 阴影：`--dsw-shadow-lv1`、`--dsw-shadow-lv2`、`--dsw-shadow-lv3`、`--dsw-elevation-panel`
- 字号：11 / 12 / 13 / 14 / 16 / 20 / 24 px；正文 13–14px，行高 20–22px
- 间距节奏：4 / 8 / 12 / 16 / 24 px

## 使用规则

1. 所有颜色都通过 `var(...)` 取，必须带一个合理的亮色 fallback，例如：
   `background: var(--dsw-alias-bg-layer-1, #fff)`。
2. 卡片默认 `1px solid var(--dsw-alias-border-l2)` + `--dsw-radius-md`，hover 用 `--dsw-alias-interactive-bg-hover`，不要用重阴影。
3. 主按钮 = brand 填充 + inverted 文字；次按钮 = layer-1 填充 + border-l2；危险按钮用 error 色的 10% 透明底 + error 边框。
4. 焦点态必须可见：`outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent); outline-offset: 2px;`。
5. 明暗两套都要好看：不要写死 `#fff` 背景或 `#000` 文字（fallback 除外）。
6. 布局：页面最大宽度 ~1040px 居中，padding 28–32px；720px 以下收窄、栅格改单列。
