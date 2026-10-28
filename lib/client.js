window.__ModuleLoader__.load({
	id: "@albert-wu/dsh-memory-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const h = react.createElement;
		const { useState, useEffect, useCallback, useRef } = react;

		const STRATEGIES = [
			{ id: "simple", name: "Simple Notes", desc: "每条记忆是最小事实，开销最低，适合偏好/邮箱等短事实。" },
			{ id: "enhanced", name: "Enhanced Notes", desc: "每条记忆是一段保留上下文的叙述，语义完整，适合经历与背景。" },
			{ id: "json", name: "JSON Cards", desc: "类别 → 子类别 → 键值，支持部分更新，适合结构化资料。" },
			{ id: "advanced", name: "Advanced JSON Cards", desc: "在 JSON Cards 上增加 backstory / person / relationship，解决同名实体消歧。" },
		];
		const KINDS = [
			{ id: "semantic", name: "语义" },
			{ id: "episodic", name: "情景" },
			{ id: "procedural", name: "程序" },
		];

        const t = {
            base: "var(--dsw-alias-bg-base, #fff)", surface: "var(--dsw-alias-bg-layer-1, #fff)",
            secondary: "var(--dsw-alias-label-secondary, #61666b)", muted: "var(--dsw-alias-label-tertiary, #81858c)",
            text: "var(--dsw-alias-label-primary, #0f1115)", brand: "var(--dsw-alias-brand-primary, #0f1115)",
            border: "var(--dsw-alias-border-l2, rgba(0,0,0,.10))", error: "var(--dsw-alias-state-error-primary, #ec1313)",
            // Warning text needs a darker light-mode value than the amber token alone.
            warnText: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 55%, var(--dsw-alias-label-primary, #0f1115))",
            small: "var(--dsw-radius-sm, 8px)", radius: "var(--dsw-radius-md, 12px)",
            shadow: "var(--dsw-shadow-lv1, 0 1px 2px var(--dsw-alias-border-l1, rgba(0,0,0,.04)))"
        };
        const button = { padding: "8px 14px", minHeight: 36, borderRadius: t.small, border: "1px solid " + t.border, background: t.surface, color: t.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500 };
        const input = { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "9px 12px", borderRadius: t.small, border: "1px solid " + t.border, background: t.surface, color: t.text, fontSize: 13, fontFamily: "inherit", lineHeight: 1.55 };
        const c = {
            page: { height: "100%", overflow: "auto", background: t.base, color: t.text, fontFamily: "var(--dsw-font-family, system-ui, sans-serif)", boxSizing: "border-box" },
            content: { maxWidth: 1040, margin: "0 auto", padding: "32px 32px 48px", boxSizing: "border-box" },
            head: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 4 },
            title: { fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-.4px" },
            sub: { fontSize: 13, lineHeight: 1.7, color: t.secondary },
            tabs: { display: "flex", width: "fit-content", maxWidth: "100%", gap: 4, margin: "24px 0", padding: 4, background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))", borderRadius: t.radius, boxSizing: "border-box" },
            tab: (active) => ({ ...button, padding: "7px 14px", borderColor: active ? t.border : "transparent", background: active ? t.surface : "transparent", color: active ? t.text : t.secondary, boxShadow: active ? t.shadow : "none", whiteSpace: "nowrap" }),
            card: { border: "1px solid " + t.border, borderRadius: t.radius, padding: 14, marginBottom: 12, background: t.surface },
            memCard: { border: '1px solid var(--dsw-alias-border-l1, ' + t.border + ')', borderRadius: t.radius, padding: 20, marginBottom: 12, background: t.surface },
            detailNote: { fontSize: 13, lineHeight: 1.75, color: t.secondary, overflowWrap: 'anywhere' },
            row: { display: "flex", gap: 12, alignItems: "flex-start" },
            grow: { flex: 1, minWidth: 0 },
            meta: { fontSize: 12, lineHeight: "18px", color: t.secondary, marginTop: 8, display: "flex", alignItems: "center", gap: "6px 8px", flexWrap: "wrap", minWidth: 0 },
            chip: { borderRadius: "var(--dsw-radius-xs, 4px)", padding: "2px 6px", fontSize: 12, lineHeight: "18px", color: t.secondary, background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))" },
            tagMore: { padding: "2px 6px", borderRadius: "var(--dsw-radius-xs, 4px)", border: "1px solid " + t.border, background: "transparent", color: t.secondary, fontSize: 12, lineHeight: "18px", fontFamily: "inherit", cursor: "pointer" },
            filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 },
            filterPanel: { display: "flex", flexDirection: "column", gap: 12, marginTop: 8 },
            filterWide: { display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 20, rowGap: 10 },
            btn: button,
            btnPrimary: { ...button, background: "var(--dsw-alias-button-primary-fill, " + t.brand + ")", borderColor: t.brand, color: "var(--dsw-alias-label-primary-inverted, #fff)", fontWeight: 600 },
            btnDanger: { ...button, color: t.error, borderColor: "color-mix(in srgb, " + t.error + " 35%, transparent)", background: "color-mix(in srgb, " + t.error + " 10%, transparent)" },
            quiet: { ...button, padding: "4px 8px", minHeight: 32, background: "transparent", borderColor: "transparent", color: t.secondary, fontSize: 12, lineHeight: "18px" },
            actionBtn: { ...button, padding: "4px 8px", minHeight: 30, fontSize: 12, lineHeight: "18px" },
            input, area: { ...input, minHeight: 104, resize: "vertical" },
            label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: t.secondary, margin: "10px 0 12px" },
            grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
            grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
            msg: (kind) => ({ margin: "12px 0", fontSize: 12.5, color: kind === "err" ? t.error : kind === 'info' ? t.secondary : "color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, var(--dsw-alias-label-primary) 30%)" }),
            strategyCard: (active) => ({ ...button, width: "100%", textAlign: "left", borderColor: active ? t.brand : t.border, background: active ? "color-mix(in srgb, " + t.brand + " 6%, " + t.surface + ")" : t.surface, borderRadius: t.radius, padding: 16, position: "relative" }),
            empty: { textAlign: "center", color: t.secondary, fontSize: 13, padding: "48px 16px", border: "1px dashed " + t.border, borderRadius: t.radius },
            modalOverlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,17,21,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" },
            modal: { width: "min(720px, 100%)", maxHeight: "min(85vh, 900px)", overflow: "auto", background: t.surface, color: t.text, border: "1px solid " + t.border, borderRadius: t.radius, boxShadow: "var(--dsw-shadow-lv2, 0 12px 40px rgba(0,0,0,.25))", padding: 20, boxSizing: "border-box" },
            modalHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
            modalTitle: { fontSize: 18, fontWeight: 600, margin: 0, flex: 1, minWidth: 0 },
            modalBody: { minWidth: 0 },
            filterBar: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
            filterRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
            filterLabel: { fontSize: 11.5, color: t.secondary },
            filterChip: (active) => ({ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (active ? t.brand : t.border), background: active ? "color-mix(in srgb, " + t.brand + " 10%, " + t.surface + ")" : t.surface, color: active ? t.text : t.secondary, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }),
            filterSelect: { ...input, width: "auto", minWidth: 116, padding: "6px 10px", fontSize: 12 },
            filterMeta: { fontSize: 12, lineHeight: "18px", color: t.secondary, marginLeft: "auto" },
            linkBtn: { padding: 0, border: "none", background: "transparent", color: t.secondary, fontSize: 12, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline" }
        };
        const toneStyle = {
            path: { fontSize: 12, color: t.secondary, fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)", display: "block", marginBottom: 2, overflowWrap: "anywhere" },
            meta: { fontSize: 13, color: t.secondary },
            value: { fontSize: 14, color: t.text },
            backstory: { fontSize: 12, color: t.secondary }
        };
        const css = `
            .dshmem-root *, .dshmem-root *::before { box-sizing: border-box; }
            .dshmem-root button, .dshmem-root input, .dshmem-root textarea, .dshmem-root select, .dshmem-card { transition: background-color 140ms, border-color 140ms, box-shadow 140ms; }
            .dshmem-root :is(button,input,textarea,select):focus-visible { outline: 2px solid var(--dsw-alias-label-secondary, #61666b); outline-offset: 2px; }
            .dshmem-root .dshmem-card:hover { background: var(--dsw-alias-bg-layer-1, #fff) !important; border-color: var(--dsw-alias-border-l3, rgba(0,0,0,.12)) !important; }
            .dshmem-root .dshmem-pinned, .dshmem-root .dshmem-pinned:hover { border-left: 3px solid var(--dsw-alias-brand-primary, #0f1115) !important; }
            .dshmem-root .dshmem-quiet:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)) !important; }
            .dshmem-root .dshmem-danger:hover, .dshmem-root .dshmem-danger:focus-visible { color: var(--dsw-alias-state-error-primary, #ec1313) !important; background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #ec1313) 10%, transparent) !important; }
            .dshmem-root .dshmem-text { overflow-wrap: anywhere; }
            .dshmem-root .dshmem-advanced { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.10)); border-radius: var(--dsw-radius-md, 12px); background: var(--dsw-alias-bg-skeleton, rgba(0,0,0,.03)); padding: 0 12px; margin-top: 12px; }
            .dshmem-root .dshmem-advanced summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 10px 0; }
            .dshmem-root .dshmem-advanced summary::-webkit-details-marker { display: none; }
            .dshmem-root .dshmem-advanced summary:hover { color: var(--dsw-alias-label-primary, #0f1115); }
            .dshmem-root .dshmem-advanced[open] summary { border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06)); margin-bottom: 8px; }
            .dshmem-root .dshmem-advanced-body { padding: 2px 0 10px; }
            .dshmem-root .dshmem-text[data-collapsed="true"] { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
            .dshmem-root .dshmem-filter-bar { position: sticky; top: 0; z-index: 5; background: var(--dsw-alias-bg-base, #fff); padding-top: 8px; padding-bottom: 8px; }
            .dshmem-root .dshmem-skeleton { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1)); border-radius: var(--dsw-radius-md, 12px); background: var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04)); }
            .dshmem-root input[type=checkbox], .dshmem-root input[type=radio] { accent-color: var(--dsw-alias-brand-primary, #0f1115); }
            .dshmem-root input::placeholder, .dshmem-root textarea::placeholder { color: var(--dsw-alias-label-tertiary, #81858c); opacity: 1; }
            @media(max-width:720px) {
              .dshmem-content { padding: 16px 16px 32px !important; }
              .dshmem-tabs { width: 100% !important; flex-wrap: wrap; margin: 16px 0 !important; }
              .dshmem-tabs button { flex: 1; padding: 7px 9px !important; }
              .dshmem-card { padding: 12px !important; }
              .dshmem-root .dshmem-text[data-collapsed="true"] { -webkit-line-clamp: 5; }
              .dshmem-grid { grid-template-columns: minmax(0,1fr) !important; }
              .dshmem-filter-group { flex-basis: 100%; }
              .dshmem-row { flex-wrap: wrap; }
              .dshmem-row > :first-child { flex-basis: 100% !important; }
              .dshmem-actions { gap: 8px !important; }
              .dshmem-root button { min-height: 36px !important; }
              .dshmem-filter-select { width: 100% !important; }
              .dshmem-filter-panel { gap: 2px !important; margin-top: 0 !important; }
              .dshmem-filter-bar { gap: 2px !important; padding-top: 4px !important; padding-bottom: 4px !important; }
              .dshmem-root .dshmem-filter-bar.dshmem-filters-open { position: static !important; }
              .dshmem-root .dshmem-filter-bar input[type=search] { flex-basis: 100% !important; }
              .dshmem-root .dshmem-actions button { min-height: 44px !important; }
              .dshmem-sub { order: 3; flex-basis: 100%; }
            }
            .dshmem-root .dshmem-card { box-shadow: none; }
            .dshmem-root .dshmem-card:hover { border-color: var(--dsw-alias-border-l2) !important; }
            .dshmem-root .dshmem-hidden { background: var(--dsw-alias-bg-layer-1, #fff); }
            .dshmem-root .dshmem-detail-trigger { min-height: 36px; padding: 6px 10px; }
            .dshmem-root .dshmem-condition, .dshmem-root .dshmem-record-subject { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
            .dshmem-root .dshmem-record-details details > summary, .dshmem-root .dshmem-settings-hub details > summary { min-height: 36px; padding-top: 8px; padding-bottom: 8px; cursor: pointer; }
            .dshmem-root input[type=file]::file-selector-button { border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm,8px); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); padding: 8px 12px; margin-right: 10px; font: inherit; cursor: pointer; }
            .dshmem-root .dshmem-detail-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 24px; margin: 20px 0; }
            .dshmem-root .dshmem-detail-grid dt { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-bottom: 5px; }
            .dshmem-root .dshmem-detail-grid dd { font-size: 13px; margin: 0; line-height: 1.65; overflow-wrap: anywhere; }
            .dshmem-root .dshmem-secondary-details { margin-top: 18px; border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 14px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
            .dshmem-root .dshmem-secondary-details > summary { cursor: pointer; padding: 4px 0; }
            .dshmem-root .dshmem-filter-bar { padding: 0 0 16px; gap: 14px; margin: 0 0 20px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
            .dshmem-root .dshmem-filter-bar.dshmem-filters-open { position: static !important; }
            .dshmem-root .dshmem-search-row { display: flex; gap: 10px; align-items: center; }
            .dshmem-root .dshmem-search-row input { min-width: 0; flex: 1; }
            .dshmem-root .dshmem-view-tabs { display: flex; flex-wrap: wrap; gap: 2px; }
            .dshmem-root .dshmem-view-tabs button { background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; border: 0; border-bottom: 2px solid transparent; padding: 10px 12px; cursor: pointer; border-radius: 5px 5px 0 0; }
            .dshmem-root .dshmem-view-tabs button[aria-pressed=true] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 600; background: color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent); }
            .dshmem-root .dshmem-view-tabs button:hover { background: var(--dsw-alias-bg-layer-2); }
            .dshmem-root .dshmem-filter-fields { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 0 16px; }
            .dshmem-root .dshmem-filter-fields select { width: 100% !important; }
            .dshmem-root .dshmem-filter-panel { padding: 16px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md,12px); background: var(--dsw-alias-bg-layer-1); }
            .dshmem-root .dshmem-active-filter { max-width: 100%; display: inline-flex; gap: 8px; align-items: center; padding: 5px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; overflow-wrap: anywhere; }
            .dshmem-root .dshmem-settings-nav { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 0 0 24px; }
            .dshmem-root .dshmem-settings-nav button { text-align: left; min-width: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md,12px); padding: 16px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); font: inherit; cursor: pointer; }
            .dshmem-root .dshmem-settings-nav button[aria-pressed=true] { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,var(--dsw-alias-bg-layer-1)); }
            .dshmem-root .dshmem-settings-nav strong { display: block; font-size: 14px; margin-bottom: 6px; }
            .dshmem-root .dshmem-settings-nav span { display: block; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
            .dshmem-root :is(button,summary,select,input):focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }
            .dshmem-root [hidden] { display: none !important; }
            @media(max-width:720px) {
              .dshmem-root .dshmem-filter-bar { gap: 12px !important; padding: 4px 0 16px !important; }
              .dshmem-root .dshmem-filter-panel { padding: 12px; gap: 12px !important; }
              .dshmem-root .dshmem-filter-fields { grid-template-columns: minmax(0,1fr); }
              .dshmem-root .dshmem-card { padding: 16px !important; }
              .dshmem-root .dshmem-detail-trigger, .dshmem-root .dshmem-view-tabs button, .dshmem-root .dshmem-detail-actions button, .dshmem-root .dshmem-active-filter { min-height: 44px !important; }
              .dshmem-root .dshmem-card-footer { gap: 8px; }
              .dshmem-root .dshmem-record-details details > summary, .dshmem-root .dshmem-settings-hub details > summary { min-height: 44px; }
              .dshmem-root .dshmem-settings-nav { gap: 8px; }
              .dshmem-root .dshmem-settings-nav button { padding: 12px; }
            }
            @media(prefers-reduced-motion:reduce) { .dshmem-root * { transition: none !important; } }
        `;
        function Check() {
            return h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true }, h("path", { d: "m5 12 4 4L19 6" }));
        }

		async function rpc(action, payload) {
			const res = await fetch("/api/memory/rpc", {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action, payload }),
			});
			if (!res.ok) throw new Error("HTTP " + res.status);
			return res.json();
		}

		function effectiveStrategy(rec, globalStrategy, rules) {
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

		function renderLine(rec, strategy) {
			if (strategy === "simple") return rec.text || rec.value || "(空)";
			if (strategy === "json") {
				const path = [rec.category, rec.subcategory, rec.key].filter(Boolean).join(".");
				return (path || "memory") + ": " + (rec.value || rec.text || "(空)");
			}
			if (strategy === "advanced") {
				const who = [rec.person, rec.relationship].filter(Boolean).join(" / ");
				const path = [rec.category, rec.subcategory, rec.key].filter(Boolean).join(".");
				return (who ? who + " — " : "") + (path ? path + ": " : "") + (rec.value || rec.text || "(空)") + (rec.backstory ? "（背景：" + rec.backstory + "）" : "");
			}
			return "[" + (rec.kind || "semantic") + "] " + (rec.text || rec.value || "(空)");
		}

		function fmtTime(ts) {
			if (!ts) return "";
			const d = new Date(ts);
			const p = (n) => String(n).padStart(2, "0");
			return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
		}

		function relativeTime(ts) {
			if (!ts) return "";
			const diff = Date.now() - ts;
			const minute = 60000, hour = 3600000, day = 86400000;
			if (diff < 0) return fmtTime(ts);
			if (diff < minute) return "刚刚";
			if (diff < hour) return Math.floor(diff / minute) + " 分钟前";
			if (diff < day) return Math.floor(diff / hour) + " 小时前";
			if (diff < 7 * day) return Math.floor(diff / day) + " 天前";
			return fmtTime(ts).slice(0, 10);
		}

		function renderParts(rec, strategy) {
			const text = rec.text || "";
			const value = rec.value || text || "(空)";
			const path = [rec.category, rec.subcategory, rec.key].filter(Boolean).join(".");
			if (strategy === "json") {
				if (!path) return [{ text: "memory: ", tone: "path" }, { text: value, tone: "value" }];
				return [{ text: path + ": ", tone: "path" }, { text: value, tone: "value" }];
			}
			if (strategy === "advanced") {
				const parts = [];
				const who = [rec.person, rec.relationship].filter(Boolean).join(" / ");
				if (who) parts.push({ text: who + "  ", tone: "meta" });
				if (path) parts.push({ text: path + ": ", tone: "path" });
				parts.push({ text: value, tone: "value" });
				if (rec.backstory) parts.push({ text: "（背景：" + rec.backstory + "）", tone: "backstory" });
				return parts;
			}
			if (strategy === "enhanced") return [{ text: "[" + (rec.kind || "semantic") + "] ", tone: "meta" }, { text: value, tone: "value" }];
			return [{ text: value, tone: "value" }];
		}

		function groupRecords(records, groupBy) {
			if (groupBy === "kind") {
				return [["semantic", "语义"], ["episodic", "情景"], ["procedural", "程序"]]
					.map(([id, label]) => ({ key: id, label, items: records.filter((r) => r.kind === id) }))
					.filter((g) => g.items.length > 0);
			}
			if (groupBy === "time") {
				const now = new Date();
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
				const yesterday = today - 86400000;
				return [
					["today", "今天", (ts) => ts >= today],
					["yesterday", "昨天", (ts) => ts >= yesterday && ts < today],
					["earlier", "更早", (ts) => ts < yesterday],
				].map(([key, label, test]) => ({ key, label, items: records.filter((r) => test(r.updatedAt || 0)) }))
					.filter((g) => g.items.length > 0);
			}
			return [];
		}

		function useNarrow() {
			const query = "(max-width: 720px)";
			const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
			useEffect(() => {
				const mq = window.matchMedia(query);
				const onChange = () => setNarrow(mq.matches);
				mq.addEventListener("change", onChange);
				setNarrow(mq.matches);
				return () => mq.removeEventListener("change", onChange);
			}, []);
			return narrow;
		}

		function Field(props) {
			return h("label", { style: c.label }, [props.label, props.children]);
		}

		function Modal({ title, onClose, children }) {
			const dialogRef = useRef(null);
			const closeRef = useRef(onClose);
			closeRef.current = onClose;
			useEffect(() => {
				if (typeof document === "undefined") return;
				const previous = document.activeElement;
				const body = document.body;
				const prevOverflow = body ? body.style.overflow : "";
				if (body) body.style.overflow = "hidden";
				const onKey = (e) => {
					if (e.key === "Escape") { e.preventDefault(); closeRef.current?.(); return; }
					if (e.key !== "Tab" || !dialogRef.current) return;
					const nodes = [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
					if (!nodes.length) return;
					const first = nodes[0], last = nodes[nodes.length - 1];
					if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
					else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
				};
				document.addEventListener("keydown", onKey);
				const timer = setTimeout(() => dialogRef.current?.focus?.(), 0);
				return () => {
					clearTimeout(timer);
					document.removeEventListener("keydown", onKey);
					if (body) body.style.overflow = prevOverflow;
					if (previous && previous.isConnected !== false && typeof previous.focus === 'function') previous.focus();
                    else document.querySelector('.dshmem-root input[aria-label="搜索记忆"]')?.focus();
				};
			}, []);
			return h("div", { className: "dshmem-modal-overlay", style: c.modalOverlay, onClick: closeRef.current }, h("div", {
				ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-label": title, tabIndex: -1, className: "dshmem-modal", style: c.modal, onClick: (e) => e.stopPropagation(),
			}, [
				h("div", { key: "h", style: c.modalHead }, [
					h("h2", { key: "t", style: c.modalTitle }, title),
					h("button", { key: "x", type: "button", "aria-label": "关闭弹窗", style: { ...c.quiet, fontSize: 18, lineHeight: "20px", minHeight: 32, padding: "4px 8px" }, onClick: closeRef.current }, "×"),
				]),
				h("div", { key: "b", style: c.modalBody }, children),
			]));
		}

		function useStore() {
			const [data, setData] = useState(null);
			const [error, setError] = useState("");
			const refresh = useCallback(async () => {
				try {
					const res = await fetch("/api/memory/state", { credentials: "same-origin" });
					if (!res.ok) throw new Error("HTTP " + res.status);
					setData(await res.json());
					setError("");
				} catch (e) {
					setError(String(e.message || e));
				}
			}, []);
			useEffect(() => { refresh(); }, [refresh]);
			useEffect(() => {
				let active = true;
				const timer = setInterval(async () => {
					try {
						const response = await fetch("/api/memory/pending", { credentials: "same-origin" });
						const result = await response.json();
						if (active && response.ok && result.ok) setData((previous) => previous ? { ...previous, pending: result.pending } : previous);
					} catch { /* next poll or manual refresh retries */ }
				}, 10000);
				return () => { active = false; clearInterval(timer); };
			}, []);
			return { data, setData, error, refresh };
		}

        function memorySummary(rec, strategy) {
            if (['json', 'advanced'].includes(strategy) && rec.value) {
                const label = [rec.category, rec.subcategory, rec.key].filter(Boolean).join(' / ');
                return (label ? label + '：' : '') + rec.value;
            }
            return rec.text || rec.value || '（空记忆）';
        }
        function MemoryRow({ rec, strategy, rules, projects = [], onDetails }) {
            const state = serviceState(rec);
            const project = projects.find(p => p.id === rec.projectId);
            const subject = [rec.person, rec.relationship].filter(Boolean).join(' · ');
            const badges = [rec.pinned && ['pinned', '常驻'], rec.visibility === 'hidden' && ['hidden', '已隐藏'], state !== '当前有效' && ['state', state]].filter(Boolean);
            return h('article', { className: 'dshmem-card' + (rec.pinned ? ' dshmem-pinned' : '') + (rec.visibility === 'hidden' ? ' dshmem-hidden' : ''), style: c.memCard }, [
                badges.length ? h('div', { key: 'badges', className: 'dshmem-card-flags', style: { ...c.filterRow, gap: 6, marginBottom: 10 } }, badges.map(([id, label]) => h('span', { key: id, className: 'dshmem-' + id + '-badge', style: { ...c.chip, color: id === 'pinned' ? t.brand : t.warnText } }, label))) : null,
                subject ? h('div', { key: 'subject', className: 'dshmem-record-subject', style: { fontSize: 12, color: t.secondary, marginBottom: 6, overflowWrap: 'anywhere' } }, subject) : null,
                h('div', { key: 'body', id: 'dshmem-text-' + rec.id, className: 'dshmem-text', 'data-collapsed': 'true', style: { fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: t.text } }, memorySummary(rec, effectiveStrategy(rec, strategy, rules))),
                rec.conditions ? h('p', { key: 'condition', className: 'dshmem-condition', style: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: t.secondary } }, '适用于：' + rec.conditions) : null,
                h('div', { key: 'footer', className: 'dshmem-card-footer', style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', marginTop: 16 } }, [
                    h('div', { key: 'meta', style: { fontSize: 12, color: t.secondary, minWidth: 0, overflowWrap: 'anywhere' } }, [
                        h('span', { key: 'scope' }, rec.scope === 'project' ? (project?.name || '项目记忆') : '全局记忆'),
                        rec.updatedAt ? h('span', { key: 'time' }, ' · ' + relativeTime(rec.updatedAt)) : null,
                    ]),
                    h('button', { key: 'details', type: 'button', className: 'dshmem-quiet dshmem-detail-trigger', style: { ...c.quiet, flexShrink: 0 }, 'aria-label': '查看记忆详情', 'aria-describedby': 'dshmem-text-' + rec.id, 'aria-haspopup': 'dialog', onClick: () => onDetails(rec) }, '查看详情 ›'),
                ]),
            ]);
        }
        function MemoryDetails({ rec, strategy, rules, projects = [], records = [], onEdit, onPin, onToggleVisibility, onDelete }) {
            const [busy, setBusy] = useState(false);
            const [error, setError] = useState('');
            const act = async callback => {
                if (busy) return;
                setBusy(true); setError('');
                try { if (await callback(rec) === false) setError('操作未完成，请重试。'); }
                catch (err) { setError(err.message || '操作失败'); }
                finally { setBusy(false); }
            };
            const project = projects.find(p => p.id === rec.projectId);
            const metadata = [
                ['类型', KINDS.find(k => k.id === rec.kind)?.name || rec.kind || '语义'],
                ['范围', rec.scope === 'project' ? project?.name || (rec.projectId ? '项目' : '项目未归属') : '全局'],
                ['事实状态', serviceState(rec)], ['对 Agent', rec.visibility === 'hidden' ? '已隐藏' : '未隐藏（仍受范围与有效期限制）'],
                ['重要性', (rec.importance || 3) + ' / 5'], ['呈现格式', STRATEGIES.find(s => s.id === effectiveStrategy(rec, strategy, rules))?.name || strategy],
                ['发生时间', rec.occurredAt != null ? fmtTime(rec.occurredAt) : '未指定'], ['生效时间', rec.validFrom != null ? fmtTime(rec.validFrom) : '不限'],
                ['失效时间', rec.validUntil != null ? fmtTime(rec.validUntil) : '不限'], ['最后更新', rec.updatedAt ? fmtTime(rec.updatedAt) : '未记录'],
            ];
            return h('div', { className: 'dshmem-record-details' }, [
                h('p', { key: 'text', style: { margin: '0 0 20px', fontSize: 16, lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, renderLine(rec, effectiveStrategy(rec, strategy, rules))),
                h('div', { key: 'actions', className: 'dshmem-detail-actions', style: { ...c.filterRow, paddingBottom: 20, borderBottom: '1px solid ' + t.border } }, [
                    h('button', { key: 'edit', type: 'button', style: c.btnPrimary, disabled: busy, 'aria-label': '编辑记忆', onClick: () => onEdit(rec) }, '编辑记忆'),
                    h('button', { key: 'pin', type: 'button', style: c.btn, disabled: busy, 'aria-pressed': !!rec.pinned, onClick: () => act(onPin) }, rec.pinned ? '取消常驻' : '设为常驻'),
                    h('button', { key: 'visibility', type: 'button', style: c.btn, disabled: busy, 'aria-label': rec.visibility === 'hidden' ? '恢复为对 Agent 可见' : '对 Agent 隐藏', 'aria-pressed': rec.visibility === 'hidden', onClick: () => act(onToggleVisibility) }, rec.visibility === 'hidden' ? '恢复对 Agent 可见' : '对 Agent 隐藏'),
                ]),
                h('p', { key: 'visibility-help', style: { fontSize: 12, lineHeight: 1.7, color: t.secondary } }, '隐藏会立即生效，记录仍保留；常驻也受可见性、项目与有效期限制。'),
                error ? h('p', { key: 'error', role: 'alert', style: c.msg('err') }, error) : null,
                h('dl', { key: 'metadata', className: 'dshmem-detail-grid' }, metadata.map(([label, value]) => h('div', { key: label }, [h('dt', { key: 'label' }, label), h('dd', { key: 'value' }, value)]))),
                rec.person || rec.relationship ? h('p', { key: 'who', style: c.detailNote }, '主体与关系：' + [rec.person, rec.relationship].filter(Boolean).join(' · ')) : null,
                rec.conditions ? h('p', { key: 'condition', style: c.detailNote }, '适用条件：' + rec.conditions) : null,
                (rec.tags || []).length ? h('div', { key: 'tags', style: { ...c.filterRow, margin: '16px 0' } }, rec.tags.map(tag => h('span', { key: tag, style: c.chip }, '#' + tag))) : null,
                h(EvidenceDetails, { key: 'source', rec, records }),
                h('details', { key: 'structured', className: 'dshmem-secondary-details' }, [
                    h('summary', { key: 's' }, '结构化字段与标识'),
                    h('dl', { key: 'fields', className: 'dshmem-detail-grid' }, [['记忆 ID', rec.id], ['项目 ID', rec.projectId], ['项目目录', project?.path], ['类别', rec.category], ['子类别', rec.subcategory], ['字段', rec.key], ['值', rec.value], ['背景', rec.backstory], ['取代记录', rec.supersededBy]].filter(([, value]) => value).map(([label, value]) => h('div', { key: label }, [h('dt', { key: 'k' }, label), h('dd', { key: 'v' }, value)]))),
                ]),
                h('div', { key: 'danger', style: { borderTop: '1px solid ' + t.border, marginTop: 24, paddingTop: 16 } }, h('button', { type: 'button', className: 'dshmem-quiet dshmem-danger', disabled: busy, style: { ...c.quiet, color: t.error }, 'aria-label': '删除记忆', onClick: () => act(onDelete) }, '删除这条记忆')),
            ]);
        }

        const STATUS_LABELS = { active: '当前有效', historical: '历史记录', conflict: '待确认冲突', superseded: '已被取代' };
        function serviceState(rec) {
            if (rec.serviceStatus) return rec.serviceStatus;
            if (rec.supersededBy) return '已被取代';
            if (rec.scope === 'project' && !rec.projectId) return '项目未归属';
            if ((rec.status || 'active') !== 'active') return STATUS_LABELS[rec.status] || rec.status;
            if (rec.validFrom != null && rec.validFrom > Date.now()) return '尚未生效';
            if (rec.validUntil != null && rec.validUntil <= Date.now()) return '已过期';
            return '当前有效';
        }
        function localTimeValue(time) {
            if (time == null) return '';
            const date = new Date(time);
            return new Date(time - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        function EvidenceDetails({ rec, records = [] }) {
            return h('details', { style: { marginTop: 10, fontSize: 12, color: t.secondary, overflowWrap: 'anywhere' } }, [
                h('summary', { key: 's', style: { cursor: 'pointer' } }, '查看依据'),
                h('blockquote', { key: 'e', style: { whiteSpace: 'pre-wrap', margin: '8px 0', paddingLeft: 12, borderLeft: '2px solid ' + t.border } }, rec.evidence || '旧记录或手动记录未附原句，不表示来源已经核实。'),
                h('p', { key: 'ref' }, '来源会话：' + (rec.sourceSessionId || '未记录') + ' · 消息：' + (rec.sourceMessageId || '未记录') + (rec.sourceEventSeq != null ? ' · 事件 #' + rec.sourceEventSeq : '')),
                h('p', { key: 'time' }, '观察时间：' + (rec.observedAt ? fmtTime(rec.observedAt) : '未记录') + ' · 确认方式：' + (rec.confirmation || '旧记录/未知')),
                h('p', { key: 'refs' }, '关联依据记录：' + ((rec.evidenceRefs || []).map(ref => ref.recordId).join('、') || '无')),
                ...(rec.evidenceRefs || []).map(ref => {
                    const source = records.find(row => row.id === ref.recordId);
                    return h('details', { key: ref.recordId, style: { margin: '6px 0' } }, [
                        h('summary', { key: 's', style: { cursor: 'pointer' } }, '关联来源 ' + ref.recordId + (source ? ' · ' + serviceState(source) + (source.visibility === 'hidden' ? ' · 已隐藏（管理可见）' : '') : ' · 原记录已删除或不在当前视图')),
                        source ? h('div', { key: 'source', style: { whiteSpace: 'pre-wrap' } }, '原记录陈述：' + source.text + '\n保存原句：' + (source.evidence || '未附原句') + '\n来源会话：' + (source.sourceSessionId || '未知') + ' · 消息：' + (source.sourceMessageId || '未知')) : null,
                    ]);
                }),
                h('p', { key: 'note' }, '仅显示已保存的原句与引用，不自动读取整段会话。原会话可能未加载或已删除；修改后的事实需结合原句与确认方式核对。'),
            ]);
        }

		function MemoryForm(props) {
			const { strategy, rules, initial, onSubmit, onCancel, onDirty, embedded } = props;
			const [form, setForm] = useState(() => ({
				text: initial?.text || "",
				pinned: initial?.pinned === true,
				visibility: initial?.visibility === "hidden" ? "hidden" : "visible",
				strategy: initial?.strategy || "",
				kind: initial?.kind || "semantic",
				scope: initial?.scope || "global",
				tags: (initial?.tags || []).join(", "),
				category: initial?.category || "",
				subcategory: initial?.subcategory || "",
				key: initial?.key || "",
				value: initial?.value || "",
				backstory: initial?.backstory || "",
				person: initial?.person || "",
				relationship: initial?.relationship || "",
				importance: initial?.importance || 3,
                projectId: initial?.projectId || '', projectPath: '', status: initial?.status || 'active',
                occurredAt: localTimeValue(initial?.occurredAt), validFrom: localTimeValue(initial?.validFrom), validUntil: localTimeValue(initial?.validUntil),
                conditions: initial?.conditions || '', supersededBy: initial?.supersededBy || '',
			}));
			const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
			const [saving, setSaving] = useState(false);
            const [error, setError] = useState("");
            const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(initial && (initial.strategy || initial.category || initial.subcategory || initial.key || initial.value || initial.person || initial.relationship || initial.backstory || initial.conditions || initial.occurredAt || initial.validFrom || initial.validUntil || (initial.status && initial.status !== 'active'))));
            const baseline = useRef(JSON.stringify(form));
            useEffect(() => { onDirty?.(JSON.stringify(form) !== baseline.current); }, [form, onDirty]);
            const submit = async () => {
                if (saving || !form.text.trim()) return;
                setSaving(true); setError("");
                try {
                    let projectId = form.scope === 'project' ? form.projectId : '';
                    if (form.scope === 'project' && form.projectPath.trim()) {
                        const result = await rpc('register-project', { path: form.projectPath.trim() });
                        if (!result.ok) throw new Error(result.error || '项目登记失败');
                        projectId = result.project.id;
                    }
                    if (form.scope === 'project' && !projectId && !initial) throw new Error('请明确选择项目，或填写项目绝对路径');
                    const times = Object.fromEntries(['occurredAt', 'validFrom', 'validUntil'].map(key => [key, form[key] ? new Date(form[key]).getTime() : null]));
                    if (Object.values(times).some(value => value !== null && !Number.isFinite(value))) throw new Error('时间无效');
                    if (times.validFrom != null && times.validUntil != null && times.validFrom >= times.validUntil) throw new Error('失效时间必须晚于生效时间');
                    const { projectPath, ...fields } = form;
                    await onSubmit({ ...fields, ...times, projectId, tags: form.tags.split(/[,，]/).map(x => x.trim()).filter(Boolean), importance: Number(form.importance) });
                }
                catch (error) { setError("保存失败：" + error.message); }
                finally { setSaving(false); }
            };
            const activeStrategy = effectiveStrategy({ ...form, tags: form.tags.split(/[,，]/).map(x => x.trim()).filter(Boolean) }, strategy, rules);
			const structured = activeStrategy === "json" || activeStrategy === "advanced";
			const advanced = activeStrategy === "advanced";
			return h("div", { style: embedded ? { ...c.card, border: "none", padding: 0, marginBottom: 0, background: "transparent" } : c.card }, [
				h(Field, { key: "t", label: "内容（必填）" }, h("textarea", { style: c.area, required: true, "aria-required": true, value: form.text, onChange: set("text"), placeholder: "例如：用户偏好靠窗座位，且是素食者。" })),
				h("div", { key: "k", className: "dshmem-grid", style: c.grid3 }, [
					h(Field, { key: "kind", label: "类型" }, h("select", { style: c.input, value: form.kind, onChange: set("kind") }, KINDS.map((k) => h("option", { key: k.id, value: k.id }, k.name)))),
					h(Field, { key: "scope", label: "范围" }, h("select", { style: c.input, value: form.scope, onChange: set("scope") }, [h("option", { key: "g", value: "global" }, "全局"), h("option", { key: "p", value: "project" }, "项目")])),
					h(Field, { key: "imp", label: "重要性 1-5" }, h("input", { style: c.input, type: "number", min: 1, max: 5, value: form.importance, onChange: set("importance") })),
				]),
                form.scope === 'project' ? h('div', { key: 'project', style: { ...c.card, padding: 12 } }, [
                    h(Field, { key: 'id', label: '项目归属（明确选择，不自动猜测）' }, h('select', { 'aria-label': '项目归属', style: c.input, value: form.projectId, onChange: set('projectId') }, [
                        h('option', { key: '', value: '' }, '未归属（不提供给 Agent）'),
                        ...(form.projectId && !(props.projects || []).some(p => p.id === form.projectId) ? [h('option', { key: form.projectId, value: form.projectId }, form.projectId)] : []),
                        ...(props.projects || []).map(p => h('option', { key: p.id, value: p.id }, p.name + ' · ' + p.path)),
                    ])),
                    h(Field, { key: 'path', label: '或登记项目绝对路径' }, h('input', { 'aria-label': '项目绝对路径', style: c.input, value: form.projectPath, onChange: set('projectPath'), placeholder: '填写会话创建时的项目根目录；保存即确认此归属' })),
                    h('p', { key: 'hint', style: { fontSize: 12, color: t.secondary } }, '项目身份基于会话原始目录；切换工作子目录不会改归属。旧项目记录需手动认领。'),
                ]) : null,
				h(Field, { key: "tags", label: "标签（逗号分隔，可选）" }, h("input", { style: c.input, value: form.tags, onChange: set("tags"), placeholder: "旅行, 饮食" })),
				h("div", { key: "state", style: { display: "flex", flexWrap: "wrap", gap: "10px 18px", margin: "4px 0 8px" } }, [
					h("label", { key: "pinned", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.pinned, onChange: (e) => setForm({ ...form, pinned: e.target.checked }) }), "常驻（每轮优先注入）",
					]),
					h("label", { key: "visibility", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.visibility === "hidden", onChange: (e) => setForm({ ...form, visibility: e.target.checked ? "hidden" : "visible" }) }), "对 Agent 隐藏（保留在库中，不注入、不参与检索与画像）",
					]),
				]),
				h("details", { key: "advanced", className: "dshmem-advanced", open: advancedOpen, onToggle: (e) => setAdvancedOpen(e.currentTarget.open) }, [
					h("summary", { key: "s", className: "dshmem-advanced-summary" }, [
						h("span", { key: "t", style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } }, [
							h("span", { key: "a", style: { fontSize: 13, fontWeight: 600, color: t.text } }, "高级选项（格式与结构字段）"),
							h("span", { key: "b", style: { fontSize: 11.5, fontWeight: 400, color: t.secondary } }, "格式、类别、人物关系等可选字段"),
						]),
						h("span", { key: "c", "aria-hidden": true, style: { marginLeft: "auto", display: "inline-block", color: t.secondary, transition: "transform 140ms", transform: advancedOpen ? "rotate(180deg)" : "none" } }, "▾"),
					]),
					h("div", { key: "body", className: "dshmem-advanced-body" }, [
                        h(Field, { key: 'status', label: '事实状态（独立于隐藏）' }, h('select', { 'aria-label': '事实状态', style: c.input, value: form.status, onChange: set('status') }, Object.entries(STATUS_LABELS).map(([value, label]) => h('option', { key: value, value }, label)))),
                        h('p', { key: 'status-hint', style: { fontSize: 12, color: t.secondary } }, '历史、待确认冲突、已被取代、未生效、过期的记录不提供给 Agent；恢复可见不等于恢复有效。'),
                        h('div', { key: 'times', className: 'dshmem-grid', style: c.grid3 }, [['occurredAt', '发生时间'], ['validFrom', '生效时间'], ['validUntil', '失效时间（不含）']].map(([key, label]) => h(Field, { key, label: label + ' · 本地时间' }, h('input', { type: 'datetime-local', 'aria-label': label, style: c.input, value: form[key], onChange: set(key) })))),
                        h(Field, { key: 'conditions', label: '适用条件（保留限定与否定）' }, h('input', { 'aria-label': '适用条件', style: c.input, value: form.conditions, onChange: set('conditions'), placeholder: '例如：仅工作日，或仅为父亲安排就诊时' })),
                        h(Field, { key: 'supersededBy', label: '取代本条的记忆 ID（可选）' }, h('input', { 'aria-label': '取代记录 ID', style: c.input, value: form.supersededBy, onChange: set('supersededBy') })),
						h(Field, { key: "strategy", label: "本记录格式" }, h("select", { style: c.input, value: form.strategy, onChange: set("strategy") }, [
							h("option", { key: "", value: "" }, "跟随全局（" + (STRATEGIES.find((s) => s.id === strategy)?.name || strategy) + "）"),
							...STRATEGIES.map((s) => h("option", { key: s.id, value: s.id }, s.name)),
						])),
						h("p", { key: "effective", style: { fontSize: 12, color: t.secondary } }, "生效格式：" + (STRATEGIES.find(s => s.id === activeStrategy)?.name || activeStrategy)),
						structured ? h("div", { key: "s", className: "dshmem-grid", style: c.grid3 }, [
							h(Field, { key: "cat", label: "类别" }, h("input", { style: c.input, value: form.category, onChange: set("category"), placeholder: "work" })),
							h(Field, { key: "sub", label: "子类别" }, h("input", { style: c.input, value: form.subcategory, onChange: set("subcategory"), placeholder: "position" })),
							h(Field, { key: "key", label: "字段" }, h("input", { style: c.input, value: form.key, onChange: set("key"), placeholder: "title" })),
						]) : null,
						structured ? h(Field, { key: "val", label: "字段值" }, h("input", { style: c.input, value: form.value, onChange: set("value"), placeholder: "高级工程师" })) : null,
						h("div", { key: "adv", className: "dshmem-grid", style: c.grid3 }, [
							h(Field, { key: "who", label: "主体（person）" }, h("input", { style: c.input, value: form.person, onChange: set("person"), placeholder: "张医生" })),
							h(Field, { key: "rel", label: "关系（relationship）" }, h("input", { style: c.input, value: form.relationship, onChange: set("relationship"), placeholder: "用户的牙科医生" })),
							h(Field, { key: "back", label: "背景（backstory）" }, h("input", { style: c.input, value: form.backstory, onChange: set("backstory"), placeholder: "2026-10 就诊时提到" })),
						]),
					]),
				]),
				h("div", { key: "a", style: { display: "flex", gap: 8, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, disabled: saving || !form.text.trim(), onClick: submit }, saving ? "保存中…" : initial ? "保存修改" : "新增记忆"),
					onCancel ? h("button", { key: "c", style: c.btn, disabled: saving, onClick: onCancel }, "取消") : null,
				]),
                error ? h("p", { key: "error", role: "alert", style: c.msg("err") }, error) : null,
			]);
		}

		function SettingsPanel(props) {
			const { data, onSaved, onDirty } = props;
			const withDefaults = (settings) => ({ injectMode: "summary", pinnedBudget: 2000, autoCaptureInterval: 3, ...settings, strategyRules: settings.strategyRules || [], entryPlacement: settings.entryPlacement || "both" });
			const [form, setForm] = useState(() => withDefaults(data.settings));
			const [msg, setMsg] = useState("");
            const [saving, setSaving] = useState(false);
            const savingRef = useRef(false);
			const baseline = useRef(JSON.stringify(withDefaults(data.settings)));
            const formDirty = JSON.stringify(form) !== baseline.current;
            useEffect(() => { onDirty?.(formDirty); }, [formDirty, onDirty]);
            useEffect(() => { if (!formDirty) { baseline.current = JSON.stringify(withDefaults(data.settings)); setForm(withDefaults(data.settings)); } }, [data.settings]);
			const pinnedChars = (data.memories || []).filter((r) => r.pinned && r.visibility !== "hidden").map((r) => "- " + renderLine(r, effectiveStrategy(r, form.strategy, form.strategyRules))).join("\n").length;
            const save = async () => {
                if (savingRef.current) return;
                if (form.strategyRules.some(rule => !rule.value.trim())) { setMsg('保存失败：请填写每条规则的条件值'); return; }
                savingRef.current = true; setSaving(true); setMsg('');
                try {
                    const res = await rpc('settings', form);
                    if (!res.ok) throw new Error(res.error === 'invalid-rules' ? '混合策略规则无效，请检查条件与目标格式' : res.error || '未知错误');
                    const settings = res.settings || form;
                    baseline.current = JSON.stringify(withDefaults(settings)); setForm(withDefaults(settings)); onDirty?.(false); onSaved(settings); setMsg('已保存');
                    const placement = settings.entryPlacement;
                    setTimeout(() => window.dispatchEvent(new CustomEvent('dsh-memory:placement', { detail: { placement } })), 700);
                } catch (error) { setMsg('保存失败：' + error.message); }
                finally { savingRef.current = false; setSaving(false); }
            };
            return h('fieldset', { disabled: saving, 'aria-label': '记忆偏好设置', style: { border: 0, margin: 0, padding: 0, minWidth: 0 } }, [
				h("p", { key: "save-hint", style: { fontSize: 12, color: t.secondary, margin: "0 0 10px", lineHeight: 1.6 } }, formDirty ? "有未保存修改，点底部「保存设置」生效。" : "修改后点底部「保存设置」生效。"),
                h('details', { key: 'format-settings', className: 'dshmem-secondary-details', style: { marginBottom: 12 } }, [
                    h('summary', { key: 'summary', style: { fontSize: 13, marginBottom: 12 } }, '记忆格式与匹配规则 · 高级'),
				h("div", { key: "st", style: { fontSize: 14, fontWeight: 600, marginBottom: 10 } }, "全局默认策略"),
                h("div", { key: "strategies", className: "dshmem-grid", role: "radiogroup", "aria-label": "记忆策略", style: c.grid2 }, STRATEGIES.map((s, i) => h("label", { key: s.id, style: c.strategyCard(form.strategy === s.id) }, [
                    h("span", { key: "n", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 } }, [
                        h("input", { key: "r", type: "radio", name: "dshmem-strategy", value: s.id, checked: form.strategy === s.id, onChange: () => setForm({ ...form, strategy: s.id }) }), s.name,
                        form.strategy === s.id ? h(Check, { key: "check" }) : null
                    ]),
                    h("span", { key: "d", style: { display: "block", color: t.secondary, marginTop: 8, lineHeight: 1.6, fontSize: 12 } }, s.desc),
                    h("span", { key: "fit", style: { display: "block", color: t.secondary, marginTop: 12, fontSize: 11 } }, ["适合简短事实与个人偏好", "适合经历、背景与完整叙述", "适合分类资料与精确更新", "适合人物关系与同名区分"][i])
                ]))),
				h("div", { key: "rules", style: { ...c.card, marginTop: 16 } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 10 } }, "混合策略规则"),
					h("p", { key: "hint", style: { fontSize: 12, color: t.secondary, lineHeight: 1.6 } }, "记录自己的格式覆盖优先；规则按顺序匹配，第一条命中即生效；未命中的记录使用全局默认策略。"),
					...form.strategyRules.map((rule, i) => {
						const update = (patch) => setForm({ ...form, strategyRules: form.strategyRules.map((r, j) => j === i ? { ...r, ...patch } : r) });
						return h("div", { key: i, style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 } }, [
							h("select", { key: "field", "aria-label": "规则 " + (i + 1) + " 条件字段", style: c.filterSelect, value: rule.field, onChange: (e) => update({ field: e.target.value }) }, [["kind", "类型"], ["scope", "范围"], ["category", "类别前缀"], ["tag", "标签"]].map(([value, label]) => h("option", { key: value, value }, label))),
							h("input", { key: "value", "aria-label": "规则 " + (i + 1) + " 条件值", required: true, style: { ...c.input, flex: "1 1 160px", width: "auto" }, value: rule.value, placeholder: "必填，如 semantic / global / 标签", onChange: (e) => update({ value: e.target.value }) }),
							h("select", { key: "strategy", "aria-label": "规则 " + (i + 1) + " 目标策略", style: c.filterSelect, value: rule.strategy, onChange: (e) => update({ strategy: e.target.value }) }, STRATEGIES.map((s) => h("option", { key: s.id, value: s.id }, s.name))),
							h("button", { key: "delete", type: "button", style: c.btnDanger, "aria-label": "删除规则 " + (i + 1), onClick: () => setForm({ ...form, strategyRules: form.strategyRules.filter((_, j) => j !== i) }) }, "删除"),
						]);
					}),
					h("button", { key: "add", type: "button", style: c.btn, onClick: () => setForm({ ...form, strategyRules: [...form.strategyRules, { field: "kind", value: "", strategy: form.strategy }] }) }, "添加规则"),
				]),
                ]),
				h("div", { key: "inj", style: { ...c.card, marginTop: 16 } }, [
                    h('h3', { key: 'title', style: { fontSize: 15, margin: '0 0 12px' } }, '记忆如何提供给 Agent'),
					h(Field, { key: "mode", label: "注入模式" }, h("select", { "aria-label": "注入模式", style: c.filterSelect, value: form.injectMode, onChange: (e) => setForm({ ...form, injectMode: e.target.value }) }, [["summary", "摘要模式"], ["details", "明细模式"], ["hybrid", "混合模式"]].map(([value, label]) => h("option", { key: value, value }, label)))),
					h("label", { key: "l", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.inject !== false, onChange: (e) => setForm({ ...form, inject: e.target.checked }) }),
						"每轮自动注入普通记忆（常驻记忆不受此开关影响）",
					]),
					h("label", { key: "ac", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 10 } }, [
						h("input", { key: "i", type: "checkbox", disabled: data.llmAvailable === false, checked: data.llmAvailable !== false && form.autoCapture === true, onChange: (e) => setForm({ ...form, autoCapture: e.target.checked }) }),
						"自动沉淀（LLM 提取后待确认）",
					]),
					data.llmAvailable === false ? h("p", { key: "unavailable", style: { fontSize: 12, color: t.secondary } }, "LLM 服务不可用，自动沉淀已禁用") : null,
					h("div", { key: "g", className: "dshmem-grid", style: { ...c.grid2, marginTop: 4 } }, [
						h(Field, { key: "interval", label: "自动沉淀间隔（轮）" }, h("input", { style: c.input, type: "number", min: 1, max: 100, value: form.autoCaptureInterval, onChange: (e) => setForm({ ...form, autoCaptureInterval: Number(e.target.value) }) })),
						h(Field, { key: "pinned", label: "常驻预算（字符）" }, h("input", { style: c.input, type: "number", min: 1, max: 20000, value: form.pinnedBudget, onChange: (e) => setForm({ ...form, pinnedBudget: Number(e.target.value) }) })),
						h(Field, { key: "n", label: "最多注入条数" }, h("input", { style: c.input, type: "number", min: 0, max: 50, value: form.maxInject, onChange: (e) => setForm({ ...form, maxInject: Number(e.target.value) }) })),
						h(Field, { key: "c", label: "注入字符上限" }, h("input", { style: c.input, type: "number", min: 200, max: 20000, value: form.maxInjectChars, onChange: (e) => setForm({ ...form, maxInjectChars: Number(e.target.value) }) })),
					]),
					h("p", { key: "budget", role: "status", style: { fontSize: 12, color: t.secondary } }, "常驻记忆：" + pinnedChars + " / " + form.pinnedBudget + " 字符（" + Math.round(pinnedChars / Math.max(1, form.pinnedBudget) * 100) + "%）；超出预算时整条省略，不截断事实。"),
				]),
				h("div", { key: "place", style: { ...c.card, marginTop: 16 } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 10 } }, "入口位置"),
					h("div", { key: "g", className: "dshmem-grid", role: "radiogroup", "aria-label": "入口位置", style: c.grid3 }, [
						["both", "两处都显示", "侧边栏 + 左下角设置"],
						["sidebar", "仅侧边栏", "左侧栏的面板列表"],
						["settings", "仅设置页", "左下角设置 → 记忆"],
					].map(([id, name, desc]) => h("label", { key: id, style: c.strategyCard(form.entryPlacement === id) }, [
						h("span", { key: "n", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 } }, [
							h("input", { key: "r", type: "radio", name: "dshmem-placement", value: id, checked: form.entryPlacement === id, onChange: () => setForm({ ...form, entryPlacement: id }) }),
							name,
						]),
						h("span", { key: "d", style: { display: "block", color: t.secondary, marginTop: 6, fontSize: 12, lineHeight: 1.5 } }, desc),
					]))),
					h("div", { key: "hint", style: { fontSize: 11.5, color: t.secondary, marginTop: 8, lineHeight: 1.6 } }, "保存后入口位置立即调整；若当前页面消失，从新入口重新打开即可。"),
				]),

				h("div", { key: "a", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, disabled: saving, onClick: save }, saving ? '保存中…' : '保存设置'),
					formDirty ? h("span", { key: "dirty", style: { fontSize: 12, color: t.secondary } }, "有未保存修改") : null,
					msg ? h("span", { key: "m", role: "status", style: c.msg(msg === "已保存" ? "ok" : "err") }, msg) : null,
				]),
			]);
		}

		function IoPanel(props) {
			const { refresh, onDirty } = props;
			const [text, setText] = useState("");
            const [exportText, setExportText] = useState('');
            const [busy, setBusy] = useState(false);
            const fileRead = useRef(0);
            useEffect(() => () => { fileRead.current++; }, []);
			const [mode, setMode] = useState("merge");
			const [msg, setMsg] = useState("");
			const [msgKind, setMsgKind] = useState("info");
			const notify = (text, kind = "info") => { setMsg(text); setMsgKind(kind); };
			const doExport = async () => {
                if (busy) return; setBusy(true);
                try {
				const res = await rpc("export");
                if (!res.ok) throw new Error(res.error || '无法导出');
				const json = JSON.stringify(res.data, null, 2);
				setExportText(json);
				try {
					const blob = new Blob([json], { type: "application/json" });
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "dsh-memory-export.json";
					a.click();
					setTimeout(() => URL.revokeObjectURL(a.href), 2000);
					notify("已导出并开始下载", "ok");
				} catch (e) { notify("已生成 JSON，可手动复制", "info"); }
                } catch (error) { notify('导出失败：' + error.message, 'err'); }
                finally { setBusy(false); }
			};
			const doImport = async () => {
                if (busy) return;
				let data;
				try { data = JSON.parse(text); } catch (e) { notify("JSON 解析失败：" + e.message, "err"); return; }
                setBusy(true);
				try {
					const checked = await rpc("preview-import", { data, mode });
					if (!checked.ok) { notify("预览失败：" + (checked.error || ""), "err"); return; }
					const p = checked.preview;
					const summary = "新增 " + p.newCount + " / 更新 " + p.updateCount + " / 无变化 " + p.keptCount + " / 无效 " + p.invalidCount + (p.settingsChanged ? "；设置将改变" : "");
					notify(summary, "info");
					if (p.invalidCount) { notify(summary + "。请修正无效记录后重试。", "err"); return; }
					if (!confirm(summary + (mode === "replace" ? "。将替换现有记忆并自动备份。" : "。") + "确认导入？")) return;
					const res = await rpc("import", { data, mode });
					if (res.ok) { notify("导入完成，共 " + res.count + " 条", "ok"); onDirty?.(false); await refresh(); } else notify("导入失败：" + (res.error || ""), "err");
				} catch (error) { notify("导入失败：" + (error.message || error), "err"); }
                finally { setBusy(false); }
			};
			return h("div", null, [
				h("div", { key: "e", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导出"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "导出全部记忆、设置与画像为 JSON，便于备份或迁移到另一台机器。"),
					h("button", { key: "b", style: c.btnPrimary, disabled: busy, onClick: doExport }, "导出 JSON"),
                    exportText ? h('details', { key: 'export-content', className: 'dshmem-secondary-details' }, [h('summary', { key: 's' }, '查看或复制导出的内容'), h('textarea', { key: 'json', readOnly: true, 'aria-label': '导出的 JSON', style: { ...c.area, marginTop: 10, fontFamily: 'ui-monospace, monospace' }, value: exportText })]) : null,
				]),
				h("div", { key: "i", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导入（先预览）"),
                    h('p', { key: 'd', style: c.detailNote }, '选择记忆备份文件，先预览变化，再确认导入。默认合并，不会清空未匹配的记录。'),
                    h('label', { key: 'file', style: c.label }, ['选择 JSON 备份文件', h('input', { key: 'input', type: 'file', accept: '.json,application/json', 'aria-label': '选择记忆备份文件', disabled: busy, style: { ...c.input, fontSize: 12 }, onChange: async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const generation = ++fileRead.current; setText(''); onDirty?.(false);
                        if (file.size > 20 * 1024 * 1024) { notify('文件超过 20 MB，请选择较小的备份。', 'err'); return; }
                        try { const content = await file.text(); if (generation !== fileRead.current) return; setText(content); onDirty?.(!!content.trim()); notify('已读取 ' + file.name + '，可点击「预览导入」。', 'info'); }
                        catch (err) { if (generation === fileRead.current) notify('读取失败：' + err.message, 'err'); }
                    } })]),
                    text.trim() ? h('p', { key: 'ready', style: { fontSize: 12, color: t.secondary } }, '导入内容已就绪 · ' + text.length + ' 字符') : null,
                    h('details', { key: 'paste', className: 'dshmem-secondary-details' }, [
                        h('summary', { key: 's' }, '或粘贴 / 检查 JSON 内容'),
                        h('textarea', { key: 'a', 'aria-label': '待导入的 JSON', spellCheck: false, disabled: busy, style: { ...c.area, marginTop: 10, minHeight: 160, fontFamily: 'var(--ds-font-family-code, ui-monospace, monospace)', fontSize: 12 }, value: text, onChange: e => { fileRead.current++; setText(e.target.value); onDirty?.(!!e.target.value.trim()); }, placeholder: '粘贴导出的 JSON 备份…' }),
                    ]),
					h("div", { key: "r", style: { display: "flex", gap: 10, alignItems: "center", marginTop: 10 } }, [
                        h("div", { key: "m", role: "group", "aria-label": "导入方式", style: { ...c.tabs, margin: 0 } }, ["merge", "replace"].map((m) => h("button", { key: m, "aria-pressed": mode === m, style: c.tab(mode === m), disabled: busy, onClick: () => setMode(m) }, m === "merge" ? "合并" : "替换"))),
						h("button", { key: "b", style: c.btnPrimary, disabled: busy || !text.trim(), onClick: doImport }, "预览导入"),
					]),
				]),
				h("details", { key: "c", style: { ...c.card, background: t.surface } }, [
					h("summary", { key: "t", style: { fontSize: 13, color: t.secondary, cursor: 'pointer' } }, "危险操作 · 清空记忆"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "清空全部记忆，不可撤销（建议先导出备份）。"),
					h("button", { key: "b", style: c.btnDanger, disabled: busy, onClick: async () => {
                        if (busy) return;
						if (!confirm("确定清空全部记忆？建议先导出备份。")) return;
                        setBusy(true); fileRead.current++;
                        try {
                            const result = await rpc('clear', {}); if (!result.ok) throw new Error(result.error || '清空失败');
                            await refresh(); setText(''); onDirty?.(false); notify('已清空', 'ok');
                        } catch (error) { notify('清空失败：' + error.message, 'err'); }
                        finally { setBusy(false); }
					} }, "清空全部记忆"),
				]),
				msg ? h("div", { key: "m", role: "status", style: c.msg(msgKind) }, msg) : null,
			]);
		}

        function SettingsHub({ data, refresh, onDirty, onSaved }) {
            const [section, setSection] = useState('preferences');
            const [preferencesDirty, setPreferencesDirty] = useState(false);
            const [importDirty, setImportDirty] = useState(false);
            useEffect(() => { onDirty?.(preferencesDirty || importDirty); }, [preferencesDirty, importDirty, onDirty]);
            return h('div', { className: 'dshmem-settings-hub' }, [
                h('nav', { key: 'navigation', className: 'dshmem-settings-nav', 'aria-label': '设置分类' }, [
                    ['preferences', '偏好设置', '自动记忆、参考方式与显示入口', preferencesDirty],
                    ['data', '数据与备份', '导出备份、导入迁移与数据管理', importDirty],
                ].map(([id, title, description, dirty]) => h('button', { key: id, id: 'dshmem-settings-' + id + '-tab', type: 'button', 'aria-pressed': section === id, 'aria-controls': 'dshmem-settings-' + id, onClick: () => setSection(id) }, [
                    h('strong', { key: 'title' }, title + (dirty ? ' · 未保存' : '')), h('span', { key: 'description' }, description),
                ]))),
                h('section', { key: 'preferences', id: 'dshmem-settings-preferences', hidden: section !== 'preferences', 'aria-labelledby': 'dshmem-settings-preferences-tab' }, [
                    h('h2', { key: 'title', style: { fontSize: 17, margin: '0 0 6px' } }, '让记忆按你的方式工作'),
                    h('p', { key: 'subtitle', style: { ...c.detailNote, margin: '0 0 20px' } }, '日常使用保持默认即可；需要时再调整格式与预算。'),
                    h(SettingsPanel, { key: 'settings', data, onDirty: setPreferencesDirty, onSaved }),
                ]),
                h('section', { key: 'data', id: 'dshmem-settings-data', hidden: section !== 'data', 'aria-labelledby': 'dshmem-settings-data-tab' }, [
                    h('h2', { key: 'title', style: { fontSize: 17, margin: '0 0 6px' } }, '数据与备份'),
                    h('p', { key: 'subtitle', style: { ...c.detailNote, margin: '0 0 20px' } }, '换设备、迁移或整理之前，先为记忆留一份备份。'),
                    h(IoPanel, { key: 'io', refresh, onDirty: setImportDirty }),
                    h('details', { key: 'location', className: 'dshmem-secondary-details' }, [
                        h('summary', { key: 's' }, '存储位置与隐私'),
                        h('p', { key: 'path', style: c.detailNote }, '存储目录：' + (data.dir || '未提供')),
                        h('p', { key: 'warning', style: c.detailNote }, '备份为明文，并包含隐藏记录。请妥善保管，不要上传到公共仓库或发送给不可信服务。'),
                    ]),
                ]),
            ]);
        }

        function qualityGroups(memories) {
            const texts = new Map(), paths = new Map();
            for (const rec of memories) {
                if (!['active', 'conflict'].includes(rec.status || 'active') || rec.supersededBy) continue;
                const context = [rec.scope || 'global', rec.projectId || '', rec.person || '', rec.relationship || '', rec.conditions || '', rec.visibility || 'visible'];
                const text = (rec.text || '').trim();
                const duplicateKey = JSON.stringify([...context, rec.status || 'active', rec.kind || 'semantic', rec.category || '', rec.subcategory || '', rec.key || '', rec.value || '', rec.backstory || '', rec.occurredAt ?? null, rec.validFrom ?? null, rec.validUntil ?? null, text]);
                if (text) { if (!texts.has(duplicateKey)) texts.set(duplicateKey, []); texts.get(duplicateKey).push(rec); }
                if (rec.category || rec.subcategory || rec.key) {
                    const path = JSON.stringify([...context, rec.category || '', rec.subcategory || '', rec.key || '']);
                    if (!paths.has(path)) paths.set(path, []);
                    paths.get(path).push(rec);
                }
            }
            const groups = [];
            for (const [text, rows] of texts) if (rows.length > 1) groups.push({ type: "duplicate", label: "精确重复", rows });
            for (const [path, candidates] of paths) {
                const overlaps = (a, b) => Math.max(a.validFrom ?? 0, b.validFrom ?? 0) < Math.min(a.validUntil ?? Infinity, b.validUntil ?? Infinity);
                const rows = candidates.filter(a => candidates.some(b => a !== b && (a.value || a.text) !== (b.value || b.text) && overlaps(a, b)));
                if (rows.length > 1) groups.push({ type: 'conflict', label: '同路径多值：' + JSON.parse(path).slice(-3).filter(Boolean).join('.'), rows });
            }
            return groups.map(g => ({ ...g, id: g.type + JSON.stringify(g.rows.map(r => [r.id, r.updatedAt]).sort()) }));
        }
        function QualityPanel({ memories, refresh, embedded }) {
            const [ignored, setIgnored] = useState([]);
            const [details, setDetails] = useState([]);
            const [busy, setBusy] = useState(false);
            const [error, setError] = useState("");
            const groups = qualityGroups(memories).filter(g => !ignored.includes(g.id));
            const act = async (group, merge) => {
                const rows = [...group.rows].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || (b.createdAt || 0) - (a.createdAt || 0) || String(b.id).localeCompare(String(a.id)));
                const newest = rows[0];
                if (!confirm((merge ? '合并标签并保留最新副本' : '保留最新副本') + '（' + newest.id + '），将其余 ' + (rows.length - 1) + ' 条转为历史记录并保留来源依据？请先核对内容和归属。')) return;
                setBusy(true); setError("");
                try {
                    const result = await rpc('merge-duplicates', { keepId: newest.id, otherIds: rows.slice(1).map(rec => rec.id), mergeTags: merge });
                    if (!result.ok) throw new Error(result.error || '合并失败');
                } catch (error) { setError("操作失败：" + error.message); }
                finally { await refresh(); setBusy(false); }
            };
            const resolve = async (group, chosen) => {
                if (!confirm('确认以此条作为当前事实，并取代本组其他记录？不按更新时间自动决定。\n\n' + chosen.id + '\n' + chosen.text)) return;
                setBusy(true); setError('');
                try { for (const old of group.rows.filter(r => r.id !== chosen.id)) { const result = await rpc('supersede', { oldId: old.id, newId: chosen.id }); if (!result.ok) throw new Error(result.error); } }
                catch (err) { setError('操作失败：' + err.message); }
                finally { await refresh(); setBusy(false); }
            };
            const flag = async group => {
                if (!confirm('将本组标记为待确认冲突？确认前不会提供给 Agent。不同时间、人物或条件下均成立时，应编辑适用范围而非强行取代。')) return;
                setBusy(true); setError('');
                try { for (const rec of group.rows) { const result = await rpc('update', { id: rec.id, patch: { status: 'conflict' } }); if (!result.ok) throw new Error(result.error); } }
                catch (err) { setError('操作失败：' + err.message); }
                finally { await refresh(); setBusy(false); }
            };
            return h("section", { style: embedded ? { ...c.card, border: "none", padding: 0, marginBottom: 0, background: "transparent" } : c.card, "aria-label": "记忆质量审阅" }, [
                embedded ? null : h("h2", { key: "title", style: { fontSize: 15, marginTop: 0 } }, "质量审阅"),
                !groups.length ? h("p", { key: "empty", style: { fontSize: 13, color: t.secondary } }, "没有待审阅的重复或同路径多值") : null,
                ...groups.map(group => h("article", { key: group.id, style: c.card }, [
                    h("h3", { key: "title", style: { fontSize: 14, overflowWrap: "anywhere" } }, group.label),
                    ...group.rows.map(rec => h('div', { key: rec.id, style: { marginBottom: 12 } }, [
                        h('p', { key: 'text', style: { fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, rec.id + ' · ' + fmtTime(rec.updatedAt) + ' · ' + (rec.scope || 'global') + ' · ' + (rec.person || '未指定人物') + '\n' + rec.text + (group.type === 'conflict' ? '\n值：' + rec.value : '')),
                        h(EvidenceDetails, { key: 'evidence', rec, records: memories }),
                        group.type === 'conflict' ? h('button', { key: 'resolve', disabled: busy, style: c.btn, onClick: () => resolve(group, rec) }, '以此条取代本组其他记录') : null,
                    ])),
                    group.type === 'conflict' ? h('button', { key: 'flag', disabled: busy, style: c.btn, onClick: () => flag(group) }, '标记为待确认冲突') : null,
                    h("div", { key: "actions", style: c.filterRow }, [
                        ...(group.type === "duplicate" ? [
                            h("button", { key: "keep", disabled: busy, style: c.btn, onClick: () => act(group, false) }, "保留最新"),
                            h("button", { key: "merge", disabled: busy, style: c.btn, onClick: () => act(group, true) }, "合并标签"),
                        ] : [h("button", { key: "details", style: c.btn, onClick: () => setDetails(prev => prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]) }, "显示详情")]),
                        h("button", { key: "ignore", disabled: busy, style: c.btn, onClick: () => { if (confirm("忽略此审阅组？仅本次审阅生效，不修改记忆。")) setIgnored(prev => [...prev, group.id]); } }, "忽略"),
                    ]),
                    details.includes(group.id) ? h("div", { key: "details", className: "dshmem-grid", style: c.grid2 }, group.rows.map(rec => h("pre", { key: rec.id, style: { ...c.card, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 } }, JSON.stringify(rec, null, 2)))) : null,
                ])),
                error ? h("p", { key: "error", role: "alert", style: c.msg("err") }, error) : null,
            ]);
        }

        function lineDiff(before, after) {
            if (before === after) return [];
            const oldLines = before.split("\n"), newLines = after.split("\n");
            const lines = [];
            for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
                if (oldLines[i] === newLines[i]) { lines.push("  " + oldLines[i]); continue; }
                if (i < oldLines.length) lines.push("- " + oldLines[i]);
                if (i < newLines.length) lines.push("+ " + newLines[i]);
            }
            return lines;
        }

        function Term(props) {
            return h("section", { style: c.card }, [
                h("h2", { key: "title", style: { fontSize: 14, marginTop: 0 } }, props.term),
                h("p", { key: "body", style: { fontSize: 13, color: t.secondary, lineHeight: 1.7 } }, props.children),
            ]);
        }
        function HelpPanel() {
            const cards = [
                ["记忆维护", "在「记忆」搜索、新增、编辑或删除；「审阅重复与矛盾」可审阅重复与同路径多值。「设置」中可导入预览并导出备份。"],
                ["面板搜索 vs Agent 检索", "面板搜索只过滤当前列表；Agent 的 memory_search 会在记忆库里检索并排序。两者都是关键词匹配，不是向量语义检索。"],
                ["混合策略", "生效顺序：记录覆盖 → 第一条匹配规则 → 全局默认。切换格式保留原字段。类型、范围和标签用于组织事实。"],
                ["常驻记忆 vs 全局规则", "常驻记忆属于插件，每轮在独立预算内优先注入，不受普通记忆自动注入开关影响。AGENTS.md 由 DSH 宿主按会话读取注入，独立于插件开关，需确认具体内容后写入。"],
                ["对 Agent 隐藏（可见性）", "隐藏的记忆仍保留在库中，可在本面板查看、编辑、恢复，但不会进入任何模型读取出口：自动注入（含常驻）、memory_search、memory_list、画像摘要和自动沉淀的提取上下文。切换隐藏或恢复都会把画像标记为待更新。列表默认显示全部记忆（包括已隐藏），可用「仅看已隐藏」筛选。"],
                ['项目隔离与迁移', '项目事实绑定会话创建时的目录；不同目录分别隔离，移动目录后需显式重新认领。旧记录没有 projectId 时仅供管理，不自动猜归属。全局画像只用全局事实，项目画像只用全局加对应项目事实。'],
                ['来源、时间与冲突', '查看依据可核对原句、会话/消息引用、观察时间和确认方式。没有来源不代表已核实；历史、过期、未生效、被取代和待确认冲突不提供给 Agent。更新时保留对象、时间与适用条件，不以最新时间戳自动覆盖。'],
                ['相关性与预算', '常驻事实独立预算；普通明细按当前问题关键词召回，再按相关性排序，完整条目装入预算。被注入与主动搜索分别计数，摘要模式仍提供范围内概览。关键词无匹配不代表不存在，应调整检索或澄清。'],
                ["自动沉淀与画像", "自动沉淀覆盖设置间隔内所有轮次，仅提取有用户原句证据的事实，确认后入库。让 Agent 更新画像，生成后 10 秒内自动展示最新内容。"],
                ["注入与数据", "每轮会把高价值记忆作为参考发给 Agent，受条数和字符预算限制；画像摘要过期时改用明细。记忆是数据，当前明确要求优先；本地明文文件不要保存密码或密钥。"],
            ];
            return h("div", null, cards.map(([term, text]) => h(Term, { key: term, term }, text)));
        }

		function AgentsPanel({ onDirty }) {
            const [preview, setPreview] = useState(null);
			const [file, setFile] = useState(null);
			const [content, setContent] = useState("");
			const [msg, setMsg] = useState("");
			const [busy, setBusy] = useState(false);
            useEffect(() => { onDirty?.(!!file && content !== file.content); }, [file, content, onDirty]);
			const load = async () => {
				setBusy(true);
				try {
					const response = await fetch("/api/memory/agents-md", { credentials: "same-origin" });
					const result = await response.json();
					if (!response.ok || !result.ok) throw new Error(result.error || "读取失败");
					setFile(result); setContent(result.content); setPreview(null); setMsg("");
				} catch (error) { setMsg("读取失败：" + error.message); }
				finally { setBusy(false); }
			};
			useEffect(() => { load(); }, []);
			const save = async () => {
				if (!preview || preview.content !== content || !confirm("确认写入预览中的完整规则内容？写入前会自动备份。")) return;
				setBusy(true);
				try {
					const currentResponse = await fetch("/api/memory/agents-md", { credentials: "same-origin" });
                    const current = await currentResponse.json();
                    if (!currentResponse.ok || !current.ok) throw new Error("无法核对当前内容");
                    if (current.content !== file.content) { setFile(current); setPreview(null); throw new Error("文件已变更，请重新预览差异"); }
                    const response = await fetch("/api/memory/agents-md", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
					const result = await response.json();
					if (!response.ok || !result.ok) throw new Error(result.error || "写入失败");
					setFile({ ...file, exists: true, content }); setPreview(null); setMsg("已保存，原内容已备份");
				} catch (error) { setMsg("保存失败：" + error.message); }
				finally { setBusy(false); }
			};
			return h("div", { style: c.card }, [
				h("p", { key: "intro", style: { fontSize: 13, lineHeight: 1.7, color: t.secondary } }, "此文件由 DSH 宿主按会话自动读取注入，独立于插件的自动注入开关。关闭插件的自动注入不会停用此文件。"),
				h("p", { key: "path", style: { fontSize: 12, color: t.secondary, overflowWrap: "anywhere" } }, file?.path || "~/.dsh/AGENTS.md"),
				file && !file.exists ? h("p", { key: "missing", style: { fontSize: 12, color: t.secondary } }, "文件不存在，保存将创建") : null,
				h("textarea", { key: "content", "aria-label": "全局规则内容", disabled: !file || busy, style: { ...c.area, minHeight: 300, fontFamily: "ui-monospace, monospace" }, value: content, onChange: (e) => { setContent(e.target.value); setPreview(null); } }),
				h("button", { key: "save", type: "button", disabled: !file || busy, style: { ...c.btnPrimary, marginTop: 12 }, onClick: () => setPreview({ content, lines: lineDiff(file.content, content) }) }, busy ? "处理中…" : "预览差异"),
                preview ? h("div", { key: "preview", style: { marginTop: 12 } }, [
                    h("h3", { key: "title", style: { fontSize: 14 } }, "当前内容 vs 新内容"),
                    h("pre", { key: "diff", style: { ...c.card, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 } }, preview.lines.join("\n") || "内容无变化"),
                    h("details", { key: "full" }, [h("summary", { key: "title" }, "拟写入的完整内容"), h("pre", { key: "text", style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, preview.content)]),
                    h("button", { key: "confirm", disabled: busy, style: c.btnPrimary, onClick: save }, "确认写入"),
                ]) : null,
				!file && !busy ? h("button", { key: "retry", type: "button", style: c.btn, onClick: load }, "重试") : null,
				msg ? h("p", { key: "msg", role: "status", style: c.msg(msg.startsWith("已保存") ? "ok" : "err") }, msg) : null,
			]);
		}

		function PendingPanel({ pending, refresh }) {
			const [open, setOpen] = useState(false);
			const [busy, setBusy] = useState(false);
			const [error, setError] = useState("");
			const decide = async (approve, rec) => {
				setBusy(true); setError("");
				try {
					if (approve) {
						for (const item of rec ? [rec] : pending) {
							const result = await rpc("add", { ...item, pinned: false, source: "auto-approved", captureId: item.id });
							if (!result.ok) throw new Error(result.error || "写入失败");
						}
					} else {
						const result = await rpc("reject", rec ? { id: rec.id } : { all: true });
						if (!result.ok) throw new Error(result.error || "忽略失败");
					}
				} catch (error) { setError("操作失败：" + error.message); }
				finally { await refresh(); setBusy(false); }
			};
			if (!pending.length) return null;
			return h("div", { style: c.card }, [
				h("div", { key: "banner", style: c.filterRow }, [
					h("span", { key: "text", role: "status", style: { fontSize: 13 } }, "有 " + pending.length + " 条自动提取的记忆待确认"),
					h("button", { key: "view", type: "button", style: c.btn, "aria-expanded": open, onClick: () => setOpen(!open) }, open ? "收起" : "查看"),
				]),
				open ? h("div", { key: "items" }, [
					...pending.map((rec) => h("div", { key: rec.id, style: { marginTop: 12 } }, [
						h("p", { key: "text", style: { fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, rec.text),
                        rec.evidence ? h("p", { key: "evidence", style: { fontSize: 12, color: t.secondary, whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, "来源原句：" + rec.evidence) : null,
						h("div", { key: "actions", style: c.filterRow }, [
							h("button", { key: "yes", type: "button", disabled: busy, style: c.btnPrimary, onClick: () => decide(true, rec) }, "确认写入"),
							h("button", { key: "no", type: "button", disabled: busy, style: c.btn, onClick: () => decide(false, rec) }, "忽略"),
						]),
					])),
					h("div", { key: "all", style: { ...c.filterRow, marginTop: 16 } }, [
						h("button", { key: "yes", type: "button", disabled: busy, style: c.btnPrimary, onClick: () => decide(true) }, "全部写入"),
						h("button", { key: "no", type: "button", disabled: busy, style: c.btn, onClick: () => decide(false) }, "全部忽略"),
					]),
				]) : null,
				error ? h("p", { key: "error", role: "status", style: c.msg("err") }, error) : null,
			]);
		}

		function MemorySettingsSection() {
			return h("div", { style: { height: "100%", minHeight: 0 } }, h(MemoryPage));
		}

		function renderInline(text) {
			const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
			return parts.map((part, i) => {
				if (part.startsWith("`") && part.endsWith("`")) return h("code", { key: i, style: { fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)", fontSize: "0.92em", padding: "1px 4px", borderRadius: 4, background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))" } }, part.slice(1, -1));
				if (part.startsWith("**") && part.endsWith("**")) return h("strong", { key: i }, part.slice(2, -2));
				return part;
			});
		}
		function renderProfileBlocks(content) {
			const blocks = [];
			for (const line of String(content || "").split("\n")) {
				if (/^\s*[-*]\s+/.test(line)) {
					const item = line.replace(/^\s*[-*]\s+/, "");
					const last = blocks[blocks.length - 1];
					if (last && last.type === "ul") last.items.push(item);
					else blocks.push({ type: "ul", items: [item] });
				} else if (/^###\s+/.test(line)) blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
				else if (/^##\s+/.test(line)) blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
				else if (/^#\s+/.test(line)) blocks.push({ type: "h1", text: line.replace(/^#\s+/, "") });
				else if (line.trim()) blocks.push({ type: "p", text: line });
			}
			return blocks.map((block, i) => {
				if (block.type === "h1") return h("h3", { key: i, style: { fontSize: 18, fontWeight: 600, lineHeight: 1.4, margin: "0 0 10px" } }, renderInline(block.text));
				if (block.type === "h2") return h("h4", { key: i, style: { fontSize: 15, fontWeight: 600, lineHeight: 1.5, margin: "16px 0 8px" } }, renderInline(block.text));
				if (block.type === "h3") return h("h5", { key: i, style: { fontSize: 14, fontWeight: 600, lineHeight: 1.5, margin: "12px 0 6px" } }, renderInline(block.text));
				if (block.type === "ul") return h("ul", { key: i, style: { margin: "4px 0 10px", paddingLeft: 22 } }, block.items.map((item, j) => h("li", { key: j, style: { fontSize: 14, lineHeight: 1.7, margin: "2px 0" } }, renderInline(item))));
				return h("p", { key: i, style: { fontSize: 14, lineHeight: 1.75, margin: "0 0 8px", whiteSpace: "pre-wrap" } }, renderInline(block.text));
			});
		}

        function ProfileScopePanel({ data }) {
            const [projectId, setProjectId] = useState('');
            const profile = projectId ? data.profiles?.[projectId] || {} : data.profile || {};
            const memories = (data.memories || []).filter(r => (r.scope || 'global') === 'global' || (projectId && r.projectId === projectId));
            return h('div', null, [
                h(Field, { key: 'scope', label: '画像范围' }, h('select', { 'aria-label': '画像范围', style: c.input, value: projectId, onChange: e => setProjectId(e.target.value) }, [
                    h('option', { key: '', value: '' }, '全局画像（仅全局事实）'),
                    ...(data.projects || []).map(p => h('option', { key: p.id, value: p.id }, p.name + '（全局 + 该项目）')),
                ])),
                h(ProfilePanel, { key: projectId || 'global', profile, memories, projectId, memoriesCount: data.profileCounts?.[projectId] }),
                h('p', { key: 'hint', style: { fontSize: 12, color: t.secondary } }, projectId ? '请在该项目目录创建的会话中说「帮我更新当前项目画像」。其他项目画像不会混入此范围。' : '请说「仅基于全局记忆更新全局画像」。Agent 应先用 memory_list(scope=global) 读取，再用 memory_update_profile(scope=global) 保存。'),
            ]);
        }
		function ProfilePanel({ profile = {}, memories = [], projectId = '', memoriesCount }) {
			const count = memoriesCount ?? memories.filter((r) => serviceState(r) === '当前有效' && r.visibility !== 'hidden').length;
			return h("section", { style: { ...c.card, marginTop: 16 }, "aria-label": "用户画像" }, [
				h("h2", { key: "title", style: { fontSize: 16, marginTop: 0 } }, "用户画像"),
				h("p", { key: "status", role: "status", style: { fontSize: 12, color: t.secondary } }, count + ' 条范围内有效记忆 · ' + (profile.content ? (profile.sourceCoverage === 'declared' ? '声明引用 ' + (profile.sourceIds || []).length + ' 条' : '未声明来源覆盖') + ' · ' : '') + (profile.generatedAt ? '生成于 ' + relativeTime(profile.generatedAt) : '尚未生成')),
				profile.stale ? h("p", { key: "stale", role: "status", style: { fontSize: 13, color: t.warnText } }, "数据已变更，摘要待更新") : null,
                profile.content && profile.verified !== true ? h('p', { key: 'unverified', role: 'note', style: { fontSize: 12, color: t.warnText } }, '此内容未通过范围快照与来源校验，仅供管理查看，不会注入给 Agent。重新生成时需附最新 snapshot 与非空 sourceIds；此校验不等于事实语义已经核实。') : null,
				profile.content ? h("div", { key: "content", style: { fontSize: 14, lineHeight: 1.75, overflowWrap: "anywhere" } }, renderProfileBlocks(profile.content)) : h("div", { key: "empty", style: { ...c.empty, border: "none", padding: "36px 16px" } }, [
					h("p", { key: "icon", "aria-hidden": true, style: { fontSize: 36, margin: "0 0 12px" } }, "👤"),
					h("p", { key: "title", style: { fontSize: 14, fontWeight: 600, color: t.text, margin: "0 0 6px" } }, "还没有生成用户画像"),
					h("p", { key: "desc", style: { fontSize: 13, color: t.secondary, lineHeight: 1.7, margin: "0 0 12px", maxWidth: 420 } }, "画像会把你的记忆库综合成一篇「关于用户」的摘要文档，帮助 Agent 在任何会话中快速了解你。你可以在任意会话中让 Agent 生成或更新。"),
					h("div", { key: "how", style: { fontSize: 12.5, color: t.secondary, textAlign: "left", display: "inline-block", lineHeight: 2, marginBottom: 8 } }, [
						h("div", { key: "h1" }, "1. 在任意会话中对 Agent 说：「帮我更新一下用户画像」"),
						h("div", { key: "h2" }, "2. Agent 会综合记忆库自动生成 Markdown 摘要"),
						h("div", { key: "h3" }, "3. 生成后 10 秒内自动展示最新内容（完整视图）"),
					]),
				]),
				profile.stale ? h("p", { key: "regen-hint", role: "status", style: { fontSize: 13, color: t.warnText } }, "数据已变更，摘要待更新——对 Agent 说「帮我更新画像」即可重新生成") : null,
			]);
		}

		function MemoryPage() {
			// simplified view removed — always full mode
            const { data, setData, error, refresh } = useStore();
			const [tab, setTab] = useState("list");
			const [adding, setAdding] = useState(false);
            const [draftId, setDraftId] = useState(0);
            const [dirty, setDirty] = useState(false);
            const [reviewOpen, setReviewOpen] = useState(false);
            const leaveEdit = () => !dirty || confirm("有未保存的编辑，确定离开？");
            const closeEditor = () => { if (!leaveEdit()) return; setDirty(false); setEditing(null); setAdding(false); };
            const changeTab = next => {
                if (next === tab) return true;
                if (!leaveEdit()) { if (typeof document !== 'undefined') document.getElementById('dshmem-tab-' + tab)?.focus(); return false; }
                setDirty(false); setEditing(null); setAdding(false); setTab(next); return true;
            };
            useEffect(() => {
                let active = true, fetching = false;
                const signature = (j) => JSON.stringify([j.memories.length, j.memories.reduce((max, r) => Math.max(max, r.updatedAt || 0), 0), j.profile, j.profiles, j.projects, j.profileCounts, j.conflictIds, j.settings]);
                const timer = setInterval(async () => {
                    if (fetching) return;
                    fetching = true;
                    try {
                        const response = await fetch("/api/memory/state", { credentials: "same-origin" });
                        const j = await response.json();
                        if (active && response.ok && j.ok) setData(prev => !prev || signature(prev) !== signature(j) ? j : prev);
                    } catch { /* retry on next poll */ }
                    finally { fetching = false; }
                }, 10000);
                return () => { active = false; clearInterval(timer); };
            }, [setData]);
			const [query, setQuery] = useState("");
			const [editing, setEditing] = useState(null);
			const [notice, setNotice] = useState("");
			const [kindFilter, setKindFilter] = useState("all");
			const [scopeFilter, setScopeFilter] = useState("all");
			const [pinnedOnly, setPinnedOnly] = useState(false);
			const [visibilityFilter, setVisibilityFilter] = useState("all");
			const [tagFilter, setTagFilter] = useState("");
			const [sortBy, setSortBy] = useState("updated");
			const narrow = useNarrow();
			const [filtersOpen, setFiltersOpen] = useState(false);
			const [groupBy, setGroupBy] = useState("none");
            const [projectFilter, setProjectFilter] = useState('all');
            const [statusFilter, setStatusFilter] = useState('all');
            const [attentionOnly, setAttentionOnly] = useState(false);
            const [detailId, setDetailId] = useState(null);
            useEffect(() => { if (detailId && data && !(data.memories || []).some(rec => rec.id === detailId)) setDetailId(null); }, [detailId, data?.memories]);

			if (error) return h("div", { className: "dshmem-root", style: c.page }, [h("style", { key: "css" }, css), h("div", { key: "content", className: "dshmem-content", style: c.content }, [
				h("div", { key: "h", style: c.head }, h("h1", { key: "t", style: c.title }, "记忆")),
				h("div", { key: "err", style: { ...c.card, marginTop: 16 } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 6 } }, "加载失败"),
					h("div", { key: "d", style: { fontSize: 13, color: t.secondary, lineHeight: 1.7 } }, "无法读取记忆：" + error + "（插件宿主端是否已启用？）"),
					h("button", { key: "r", type: "button", style: { ...c.btnPrimary, marginTop: 12 }, onClick: refresh }, "重试"),
				]),
			])]);
			if (!data) return h("div", { className: "dshmem-root", style: c.page }, [h("style", { key: "css" }, css), h("div", { key: "content", className: "dshmem-content", style: c.content }, [
				h("div", { key: "h", style: c.head }, h("h1", { key: "t", style: c.title }, "记忆")),
				h("div", { key: "sk", "aria-busy": "true", "aria-label": "加载中", style: { display: "flex", flexDirection: "column", gap: 12 } }, [0, 1, 2].map((i) => h("div", { key: i, className: "dshmem-skeleton", style: { height: i === 0 ? 64 : 80 } }))),
			])]);

			const strategy = data.settings.strategy;
			const profilePanel = h(ProfileScopePanel, { key: 'profile', data });
			const rules = data.settings.strategyRules || [];
			const memories = data.memories || [];
			const hiddenCount = memories.filter((r) => r.visibility === "hidden").length;
            const decorate = rec => ({ ...rec, serviceStatus: (data.conflictIds || []).includes(rec.id) ? '待确认冲突' : '' });
            const needsAttention = rec => ['项目未归属', '待确认冲突', '已过期'].includes(serviceState(decorate(rec)));
            const activeView = attentionOnly ? 'attention' : pinnedOnly && visibilityFilter === 'all' ? 'pinned' : !pinnedOnly && visibilityFilter === 'hidden' ? 'hidden' : !pinnedOnly && visibilityFilter === 'all' ? 'all' : '';
            const chooseView = view => { setPinnedOnly(view === 'pinned'); setVisibilityFilter(view === 'hidden' ? 'hidden' : 'all'); setAttentionOnly(view === 'attention'); };
            const detailRecord = memories.find(rec => rec.id === detailId);
			const q = query.trim().toLowerCase();
			const allTags = [...new Set(memories.flatMap((r) => r.tags || []))].sort((a, b) => a.localeCompare(b, "zh"));
			const filtered = memories.filter((r) => {
                if (attentionOnly && !needsAttention(r)) return false;
                if (projectFilter === 'unassigned' && !(r.scope === 'project' && !r.projectId)) return false;
                if (!['all', 'unassigned'].includes(projectFilter) && r.projectId !== projectFilter) return false;
                const inferredConflict = (data.conflictIds || []).includes(r.id);
                if (statusFilter === 'active' && serviceState({ ...r, serviceStatus: inferredConflict ? '待确认冲突' : '' }) !== '当前有效') return false;
                if (statusFilter === 'conflict' && !inferredConflict && r.status !== 'conflict') return false;
                if (!['all', 'active', 'conflict'].includes(statusFilter) && (r.status || 'active') !== statusFilter) return false;
				if (pinnedOnly && !r.pinned) return false;
				if (visibilityFilter === "visible" && r.visibility === "hidden") return false;
				if (visibilityFilter === "hidden" && r.visibility !== "hidden") return false;
				if (kindFilter !== "all" && r.kind !== kindFilter) return false;
				if (scopeFilter !== "all" && (r.scope || "global") !== scopeFilter) return false;
				if (tagFilter && !(r.tags || []).includes(tagFilter)) return false;
				if (!q) return true;
				const hay = [r.id, r.projectId, (data.projects || []).find(p => p.id === r.projectId)?.name, r.conditions, renderLine(r, effectiveStrategy(r, strategy, rules)), r.category, r.subcategory, r.key, r.value, r.person, r.relationship, ...(r.tags || [])].filter(Boolean).join(" ").toLowerCase();
				return hay.includes(q);
			});
			const sorted = [...filtered].sort((a, b) => {
				if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
				if (sortBy === "importance") return (b.importance || 3) - (a.importance || 3) || (b.updatedAt || 0) - (a.updatedAt || 0);
				if (sortBy === "created") return (b.createdAt || 0) - (a.createdAt || 0);
				if (sortBy === "usage") return (b.useCount || 0) - (a.useCount || 0) || (b.updatedAt || 0) - (a.updatedAt || 0);
				return (b.updatedAt || 0) - (a.updatedAt || 0);
			});
			const regularSorted = sorted.filter((r) => !r.pinned);
			const groups = groupRecords(regularSorted, groupBy);
			const hasFilters = groupBy !== 'none' || attentionOnly || projectFilter !== 'all' || statusFilter !== 'all' || pinnedOnly || visibilityFilter !== "all" || Boolean(q) || kindFilter !== "all" || scopeFilter !== "all" || Boolean(tagFilter) || sortBy !== "updated";
			const clearFilters = () => { setQuery(""); setKindFilter("all"); setScopeFilter("all"); setTagFilter(""); setSortBy("updated"); setPinnedOnly(false); setVisibilityFilter("all"); setProjectFilter('all'); setStatusFilter('all'); setAttentionOnly(false); setGroupBy('none'); };
            const filterTokens = [
                kindFilter !== 'all' && ['类型：' + (KINDS.find(k => k.id === kindFilter)?.name || kindFilter), () => setKindFilter('all')],
                scopeFilter !== 'all' && ['范围：' + (scopeFilter === 'global' ? '全局' : '项目'), () => setScopeFilter('all')],
                projectFilter !== 'all' && ['项目：' + (projectFilter === 'unassigned' ? '待认领' : (data.projects || []).find(p => p.id === projectFilter)?.name || projectFilter), () => setProjectFilter('all')],
                statusFilter !== 'all' && ['状态：' + (STATUS_LABELS[statusFilter] || statusFilter), () => setStatusFilter('all')],
                tagFilter && ['标签：' + tagFilter, () => setTagFilter('')],
                visibilityFilter === 'visible' && ['未隐藏', () => setVisibilityFilter('all')],
                visibilityFilter === 'hidden' && activeView !== 'hidden' && ['已隐藏', () => setVisibilityFilter('all')],
                pinnedOnly && activeView !== 'pinned' && ['常驻', () => setPinnedOnly(false)],
                groupBy !== 'none' && ['分组：' + (groupBy === 'time' ? '时间' : '类型'), () => setGroupBy('none')],
            ].filter(Boolean);
            const activeFilterCount = filterTokens.length;
			const countEl = h("span", { key: "count", role: "status", "aria-live": "polite", "aria-atomic": true, style: { ...c.filterMeta, marginLeft: 0, flex: 1 } }, "显示 " + sorted.length + " / " + memories.length + " 条");
			const sortSelect = h("select", { key: "sort", "aria-label": "排序方式", style: c.filterSelect, value: sortBy, onChange: (e) => setSortBy(e.target.value) }, [
				["updated", "最近更新"], ["created", "最近创建"], ["importance", "重要性"], ["usage", "使用频率"],
			].map(([value, label]) => h("option", { key: value, value }, label)));
			const groupSelect = h("select", { key: "group", "aria-label": "分组方式", style: c.filterSelect, value: groupBy, onChange: (e) => setGroupBy(e.target.value) }, [
				["none", "不分组"], ["time", "按更新时间"], ["kind", "按类型"],
			].map(([value, label]) => h("option", { key: value, value }, label)));
			const tagSelect = h("select", { key: "tag", className: "dshmem-filter-select", "aria-label": "标签筛选", style: c.filterSelect, value: tagFilter, onChange: (e) => setTagFilter(e.target.value) }, [
				h("option", { key: "", value: "" }, "全部标签"),
				...allTags.map((tag) => h("option", { key: tag, value: tag }, "#" + tag)),
			]);
			const clearButton = hasFilters ? h("button", { key: "clear", type: "button", style: c.linkBtn, onClick: clearFilters }, "清除筛选") : null;
            const kindSelect = h('select', { 'aria-label': '类型筛选', style: c.input, value: kindFilter, onChange: e => setKindFilter(e.target.value) }, [h('option', { key: 'all', value: 'all' }, '全部类型'), ...KINDS.map(k => h('option', { key: k.id, value: k.id }, k.name))]);
            const scopeSelect = h('select', { 'aria-label': '范围筛选', style: c.input, value: scopeFilter, onChange: e => setScopeFilter(e.target.value) }, [['all', '全部范围'], ['global', '全局'], ['project', '项目']].map(([value, label]) => h('option', { key: value, value }, label)));
            const projectSelect = h('select', { 'aria-label': '项目筛选', style: c.input, value: projectFilter, onChange: e => setProjectFilter(e.target.value) }, [
                h('option', { key: 'all', value: 'all' }, '全部项目与全局'), h('option', { key: 'unassigned', value: 'unassigned' }, '待认领的项目记录'),
                ...[...new Set([...(data.projects || []).map(p => p.id), ...memories.map(r => r.projectId).filter(Boolean)])].map(id => h('option', { key: id, value: id }, (data.projects || []).find(p => p.id === id)?.name || id)),
            ]);
            const statusSelect = h('select', { 'aria-label': '状态筛选', style: c.input, value: statusFilter, onChange: e => setStatusFilter(e.target.value) }, [h('option', { key: 'all', value: 'all' }, '全部状态'), ...Object.entries(STATUS_LABELS).map(([value, label]) => h('option', { key: value, value }, label))]);
			const visibilityGroup = h("div", { key: "visibility", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "vl", style: c.filterLabel }, "可见性"),
				...[["all", "全部"], ["visible", "Agent 可见"], ["hidden", "已隐藏"]].map(([value, label]) => h("button", { key: "v" + value, type: "button", "aria-label": "可见性：" + label, "aria-pressed": visibilityFilter === value, style: c.filterChip(visibilityFilter === value), onClick: () => setVisibilityFilter(value) }, label)),
			]);

			const saveNew = async (form) => {
				const res = editing ? await rpc("update", { id: editing.id, patch: form }) : await rpc("add", { ...form, source: "user" });
				if (!res.ok) throw new Error(res.error || "保存失败");
                setNotice(editing ? "已更新" : "已添加"); setDirty(false); setEditing(null); setAdding(false); setTab("list"); await refresh();
			};
            const remove = async rec => {
                if (!confirm('删除这条记忆？\n\n' + renderLine(rec, effectiveStrategy(rec, strategy, rules)))) return null;
                try {
                    const result = await rpc('delete', { id: rec.id });
                    if (!result.ok) throw new Error(result.error || '删除失败');
                    await refresh(); setNotice('已删除记忆'); return true;
                } catch (err) { setNotice('删除失败：' + err.message); return false; }
            };

			const togglePin = async (rec) => {
				try {
					const result = await rpc("update", { id: rec.id, patch: { pinned: !rec.pinned } });
					if (!result.ok) throw new Error(result.error || "更新失败");
					await refresh(); return true;
				} catch (error) { setNotice("常驻更新失败：" + error.message); return false; }
			};
			const toggleVisibility = async (rec) => {
				try {
					const result = await rpc("update", { id: rec.id, patch: { visibility: rec.visibility === "hidden" ? "visible" : "hidden" } });
					if (!result.ok) throw new Error(result.error || "更新失败");
					await refresh();
					setNotice(rec.visibility === "hidden" ? "已恢复可见" : "已对 Agent 隐藏"); return true;
				} catch (error) { setNotice("可见性更新失败：" + error.message); return false; }
			};
            const editRecord = rec => { if (!leaveEdit()) return; setDetailId(null); setDirty(false); setEditing(rec); setAdding(true); setTab('list'); };
            const memoryRow = rec => h(MemoryRow, { key: rec.id, rec: decorate(rec), strategy, rules, projects: data.projects || [], onDetails: row => setDetailId(row.id) });
            const detailModal = detailRecord ? h(Modal, { key: 'record-details', title: '记忆详情', onClose: () => setDetailId(null) }, h(MemoryDetails, { key: detailRecord.id, rec: decorate(detailRecord), strategy, rules, records: memories, projects: data.projects || [], onEdit: editRecord, onPin: togglePin, onToggleVisibility: toggleVisibility, onDelete: async rec => { const removed = await remove(rec); if (removed === true) setDetailId(null); return removed; } })) : null;
            const tabs = [["list", "记忆"], ["profile", "画像"], ["agents", "全局规则"], ["settings", "设置"], ["help", "说明"]];
            const formModal = adding ? h(Modal, { key: "form-modal", title: editing ? "编辑记忆" : "新增记忆", onClose: closeEditor }, h(MemoryForm, { key: editing?.id || "new-" + draftId, embedded: true, strategy, rules, projects: data.projects || [], initial: editing, onDirty: setDirty, onSubmit: saveNew, onCancel: closeEditor })) : null;
            const reviewModal = reviewOpen ? h(Modal, { key: "review-modal", title: "审阅重复与矛盾", onClose: () => setReviewOpen(false) }, h(QualityPanel, { key: "quality", embedded: true, memories, refresh })) : null;

			return h("div", { className: "dshmem-root", style: c.page }, [h("style", { key: "css" }, css), h("div", { key: "content", className: "dshmem-content", style: c.content }, [
				h("div", { key: "h", style: c.head }, [
					h("h1", { key: "t", style: c.title }, "记忆"),
					h("span", { key: "s", className: "dshmem-sub", style: c.sub }, '让重要的事，在需要时被记起。'),
					h("span", { key: "sp", style: { flex: 1 } }),
					h("button", { key: "r", style: c.btn, onClick: refresh }, "刷新"),
				]),
				h("div", { key: "tabs", className: "dshmem-tabs", role: "tablist", "aria-label": "记忆管理", style: c.tabs }, tabs.map(([id, label]) => h("button", { key: id, id: "dshmem-tab-" + id, role: "tab", "aria-selected": tab === id, "aria-controls": "dshmem-panel-" + id, tabIndex: tab === id ? 0 : -1, onKeyDown: (e) => { const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]; if (!keys.includes(e.key)) return; e.preventDefault(); const i = tabs.findIndex((x) => x[0] === id); const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; if (changeTab(tabs[next][0])) document.getElementById("dshmem-tab-" + tabs[next][0])?.focus(); }, style: c.tab(tab === id), onClick: () => changeTab(id) }, label))),
				data.loadError ? h("div", { key: "load-error", role: "alert", style: c.msg("err") }, "记忆文件加载失败，已进入只读恢复态，原文件不会被覆盖。请修复文件后重启插件：" + data.loadError) : null,
				notice ? h("div", { key: "n", role: notice.includes('失败') ? 'alert' : 'status', style: c.msg(notice.includes('失败') ? 'err' : 'ok') }, notice) : null,

                h("section", { key: "panel", role: "tabpanel", id: "dshmem-panel-" + tab, "aria-labelledby": "dshmem-tab-" + tab }, [
				tab === "list" ? h("div", { key: "list" }, [
                    h('div', { key: 'tools', style: { ...c.filterRow, gap: 12, justifyContent: 'space-between', margin: '4px 0 22px' } }, [
                        h('p', { key: 'intro', style: { flex: '1 1 240px', margin: 0, fontSize: 13, lineHeight: 1.75, color: t.secondary } }, '记下偏好、项目背景与重要经历，需要时交给 Agent 参考。'),
                        h('button', { key: 'quality', type: 'button', style: c.quiet, title: '检查重复与冲突，不会自动修改记忆', 'aria-label': '审阅重复与矛盾', onClick: () => setReviewOpen(true), 'aria-haspopup': 'dialog' }, '整理记忆'),
                        h('button', { key: 'add', type: 'button', style: c.btnPrimary, onClick: () => { if (!leaveEdit()) return; setDirty(false); setEditing(null); setDraftId(i => i + 1); setAdding(true); } }, '+ 新增记忆'),
                    ]),
					h(PendingPanel, { key: "pending", pending: data.pending || [], refresh }),
                    h('div', { key: 'filters', className: 'dshmem-filter-bar' + (filtersOpen ? ' dshmem-filters-open' : ''), style: c.filterBar }, [
                        h('div', { key: 'search', className: 'dshmem-search-row' }, [
                            h('input', { key: 'q', type: 'search', 'aria-label': '搜索记忆', style: { ...c.input, width: 'auto', minHeight: 42, fontSize: 14 }, placeholder: '搜索内容、标签或项目…', value: query, onChange: e => setQuery(e.target.value) }),
                            h('button', { key: 'toggle', type: 'button', style: { ...c.btn, minHeight: 42, flexShrink: 0 }, 'aria-expanded': filtersOpen, 'aria-controls': 'dshmem-filter-panel', onClick: () => setFiltersOpen(!filtersOpen) }, '筛选' + (activeFilterCount ? ' · ' + activeFilterCount : '') + (filtersOpen ? ' −' : ' +')),
                        ]),
                        h('div', { key: 'views', style: { ...c.filterRow, justifyContent: 'space-between', gap: 12 } }, [
                            h('div', { key: 'quick', className: 'dshmem-view-tabs', role: 'group', 'aria-label': '快速查看' }, [['all', '全部', memories.length], ['pinned', '常驻', memories.filter(r => r.pinned).length], ['hidden', '已隐藏', hiddenCount], ['attention', '待整理', memories.filter(needsAttention).length]].map(([id, label, count]) => h('button', { key: id, type: 'button', 'aria-label': '快速查看：' + label, 'aria-pressed': activeView === id, onClick: () => chooseView(id) }, [label, h('span', { key: 'count', style: { fontWeight: 400, fontSize: 11, marginLeft: 5, color: t.secondary } }, count)]))),
                            sortSelect,
                        ]),
                        h('div', { key: 'panel', id: 'dshmem-filter-panel', className: 'dshmem-filter-panel', hidden: !filtersOpen, role: 'region', 'aria-label': '细化筛选' }, filtersOpen ? [
                            h('div', { key: 'head', style: { ...c.filterRow, justifyContent: 'space-between' } }, [h('strong', { key: 'title', style: { fontSize: 13 } }, '按需要细化查找'), clearButton]),
                            h('div', { key: 'fields', className: 'dshmem-filter-fields' }, [
                                h(Field, { key: 'kind', label: '记忆类型' }, kindSelect), h(Field, { key: 'scope', label: '适用范围' }, scopeSelect),
                                h(Field, { key: 'project', label: '指定项目（仅项目记录）' }, projectSelect), h(Field, { key: 'status', label: '事实状态' }, statusSelect),
                                h(Field, { key: 'tag', label: '标签' }, tagSelect), h(Field, { key: 'group', label: '列表分组' }, groupSelect),
                            ]),
                            visibilityGroup,
                            h('p', { key: 'hint', style: { fontSize: 12, lineHeight: 1.7, color: t.secondary, margin: '8px 0 0' } }, '筛选只改变本页列表。未隐藏的记录仍受项目、状态与有效期限制，不等于 Agent 一定会读取。'),
                        ] : null),
                        filterTokens.length ? h('div', { key: 'tokens', style: c.filterRow, 'aria-label': '已选筛选条件' }, filterTokens.map(([label, reset]) => h('button', { key: label, type: 'button', className: 'dshmem-active-filter', 'aria-label': '移除筛选：' + label, onClick: reset }, [label, h('span', { key: 'x', 'aria-hidden': true }, '×')]))) : null,
                    ]),
                    h('div', { key: 'result', style: { ...c.filterRow, marginBottom: 14 } }, [countEl, !filtersOpen ? clearButton : null]),
					sorted.length === 0 ? h("div", { key: "e", style: c.empty }, [
						h(MemoryIcon, { key: "icon" }),
						h("p", { key: "text" }, memories.length === 0 ? "把值得记住的偏好与经历留在这里。" : (visibilityFilter === "hidden" && hiddenCount === 0) ? "还没有已隐藏的记忆。隐藏后仍可在这里查看和恢复。" : "没有匹配的记忆，试试调整筛选条件。"),
						memories.length === 0
							? h("button", { key: "add", style: c.btnPrimary, onClick: () => { if (!leaveEdit()) return; setDirty(false); setEditing(null); setDraftId(i => i + 1); setAdding(true); } }, "新增记忆")
							: (visibilityFilter === "hidden" && hiddenCount === 0)
								? h("button", { key: "showall", style: c.btn, onClick: clearFilters }, "查看全部记忆")
								: (hasFilters ? h("button", { key: "clear2", style: c.btn, onClick: clearFilters }, "清除筛选") : null),
					]) : null,
					groupBy === "none"
						? sorted.map(memoryRow)
						: [...sorted.filter((r) => r.pinned).map(memoryRow), ...groups.map((group, gi) => h("section", { key: group.key, "aria-label": group.label }, [
							h("h2", { key: "h", style: { fontSize: 12, lineHeight: "18px", fontWeight: 600, color: t.secondary, margin: (gi === 0 ? "0" : "24px") + " 0 8px" } }, group.label + " · " + group.items.length),
							...group.items.map(memoryRow),
						]))],
				]) : null,

                tab === 'settings' ? h(SettingsHub, { key: 'settings', data, refresh, onDirty: setDirty, onSaved: settings => setData(prev => ({ ...prev, settings })) }) : null,

				tab === "profile" ? profilePanel : null,


				tab === "agents" ? h(AgentsPanel, { key: "agents", onDirty: setDirty }) : null,

				tab === "help" ? h(HelpPanel, { key: "help", dir: data.dir }) : null,
                ]),
			]), formModal, reviewModal, detailModal]);
		}

		function MemoryIcon() {
			return h("span", { style: { display: "inline-flex", width: 18, height: 18, alignItems: "center", justifyContent: "center" } },
				h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }, [
					h("path", { key: "a", d: "M9.5 3.5a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 12a3 3 0 0 0 2 5.2 3 3 0 0 0 3 3.3 3 3 0 0 0 3-3V6.5a3 3 0 0 0-3-3Z" }),
					h("path", { key: "b", d: "M14.5 3.5a3 3 0 0 1 3 3v.3A3 3 0 0 1 19.5 12a3 3 0 0 1-2 5.2 3 3 0 0 1-3 3.3 3 3 0 0 1-3-3" }),
				]));
		}

		const inject = ["slots"];

		function apply(ctx) {
			let disposers = [];
			let current = null;

			const disposeAll = () => {
				for (const dispose of disposers) { try { dispose(); } catch (e) { /* already disposed */ } }
				disposers = [];
			};

			const mount = (placement) => {
				const next = placement === "settings" || placement === "sidebar" ? placement : "both";
				if (next === current) return;
				current = next;
				disposeAll();
				if (next !== "settings") {
					disposers.push(ctx.slots.inject("main", () => ctx.slots.register({
						name: "main",
						key: "memory",
					}, MemoryPage)));
					disposers.push(ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
						name: "sidebar.panellist",
						id: "memory",
						order: 5,
						label: () => "记忆",
					}, MemoryIcon)));
				}
				if (next !== "sidebar") {
					disposers.push(ctx.slots.inject("settings.section", () => ctx.slots.register({
						name: "settings.section",
						id: "memory",
						order: 40,
						label: () => "记忆",
					}, MemorySettingsSection)));
				}
			};

			// Mount both entrances immediately so a slow state request cannot hide
			// the sidebar entry; the fetched setting reconciles the placement.
			mount("both");
			fetch("/api/memory/state", { credentials: "same-origin" })
				.then((r) => r.json())
				.then((j) => mount(j?.settings?.entryPlacement))
				.catch(() => { /* keep the optimistic placement */ });

			const onChange = (event) => mount(event?.detail?.placement);
			window.addEventListener("dsh-memory:placement", onChange);
			ctx.effect(() => () => {
				window.removeEventListener("dsh-memory:placement", onChange);
				disposeAll();
			}, "dsh-memory: entry placement");
		}

		exports.MemoryPage = MemoryPage;
		exports.MemoryIcon = MemoryIcon;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
