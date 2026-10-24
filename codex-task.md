# Task: beautify the dsh-memory plugin UI to match DSH's design system

You have **write access** to this directory. Work directly in `D:\Dev\Projects\Personal\dsh-plugin\dsh-memory-manager`.

## Load the frontend design skills first

Read and follow:
- `C:\Users\Albert\.codex\skills\frontend-design\SKILL.md` (primary)
- optionally `C:\Users\Albert\.codex\skills\distinctive-ai-design-main\SKILL.md`
- `C:\Users\Albert\.codex\skills\webapp-testing\SKILL.md` (verification guidance)

Apply their design principles, but the hard requirement is: **look like a native DSH surface**, not a generic admin dashboard.

## File to edit

ONLY `lib/client.js`. Do not modify `lib/index.js`, `package.json`, API routes, or data.

## Context

This is a single-file DSH web-client plugin. It renders:
- a sidebar entry (icon + label "记忆") via `ctx.slots.inject("sidebar.panellist", ...)`
- a main panel via `ctx.slots.inject("main", ...)`

Panel tabs:
1. 记忆（N）— search + memory cards (edit/delete)
2. 新增 — form (content textarea; kind/scope/importance; tags; JSON/Advanced: category/subcategory/key/value; Advanced: person/relationship/backstory)
3. 策略与设置 — 4 strategy cards (Simple Notes / Enhanced Notes / JSON Cards / Advanced JSON Cards), auto-inject toggle, auto-capture toggle, max inject count, max chars, store dir, save
4. 导入导出 — export JSON (download), import JSON (merge/replace), clear all

Data:
- `GET /api/memory/state` → `{ok, settings, memories, dir}`
- `POST /api/memory/rpc` `{action, payload}`; actions: `add`, `update`, `delete`, `clear`, `settings`, `search`, `import`, `export`
- `credentials: "same-origin"`

## Hard technical constraints

1. The file must stay a **classic script** wrapped exactly:
```js
window.__ModuleLoader__.load({
  id: "dsh-memory",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");
    ...
    exports.MemoryPage = MemoryPage;
    exports.MemoryIcon = MemoryIcon;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
```
No `import`/`export` statements. No JSX. No build step. Only `require("react")`. No other modules, no external CSS/fonts/images/icon packages.
2. Keep `apply(ctx)` slot registrations and exported names. Keep all functionality and the exact API field names.
3. Root element: `height: 100%; overflow: auto`.
4. Inline styles via objects; inline SVG icons allowed. You may add one scoped `<style>` element with a unique prefix (`dshmem-`) for hover/focus/responsive if it materially helps.
5. Chinese copy stays Chinese; you may polish wording.

## Theme

Read `THEME-TOKENS.md` in this directory and use those CSS variables exclusively (with fallbacks). Never hardcode white/black/gray surfaces. Both light and dark must look right.

## Visual direction

- Page max-width ~1040px centered, padding 28–32px; title 20–22px semibold; subtitle with strategy + injection status as a subtle pill.
- Tabs: segmented control (pill group) on skeleton/layer-2, active raised with border + shadow-lv1.
- Memory cards: layer-1 surface, border-l2, radius-md, 12–14px padding; hover interactive-bg-hover + border-l3, 140ms transition; kind indicator dot (semantic=deepseek blue, episodic=amber, procedural=green); rendered line 13.5–14px/1.55; meta chips 11–12px tertiary; edit/delete quiet, keyboard accessible.
- Empty state: inline SVG + one sentence + primary "新增记忆".
- Forms: labels 12px secondary; inputs layer-1 + border-l2 + radius-sm; focus-visible 2px brand ring; textarea min-height 96px; 2/3-column grids collapsing under 720px.
- Strategy cards: radio-cards; selected border brand + color-mix(brand 6%) background + check icon; name + description + "适合…".
- Buttons: primary brand fill + inverted text; secondary layer-1 + border-l2; danger error-tinted. Focus-visible everywhere.
- Import/export: two cards; mono textarea; merge/replace segmented control; clear-all danger card.
- Responsive <720px; accessibility (aria-label, role=tablist/tab, aria-selected, aria-pressed, focus-visible); reduced motion.
- Restrained: subtle borders, light shadows, no heavy gradients.

## Verification (must do)

1. `node --check lib/client.js`
2. Test instance is already running — do NOT start/stop it:
   `http://127.0.0.1:56001/?token=8bDmQhFW9CHqnU-GU7Rh1XwgT2A1xSl-ipCuj8i2B5I`
3. Run: `node cdp-verify.mjs "http://127.0.0.1:56001/?token=8bDmQhFW9CHqnU-GU7Rh1XwgT2A1xSl-ipCuj8i2B5I"`
   Confirm: sidebar entry "记忆" exists, panel renders, 4 memories visible.
4. Run: `node verify-visual.mjs "http://127.0.0.1:56001/?token=8bDmQhFW9CHqnU-GU7Rh1XwgT2A1xSl-ipCuj8i2B5I"`
   It writes `verify-light.png` / `verify-dark.png` and prints computed surfaces. Confirm both themes use token-based colors.
5. If a check fails, fix and re-run. Do not leave the file in a broken state.

## Report

Summarize: layout/components, tokens used, light/dark + responsive decisions, verification results, any limitations.
