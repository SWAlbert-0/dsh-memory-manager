window.__ModuleLoader__.load({
	id: "dsh-memory",
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
            sub: { fontSize: 12, color: t.secondary, background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))", padding: "5px 10px", borderRadius: 999 },
            tabs: { display: "flex", width: "fit-content", maxWidth: "100%", gap: 4, margin: "24px 0", padding: 4, background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))", borderRadius: t.radius, boxSizing: "border-box" },
            tab: (active) => ({ ...button, padding: "7px 14px", borderColor: active ? t.border : "transparent", background: active ? t.surface : "transparent", color: active ? t.text : t.secondary, boxShadow: active ? t.shadow : "none", whiteSpace: "nowrap" }),
            card: { border: "1px solid " + t.border, borderRadius: t.radius, padding: 14, marginBottom: 12, background: t.surface },
            memCard: { border: "1px solid " + t.border, borderRadius: t.radius, padding: 16, marginBottom: 12, background: t.surface },
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
            input, area: { ...input, minHeight: 104, resize: "vertical" },
            label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: t.secondary, margin: "10px 0 12px" },
            grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
            grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
            msg: (kind) => ({ margin: "12px 0", fontSize: 12.5, color: kind === "err" ? t.error : "var(--dsw-alias-state-success-primary, #22c55e)" }),
            strategyCard: (active) => ({ ...button, width: "100%", textAlign: "left", borderColor: active ? t.brand : t.border, background: active ? "color-mix(in srgb, " + t.brand + " 6%, " + t.surface + ")" : t.surface, borderRadius: t.radius, padding: 16, position: "relative" }),
            empty: { textAlign: "center", color: t.secondary, fontSize: 13, padding: "48px 16px", border: "1px dashed " + t.border, borderRadius: t.radius },
            filterBar: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
            filterRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
            filterLabel: { fontSize: 11.5, color: t.muted },
            filterChip: (active) => ({ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (active ? t.brand : t.border), background: active ? "color-mix(in srgb, " + t.brand + " 10%, " + t.surface + ")" : t.surface, color: active ? t.text : t.secondary, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }),
            filterSelect: { ...input, width: "auto", minWidth: 116, padding: "6px 10px", fontSize: 12 },
            filterMeta: { fontSize: 12, lineHeight: "18px", color: t.secondary, marginLeft: "auto" },
            linkBtn: { padding: 0, border: "none", background: "transparent", color: t.secondary, fontSize: 12, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline" }
        };
        const toneStyle = {
            path: { fontSize: 12, color: t.secondary, fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)" },
            meta: { fontSize: 13, color: t.secondary },
            value: { fontSize: 14, color: t.text },
            backstory: { fontSize: 12, color: t.muted }
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
              .dshmem-text[data-collapsed="true"] { -webkit-line-clamp: 5; }
              .dshmem-grid { grid-template-columns: minmax(0,1fr) !important; }
              .dshmem-filter-group { flex-basis: 100%; }
              .dshmem-row { flex-wrap: wrap; }
              .dshmem-row > :first-child { flex-basis: 100% !important; }
              .dshmem-actions { gap: 8px !important; }
              .dshmem-actions .dshmem-quiet { min-width: 44px !important; min-height: 44px !important; }
              .dshmem-sub { order: 3; flex-basis: 100%; }
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

		// Pending suggestions are intentionally discarded on a browser reload.
		// A panel remount or the in-panel refresh button only reloads its data.
		let reloadReset = null;
		function resetPendingAfterReload() {
			if (!reloadReset) {
				const navigation = window.performance?.getEntriesByType?.("navigation")?.[0];
				reloadReset = navigation?.type === "reload"
					? rpc("reject", { all: true }).then((result) => { if (!result.ok) throw new Error(result.error || "待确认队列清空失败"); }).catch((error) => { reloadReset = null; throw error; })
					: Promise.resolve();
			}
			return reloadReset;
		}

		function useStore() {
			const [data, setData] = useState(null);
			const [error, setError] = useState("");
			const refresh = useCallback(async () => {
				try {
					await resetPendingAfterReload();
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

		function MemoryRow(props) {
			const { rec, strategy, rules, onEdit, onDelete, onPin } = props;
			const narrow = useNarrow();
			const [expanded, setExpanded] = useState(false);
			const [tagsOpen, setTagsOpen] = useState(false);
			const [overflowing, setOverflowing] = useState(false);
			const textRef = useRef(null);
			const textId = "dshmem-text-" + rec.id;
			const kindName = (KINDS.find((x) => x.id === rec.kind) || { name: rec.kind }).name;
			const tags = rec.tags || [];
			const tagLimit = narrow ? 2 : 3;
			const visibleTags = tagsOpen ? tags : tags.slice(0, tagLimit);
			const hiddenTags = tags.length - visibleTags.length;
			const fullTime = fmtTime(rec.updatedAt);
			const effectiveStrategy = resolveStrategy(rec, strategy, rules);
			const parts = renderParts(rec, effectiveStrategy);

			useEffect(() => {
				if (expanded) return;
				const el = textRef.current;
				if (!el) return;
				const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
				measure();
				let observer;
				if (typeof ResizeObserver !== "undefined") {
					observer = new ResizeObserver(measure);
					observer.observe(el);
				}
				return () => { if (observer) observer.disconnect(); };
			}, [expanded, effectiveStrategy, narrow, rec]);

			return h("article", { className: "dshmem-card" + (rec.pinned ? " dshmem-pinned" : ""), style: c.memCard }, [
				h("div", { key: "r", className: "dshmem-row", style: c.row }, [
					h("div", { key: "g", style: c.grow }, [
						h("div", { key: "t", id: textId, ref: textRef, className: "dshmem-text", "data-collapsed": expanded ? "false" : "true", style: { fontSize: 14, lineHeight: "22px", whiteSpace: "pre-wrap", wordBreak: "break-word" } }, parts.map((part, i) => h("span", { key: i, style: toneStyle[part.tone] || toneStyle.value }, part.text))),
						overflowing ? h("button", {
							key: "x", type: "button", className: "dshmem-quiet",
							"aria-expanded": expanded, "aria-controls": textId,
							style: { ...c.quiet, padding: "2px 6px", minHeight: 24, marginTop: 4, fontSize: 12 },
							onClick: () => setExpanded(!expanded),
						}, expanded ? "收起" : "展开全文") : null,
						h("div", { key: "m", className: "dshmem-meta", style: c.meta }, [
							h("button", { key: "pin", type: "button", style: { ...c.quiet, position: "relative", padding: "2px 6px", minHeight: 24 }, "aria-label": rec.pinned ? "取消常驻" : "设为常驻", "aria-pressed": rec.pinned === true, onClick: () => onPin(rec) }, rec.pinned ? "📌 常驻" : "常驻"),
							rec.strategy ? h("span", { key: "strategy", style: c.chip }, STRATEGIES.find((s) => s.id === rec.strategy)?.name || rec.strategy) : null,
							h("span", { key: "dot", "aria-hidden": true, style: { width: 6, height: 6, borderRadius: "50%", flex: "0 0 auto", background: rec.kind === "episodic" ? "var(--dsw-static-amber-500, #f59e0b)" : rec.kind === "procedural" ? "var(--dsw-alias-state-success-primary, #22c55e)" : "var(--dsw-static-deepseek-500, #4176e6)" } }),
							h("span", { key: "k", style: { fontSize: 12, lineHeight: "18px", color: t.secondary } }, kindName),
							h("span", { key: "s", style: { fontSize: 12, lineHeight: "18px", color: t.secondary } }, rec.scope === "project" ? "项目" : "全局"),
							...visibleTags.map((tag, i) => h("span", { key: "tag" + i, className: "dshmem-tag", style: c.chip }, "#" + tag)),
							hiddenTags > 0 ? h("button", {
								key: "more", type: "button", style: c.tagMore,
								"aria-label": "展开其余 " + hiddenTags + " 个标签",
								onClick: () => setTagsOpen(true),
							}, "+" + hiddenTags) : null,
							tagsOpen && tags.length > tagLimit ? h("button", {
								key: "less", type: "button", style: c.tagMore,
								onClick: () => setTagsOpen(false),
							}, "收起") : null,
							h("time", {
								key: "time",
								dateTime: rec.updatedAt ? new Date(rec.updatedAt).toISOString() : undefined,
								title: fullTime,
								style: { fontSize: 12, lineHeight: "18px", color: t.secondary },
							}, relativeTime(rec.updatedAt)),
						]),
					]),
					h("div", { key: "a", className: "dshmem-actions", style: { display: "flex", gap: 8, flexShrink: 0 } }, [
						h("button", { key: "e", type: "button", className: "dshmem-quiet", "aria-label": "编辑记忆", "aria-describedby": textId, style: c.quiet, onClick: () => onEdit(rec) }, "编辑"),
						h("button", { key: "d", type: "button", className: "dshmem-quiet dshmem-danger", "aria-label": "删除记忆", "aria-describedby": textId, style: c.quiet, onClick: () => onDelete(rec) }, "删除"),
					]),
				]),
			]);
		}

		function MemoryForm(props) {
			const { strategy, initial, onSubmit, onCancel } = props;
			const [form, setForm] = useState(() => ({
				text: initial?.text || "",
				pinned: initial?.pinned === true,
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
			}));
			const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
			const activeStrategy = form.strategy || strategy;
			const structured = activeStrategy === "json" || activeStrategy === "advanced";
			const advanced = activeStrategy === "advanced";
			return h("div", { style: c.card }, [
				h("label", { key: "pinned", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
					h("input", { key: "i", type: "checkbox", checked: form.pinned, onChange: (e) => setForm({ ...form, pinned: e.target.checked }) }), "常驻（每轮优先注入）",
				]),
				h(Field, { key: "strategy", label: "本记录格式" }, h("select", { style: c.input, value: form.strategy, onChange: set("strategy") }, [
					h("option", { key: "", value: "" }, "跟随全局（" + (STRATEGIES.find((s) => s.id === strategy)?.name || strategy) + "）"),
					...STRATEGIES.map((s) => h("option", { key: s.id, value: s.id }, s.name)),
				])),
				h(Field, { key: "t", label: "内容（一句话或一段话）" }, h("textarea", { style: c.area, value: form.text, onChange: set("text"), placeholder: "例如：用户偏好靠窗座位，且是素食者。" })),
				h("div", { key: "k", className: "dshmem-grid", style: c.grid3 }, [
					h(Field, { key: "kind", label: "类型" }, h("select", { style: c.input, value: form.kind, onChange: set("kind") }, KINDS.map((k) => h("option", { key: k.id, value: k.id }, k.name)))),
					h(Field, { key: "scope", label: "范围" }, h("select", { style: c.input, value: form.scope, onChange: set("scope") }, [h("option", { key: "g", value: "global" }, "全局"), h("option", { key: "p", value: "project" }, "项目")])),
					h(Field, { key: "imp", label: "重要性 1-5" }, h("input", { style: c.input, type: "number", min: 1, max: 5, value: form.importance, onChange: set("importance") })),
				]),
				h(Field, { key: "tags", label: "标签（逗号分隔）" }, h("input", { style: c.input, value: form.tags, onChange: set("tags"), placeholder: "旅行, 饮食" })),
				structured ? h("div", { key: "s", className: "dshmem-grid", style: c.grid3 }, [
					h(Field, { key: "cat", label: "类别" }, h("input", { style: c.input, value: form.category, onChange: set("category"), placeholder: "work" })),
					h(Field, { key: "sub", label: "子类别" }, h("input", { style: c.input, value: form.subcategory, onChange: set("subcategory"), placeholder: "position" })),
					h(Field, { key: "key", label: "字段" }, h("input", { style: c.input, value: form.key, onChange: set("key"), placeholder: "title" })),
				]) : null,
				structured ? h(Field, { key: "val", label: "字段值" }, h("input", { style: c.input, value: form.value, onChange: set("value"), placeholder: "高级工程师" })) : null,
				advanced ? h("div", { key: "adv", className: "dshmem-grid", style: c.grid3 }, [
					h(Field, { key: "who", label: "主体（person）" }, h("input", { style: c.input, value: form.person, onChange: set("person"), placeholder: "张医生" })),
					h(Field, { key: "rel", label: "关系（relationship）" }, h("input", { style: c.input, value: form.relationship, onChange: set("relationship"), placeholder: "用户的牙科医生" })),
					h(Field, { key: "back", label: "背景（backstory）" }, h("input", { style: c.input, value: form.backstory, onChange: set("backstory"), placeholder: "2026-10 就诊时提到" })),
				]) : null,
				h("div", { key: "a", style: { display: "flex", gap: 8, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, onClick: () => onSubmit({ ...form, tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean), importance: Number(form.importance) }) }, initial ? "保存修改" : "添加记忆"),
					onCancel ? h("button", { key: "c", style: c.btn, onClick: onCancel }, "取消") : null,
				]),
			]);
		}

		function SettingsPanel(props) {
			const { data, onSaved, onGenerate, generating } = props;
			const withDefaults = (settings) => ({ injectMode: "summary", pinnedBudget: 2000, autoCaptureInterval: 3, ...settings, strategyRules: settings.strategyRules || [], entryPlacement: settings.entryPlacement || "both" });
			const [form, setForm] = useState(() => withDefaults(data.settings));
			const [msg, setMsg] = useState("");
			useEffect(() => { setForm(withDefaults(data.settings)); }, [data.settings]);
			const pinnedChars = (data.memories || []).filter((r) => r.pinned).map((r) => "- " + renderLine(r, resolveStrategy(r, form.strategy, form.strategyRules))).join("\n").length;
			const save = async () => {
				if (form.strategyRules.some((rule) => !rule.value.trim())) {
					setMsg("保存失败：请填写每条规则的条件值");
					return;
				}
				let res;
				try { res = await rpc("settings", form); }
				catch (error) { setMsg("保存失败：" + error.message); return; }
				if (res.ok) {
					setMsg("已保存");
					onSaved(res.settings);
					const placement = res.settings.entryPlacement;
					setTimeout(() => window.dispatchEvent(new CustomEvent("dsh-memory:placement", { detail: { placement } })), 700);
				} else setMsg("保存失败：" + (res.error === "invalid-rules" ? "混合策略规则无效，请检查条件字段、条件值和目标策略" : res.error || "未知错误"));
			};
			return h("div", null, [
				h("div", { key: "st", style: { fontSize: 14, fontWeight: 600, marginBottom: 10 } }, "全局默认策略"),
                h("div", { key: "strategies", className: "dshmem-grid", role: "radiogroup", "aria-label": "记忆策略", style: c.grid2 }, STRATEGIES.map((s, i) => h("label", { key: s.id, style: c.strategyCard(form.strategy === s.id) }, [
                    h("span", { key: "n", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 } }, [
                        h("input", { key: "r", type: "radio", name: "dshmem-strategy", value: s.id, checked: form.strategy === s.id, onChange: () => setForm({ ...form, strategy: s.id }) }), s.name,
                        form.strategy === s.id ? h(Check, { key: "check" }) : null
                    ]),
                    h("span", { key: "d", style: { display: "block", color: t.secondary, marginTop: 8, lineHeight: 1.6, fontSize: 12 } }, s.desc),
                    h("span", { key: "fit", style: { display: "block", color: t.muted, marginTop: 12, fontSize: 11 } }, ["适合简短事实与个人偏好", "适合经历、背景与完整叙述", "适合分类资料与精确更新", "适合人物关系与同名区分"][i])
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
				h("div", { key: "inj", style: { ...c.card, marginTop: 16 } }, [
					h(Field, { key: "mode", label: "注入模式" }, h("select", { "aria-label": "注入模式", style: c.filterSelect, value: form.injectMode, onChange: (e) => setForm({ ...form, injectMode: e.target.value }) }, [["summary", "摘要模式"], ["details", "明细模式"], ["hybrid", "混合模式"]].map(([value, label]) => h("option", { key: value, value }, label)))),
					h("button", { key: "generate", style: { ...c.btn, marginBottom: 12 }, disabled: generating || data.llmAvailable === false, onClick: onGenerate }, generating ? "生成中…" : "重新生成摘要"),
					data.llmAvailable === false ? h("p", { key: "profile-unavailable", style: { fontSize: 12, color: t.secondary } }, "LLM 服务不可用，无法生成摘要") : null,
					h("label", { key: "l", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.inject !== false, onChange: (e) => setForm({ ...form, inject: e.target.checked }) }),
						"每轮自动注入相关记忆",
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
					h("p", { key: "budget", role: "status", style: { fontSize: 12, color: t.secondary } }, "常驻记忆：" + pinnedChars + " / " + form.pinnedBudget + " 字符（" + Math.round(pinnedChars / Math.max(1, form.pinnedBudget) * 100) + "%）；超出预算将截断。"),
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
					h("div", { key: "hint", style: { fontSize: 11.5, color: t.muted, marginTop: 8, lineHeight: 1.6 } }, "切换后入口立即调整；若当前页面消失，从新入口重新打开即可。"),
				]),
				h("div", { key: "dir", style: { fontSize: 12, color: t.muted, overflowWrap: "anywhere", marginTop: 16 } }, "存储目录：" + (data.dir || "")),
				h("div", { key: "a", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, onClick: save }, "保存设置"),
					msg ? h("span", { key: "m", role: "status", style: c.msg(msg === "已保存" ? "ok" : "err") }, msg) : null,
				]),
			]);
		}

		function IoPanel(props) {
			const { refresh } = props;
			const [text, setText] = useState("");
			const [mode, setMode] = useState("merge");
			const [msg, setMsg] = useState("");
			const doExport = async () => {
				const res = await rpc("export");
				const json = JSON.stringify(res.data, null, 2);
				setText(json);
				try {
					const blob = new Blob([json], { type: "application/json" });
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "dsh-memory-export.json";
					a.click();
					setTimeout(() => URL.revokeObjectURL(a.href), 2000);
					setMsg("已导出并开始下载");
				} catch (e) { setMsg("已生成 JSON，可手动复制"); }
			};
			const doImport = async () => {
				let data;
				try { data = JSON.parse(text); } catch (e) { setMsg("JSON 解析失败：" + e.message); return; }
				const res = await rpc("import", { data, mode });
				if (res.ok) { setMsg("导入完成，共 " + res.count + " 条"); await refresh(); } else setMsg("导入失败：" + (res.error || ""));
			};
			return h("div", null, [
				h("div", { key: "e", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导出"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "导出全部记忆与设置为 JSON，便于备份或迁移到另一台机器。"),
					h("button", { key: "b", style: c.btnPrimary, onClick: doExport }, "导出 JSON"),
				]),
				h("div", { key: "i", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导入"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "粘贴导出的 JSON。合并会按 id 更新同一条；替换会清空现有记忆。"),
					h("textarea", { key: "a", "aria-label": "导入或导出的 JSON", spellCheck: false, style: { ...c.area, minHeight: 160, fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)", fontSize: 11.5 }, value: text, onChange: (e) => setText(e.target.value), placeholder: "{\n  \"version\": 1,\n  \"settings\": { ... },\n  \"memories\": [ ... ]\n}" }),
					h("div", { key: "r", style: { display: "flex", gap: 10, alignItems: "center", marginTop: 10 } }, [
                        h("div", { key: "m", role: "group", "aria-label": "导入方式", style: { ...c.tabs, margin: 0 } }, ["merge", "replace"].map((m) => h("button", { key: m, "aria-pressed": mode === m, style: c.tab(mode === m), onClick: () => setMode(m) }, m === "merge" ? "合并" : "替换"))),
						h("button", { key: "b", style: c.btnPrimary, onClick: doImport }, "导入"),
					]),
				]),
				h("div", { key: "c", style: { ...c.card, borderColor: "color-mix(in srgb, " + t.error + " 35%, transparent)", background: "color-mix(in srgb, " + t.error + " 3%, " + t.surface + ")" } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "危险操作"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "清空全部记忆，不可撤销（建议先导出备份）。"),
					h("button", { key: "b", style: c.btnDanger, onClick: async () => {
						if (!confirm("确定清空全部记忆？建议先导出备份。")) return;
						await rpc("clear", {});
						await refresh();
						setMsg("已清空");
					} }, "清空全部记忆"),
				]),
				msg ? h("div", { key: "m", role: "status", style: c.msg("ok") }, msg) : null,
			]);
		}

		function Code(props) {
			return h("code", {
				style: {
					fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)",
					fontSize: 11.5,
					padding: "1px 5px",
					borderRadius: "var(--dsw-radius-xs, 4px)",
					background: "var(--dsw-alias-bg-skeleton, rgba(0,0,0,.04))",
					border: "1px solid " + t.border,
					whiteSpace: "nowrap",
				},
			}, props.children);
		}

		function HelpSection(props) {
			return h("section", {
				style: { ...c.card, padding: "18px 20px", marginBottom: 14 },
			}, [
				h("h2", { key: "h", style: { fontSize: 15, fontWeight: 600, margin: "0 0 10px" } }, props.title),
				props.children,
			]);
		}

		function HelpStep(props) {
			return h("div", {
				style: { display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 0" },
			}, [
				h("span", {
					key: "n",
					"aria-hidden": true,
					style: {
						flex: "0 0 auto", width: 24, height: 24, borderRadius: "50%",
						display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600,
						background: "color-mix(in srgb, " + t.brand + " 10%, transparent)",
						color: t.text,
					},
				}, String(props.index)),
				h("div", { key: "b", style: { flex: 1, minWidth: 0 } }, [
					h("div", { key: "t", style: { fontSize: 13, fontWeight: 600, marginBottom: 3 } }, props.title),
					h("div", { key: "d", style: { fontSize: 12.5, color: t.secondary, lineHeight: 1.65 } }, props.children),
				]),
			]);
		}

		function Term(props) {
			return h("div", {
				style: { padding: "11px 0", borderTop: props.first ? "none" : "1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.04))" },
			}, [
				h("div", { key: "t", style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, props.term),
				h("div", { key: "d", style: { fontSize: 12.5, color: t.secondary, lineHeight: 1.7 } }, props.children),
			]);
		}

		function Callout(props) {
			const danger = props.tone === "danger";
			const color = danger ? t.error : t.brand;
			return h("div", {
				style: {
					border: "1px solid color-mix(in srgb, " + color + " 30%, transparent)",
					background: "color-mix(in srgb, " + color + " 5%, " + t.surface + ")",
					borderRadius: t.small,
					padding: "12px 14px",
					marginTop: 12,
					fontSize: 12.5,
					lineHeight: 1.7,
					color: t.text,
				},
			}, [props.title ? h("div", { key: "t", style: { fontWeight: 600, marginBottom: 4 } }, props.title) : null, h("div", { key: "b", style: { color: t.secondary } }, props.children)]);
		}

		function HelpPanel(props) {
			const steps = [
				["让 Agent 自己记", "在对话里直接说「记住：我偏好靠窗座位，而且吃素」。模型会调用 ", "memory_write", " 把事实写进长期记忆；你也可以只说一次偏好，由模型自行判断是否值得记。"],
				["手动添加", "切到「新增」，填写内容；按需选择类型、范围、标签与重要性。JSON / Advanced 策略还会显示类别、字段与背景等结构化字段。", null, ""],
				["使用记忆", "开启「每轮自动注入」后，每轮对话会把高价值记忆作为一段上下文注入请求；模型也可以主动调用 ", "memory_search", " 检索。记忆是数据，不是指令。"],
				["维护与备份", "在「记忆」里用关键词搜索，按类型 / 范围 / 标签筛选并排序，编辑或删除；在「导入导出」导出整库 JSON 做备份，或在新机器上导入。", null, ""],
			];
			const strategies = [
				["Simple Notes", "每条记忆是一个最小事实，例如「用户是素食者」。开销最低、读写最快；适合偏好、邮箱、账号等短事实，但会丢失事实之间的关联。"],
				["Enhanced Notes", "每条记忆是一段保留上下文的叙述，语义完整；适合经历、背景与来龙去脉，代价是存储冗余、更新成本较高。"],
				["JSON Cards", "按「类别 → 子类别 → 键值」组织，例如 work.position.title。支持部分更新、结构可预测；适合结构化资料，但结构较刚性。"],
				["Advanced JSON Cards", "在 JSON Cards 之上增加 backstory（来源背景）、person（主体）、relationship（与用户的关系）。适合人物关系与同名实体消歧，生成与维护成本最高。"],
			];
			const kinds = [
				["语义（semantic）", "从多次交互中抽象出的稳定事实，例如「用户是素食者」「用户在 TechCorp 工作」。"],
				["情景（episodic）", "某个具体事件，带时间与对象，例如「2026-10 陪父亲看了牙医」。"],
				["程序（procedural）", "做事的流程或习惯，例如「订机票时先搜直飞、再确认座位偏好」。"],
			];
			const terms = [
				["长期记忆 vs 会话轨迹", "会话轨迹（trajectory）是本次会话的完整事件记录，只增不改；长期记忆是跨会话提炼出的稳定事实，会被更新、合并、淘汰。这个面板管理的是后者。"],
				["记忆策略", "决定记忆「怎么存、怎么渲染」。切换策略不会丢数据，底层是同一份记录，只是字段侧重与展示方式不同。"],
				["记忆类型", "决定记忆「存什么」：语义 / 情景 / 程序，三者可以自由组合任何策略。"],
				["范围（全局 / 项目）", "全局记忆跨项目可见；项目记忆只属于当前工作区。用于隔离不同项目的上下文。"],
				["重要性（1–5）", "参与自动注入的排序：重要性越高越容易被选中。默认 3。"],
				["标签", "自由关键词，用于检索与筛选，例如 #旅行、#求职。"],
				["自动注入", "每轮把若干条记忆作为一条临时 user 消息（<memory-context>）加入请求，不写入会话日志、不污染历史。可在「策略与设置」关闭，或调整条数与字符上限。"],
				["常驻记忆（pinned）", "每轮优先注入 <memory-rules>，不受普通记忆条数限制，有独立字符预算；可在卡片或编辑表单切换。"],
				["自动沉淀（autoCapture）", "按设置的轮数间隔额外调用 LLM，从本轮用户消息与助手回复提取最多 3 条事实，进入待确认队列；确认后才写入记忆库。LLM 服务不可用时自动禁用。"],
				["规则文件", "在「规则文件」读写固定的 ~/.dsh/AGENTS.md。保存前确认并自动备份，文件每次会话由 DSH 注入给 Agent。"],
				["模型工具", "memory_write（写）、memory_search（搜）、memory_list（列）、memory_forget（删），以及 memory_read_agents_md / memory_write_agents_md（读写常驻规则文件，写入前需用户确认）。"],
				["检索方式", "当前是 BM25 风格的词法匹配（中文按相邻两字切分），不是向量语义检索；因此关键词越具体，命中越准。"],
				["导入 / 导出", "导出是整库 JSON（设置 + 记忆）。导入分「合并」（按 id 更新同一条，其余保留）和「替换」（清空后导入）。"],
				["存储位置", "记忆保存在本地明文 JSON 文件，路径见「策略与设置」。可用环境变量 DSH_MEMORY_DIR 改到别处。"],
			];
			return h("div", null, [
				h(HelpSection, { key: "intro", title: "这个面板做什么" }, [
					h("div", { key: "p", style: { fontSize: 13, color: t.secondary, lineHeight: 1.75 } }, [
						"把 Agent 在对话中了解到的用户偏好、环境、决策与关系，沉淀成跨会话可复用的长期记忆。",
						h("br", { key: "br" }),
						"你可以手动添加、让模型通过工具记录，或开启自动沉淀并确认提取结果；每轮对话再按需注入给模型。",
					]),
				]),
				h(HelpSection, { key: "quick", title: "快速上手" }, [
					...steps.map((s, i) => h(HelpStep, { key: "s" + i, index: i + 1, title: s[0] },
						s[2] ? [s[1], h(Code, { key: "c" }, s[2]), s[3]] : s[1],
					)),
				]),
				h(HelpSection, { key: "strategy", title: "四种记忆策略" }, [
					...strategies.map((s, i) => h(Term, { key: "st" + i, term: s[0], first: i === 0 }, s[1])),
					h(Term, { key: "hybrid", term: "混合策略" }, "在全局默认策略上增加规则和每条记录覆盖两级：先使用记录自己的格式；未指定时，按顺序匹配类型、范围、类别前缀或标签规则，取第一条命中的目标策略；均未命中则使用全局默认。选择「跟随全局」会清除自身覆盖，仍可命中规则；底层字段保持不变，无需迁移数据。"),
					h(Callout, { key: "tip", tone: "info", title: "怎么选" },
						"关键且少量（偏好、关键人物关系）用 Advanced JSON Cards 保证可检索性；大量非关键的对话事实用 Simple Notes 降低成本；多数情况下 Enhanced Notes 是稳妥的默认值。"),
				]),
				h(HelpSection, { key: "kind", title: "记忆类型" }, [
					...kinds.map((s, i) => h(Term, { key: "k" + i, term: s[0], first: i === 0 }, s[1])),
				]),
				h(HelpSection, { key: "terms", title: "其他技术名词" }, [
					...terms.map((s, i) => h(Term, { key: "t" + i, term: s[0], first: i === 0 }, s[1])),
				]),
				h(HelpSection, { key: "notes", title: "使用建议与注意" }, [
					h("ul", { key: "ul", style: { margin: 0, paddingLeft: 18, fontSize: 12.5, color: t.secondary, lineHeight: 1.9 } }, [
						h("li", { key: "1" }, "只记跨会话仍然成立的事实；一次性任务、临时状态不必记。"),
						h("li", { key: "2" }, "不要记录密码、token、密钥、身份证号等敏感信息；记忆文件是明文 JSON。"),
						h("li", { key: "3" }, "注入会占用上下文 token；记忆多时调小「最多注入条数」或「字符上限」，或只保留高重要性条目。"),
						h("li", { key: "4" }, "记忆是数据，不是指令；与用户当前明确要求冲突时，以当前要求为准。"),
						h("li", { key: "5" }, "策略切换不丢数据；导入「替换」会清空现有记忆，操作前先导出备份。"),
					]),
					h(Callout, { key: "dir", tone: "info", title: "当前存储位置" }, props.dir || "（未获取到路径）"),
				]),
			]);
		}

		function AgentsPanel() {
			const [file, setFile] = useState(null);
			const [content, setContent] = useState("");
			const [msg, setMsg] = useState("");
			const [busy, setBusy] = useState(false);
			const load = async () => {
				setBusy(true);
				try {
					const response = await fetch("/api/memory/agents-md", { credentials: "same-origin" });
					const result = await response.json();
					if (!response.ok || !result.ok) throw new Error(result.error || "读取失败");
					setFile(result); setContent(result.content); setMsg("");
				} catch (error) { setMsg("读取失败：" + error.message); }
				finally { setBusy(false); }
			};
			useEffect(() => { load(); }, []);
			const save = async () => {
				if (!confirm("保存规则文件 ~/.dsh/AGENTS.md？\n每次会话都会自动注入这些规则；写入前会自动备份。")) return;
				setBusy(true);
				try {
					const response = await fetch("/api/memory/agents-md", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
					const result = await response.json();
					if (!response.ok || !result.ok) throw new Error(result.error || "写入失败");
					setFile({ ...file, exists: true }); setMsg("已保存，原内容已备份");
				} catch (error) { setMsg("保存失败：" + error.message); }
				finally { setBusy(false); }
			};
			return h("div", { style: c.card }, [
				h("p", { key: "intro", style: { fontSize: 13, lineHeight: 1.7, color: t.secondary } }, "这个文件每次会话自动注入给 Agent，适合放编码规范、沟通偏好等常驻规则。"),
				h("p", { key: "path", style: { fontSize: 12, color: t.secondary, overflowWrap: "anywhere" } }, file?.path || "~/.dsh/AGENTS.md"),
				file && !file.exists ? h("p", { key: "missing", style: { fontSize: 12, color: t.secondary } }, "文件不存在，保存将创建") : null,
				h("textarea", { key: "content", "aria-label": "规则文件内容", disabled: !file || busy, style: { ...c.area, minHeight: 300, fontFamily: "ui-monospace, monospace" }, value: content, onChange: (e) => setContent(e.target.value) }),
				h("button", { key: "save", type: "button", disabled: !file || busy, style: { ...c.btnPrimary, marginTop: 12 }, onClick: save }, busy ? "处理中…" : "保存"),
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

		function ProfilePanel({ profile = {}, memories = [], llmAvailable, generating, onGenerate }) {
			const count = memories.filter((r) => (r.status || "active") === "active").length;
			return h("section", { style: { ...c.card, marginTop: 16 }, "aria-label": "用户画像", "aria-busy": generating }, [
				h("h2", { key: "title", style: { fontSize: 16, marginTop: 0 } }, "用户画像"),
				h("p", { key: "status", role: "status", style: { fontSize: 12, color: t.secondary } }, "基于 " + count + " 条记忆 · " + (profile.generatedAt ? "生成于 " + relativeTime(profile.generatedAt) : "尚未生成")),
				profile.stale ? h("p", { key: "stale", role: "status", style: { fontSize: 13, color: t.secondary } }, "数据已变更，摘要待更新") : null,
				profile.content ? h("div", { key: "content", style: { lineHeight: 1.7, overflowWrap: "anywhere" } }, profile.content.split("\n").map((line, i) => {
					if (/^##\s*/.test(line)) return h("h3", { key: i, style: { fontSize: 14, fontWeight: 600 } }, line.replace(/^##\s*/, ""));
					if (/^-\s/.test(line)) return h("ul", { key: i, style: { margin: "4px 0", paddingLeft: 22 } }, h("li", null, line.replace(/^-\s/, "")));
					return line.trim() ? h("p", { key: i, style: { fontSize: 13, whiteSpace: "pre-wrap" } }, line) : null;
				})) : h("p", { key: "empty", style: c.empty }, "暂无摘要，点击生成"),
				llmAvailable === false ? h("p", { key: "unavailable", style: { fontSize: 12, color: t.secondary } }, "LLM 服务不可用，无法生成摘要") : null,
				h("button", { key: "generate", style: c.btnPrimary, disabled: generating || llmAvailable === false, onClick: onGenerate }, generating ? "生成中…" : profile.content ? "重新生成" : "生成摘要"),
			]);
		}

		function SimpleMemoryForm({ onSubmit, onCancel }) {
			const [text, setText] = useState("");
			const [tags, setTags] = useState("");
			const [saving, setSaving] = useState(false);
			const [error, setError] = useState("");
			const submit = async () => {
				if (!text.trim() || saving) return;
				setSaving(true); setError("");
				try { await onSubmit({ text: text.trim(), tags: tags.split(/[,，]/).map((x) => x.trim()).filter(Boolean) }); }
				catch (e) { setError("添加失败：" + e.message); }
				finally { setSaving(false); }
			};
			return h("div", { style: c.card }, [
				h(Field, { key: "text", label: "记忆内容" }, h("textarea", { style: c.area, value: text, onChange: (e) => setText(e.target.value) })),
				h(Field, { key: "tags", label: "标签（逗号分隔）" }, h("input", { style: c.input, value: tags, onChange: (e) => setTags(e.target.value) })),
				h("button", { key: "add", style: c.btnPrimary, disabled: saving || !text.trim(), onClick: submit }, saving ? "添加中…" : "添加记忆"),
				h("button", { key: "cancel", style: { ...c.btn, marginLeft: 8 }, disabled: saving, onClick: onCancel }, "取消"),
				error ? h("p", { key: "error", role: "alert", style: c.msg("err") }, error) : null,
			]);
		}

		function MemoryPage() {
			const { data, setData, error, refresh } = useStore();
			const [tab, setTab] = useState("list");
			const [simpleMode, setSimpleMode] = useState(false);
			const [simpleAdding, setSimpleAdding] = useState(false);
			const [generating, setGenerating] = useState(false);
			const [profileError, setProfileError] = useState("");
			const generationLock = useRef(false);
			const [query, setQuery] = useState("");
			const [editing, setEditing] = useState(null);
			const [notice, setNotice] = useState("");
			const [kindFilter, setKindFilter] = useState("all");
			const [scopeFilter, setScopeFilter] = useState("all");
			const [pinnedOnly, setPinnedOnly] = useState(false);
			const [tagFilter, setTagFilter] = useState("");
			const [sortBy, setSortBy] = useState("updated");
			const narrow = useNarrow();
			const [filtersOpen, setFiltersOpen] = useState(false);
			const [groupBy, setGroupBy] = useState("none");

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
			const generate = async () => {
				if (generationLock.current) return;
				generationLock.current = true;
				setGenerating(true); setProfileError("");
				try {
					const response = await fetch("/api/memory/profile", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" });
					const result = await response.json();
					if (!response.ok || !result.ok) throw new Error(result.error || "HTTP " + response.status);
					await refresh();
				} catch (e) { setProfileError("摘要生成失败：" + (e.message === "llm-unavailable" ? "LLM 服务不可用" : e.message)); }
				finally { generationLock.current = false; setGenerating(false); }
			};
			const profilePanel = h(ProfilePanel, { key: "profile", profile: data.profile, memories: data.memories, llmAvailable: data.llmAvailable, generating, onGenerate: generate });
			const rules = data.settings.strategyRules || [];
			const memories = data.memories || [];
			const q = query.trim().toLowerCase();
			const allTags = [...new Set(memories.flatMap((r) => r.tags || []))].sort((a, b) => a.localeCompare(b, "zh"));
			const filtered = memories.filter((r) => {
				if (pinnedOnly && !r.pinned) return false;
				if (kindFilter !== "all" && r.kind !== kindFilter) return false;
				if (scopeFilter !== "all" && (r.scope || "global") !== scopeFilter) return false;
				if (tagFilter && !(r.tags || []).includes(tagFilter)) return false;
				if (!q) return true;
				const hay = [renderLine(r, resolveStrategy(r, strategy, rules)), r.category, r.subcategory, r.key, r.value, r.person, r.relationship, ...(r.tags || [])].filter(Boolean).join(" ").toLowerCase();
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
			const hasFilters = pinnedOnly || Boolean(q) || kindFilter !== "all" || scopeFilter !== "all" || Boolean(tagFilter) || sortBy !== "updated";
			const clearFilters = () => { setQuery(""); setKindFilter("all"); setScopeFilter("all"); setTagFilter(""); setSortBy("updated"); setPinnedOnly(false); };
			const activeFilterCount = (pinnedOnly ? 1 : 0) + (kindFilter !== "all" ? 1 : 0) + (scopeFilter !== "all" ? 1 : 0) + (tagFilter ? 1 : 0) + (sortBy !== "updated" ? 1 : 0);
			const countEl = h("span", { key: "count", role: "status", "aria-live": "polite", "aria-atomic": true, style: c.filterMeta }, "显示 " + sorted.length + " / " + memories.length + " 条");
			const sortSelect = h("select", { key: "sort", "aria-label": "排序方式", style: c.filterSelect, value: sortBy, onChange: (e) => setSortBy(e.target.value) }, [
				["updated", "最近更新"], ["created", "最近创建"], ["importance", "重要性"], ["usage", "使用频率"],
			].map(([value, label]) => h("option", { key: value, value }, label)));
			const groupSelect = h("select", { key: "group", "aria-label": "分组方式", style: c.filterSelect, value: groupBy, onChange: (e) => setGroupBy(e.target.value) }, [
				["none", "不分组"], ["time", "按更新时间"], ["kind", "按类型"],
			].map(([value, label]) => h("option", { key: value, value }, label)));
			const tagSelect = h("select", { key: "tag", "aria-label": "标签筛选", style: c.filterSelect, value: tagFilter, onChange: (e) => setTagFilter(e.target.value) }, [
				h("option", { key: "", value: "" }, "全部标签"),
				...allTags.map((tag) => h("option", { key: tag, value: tag }, "#" + tag)),
			]);
			const clearButton = hasFilters ? h("button", { key: "clear", type: "button", style: c.linkBtn, onClick: clearFilters }, "清除筛选") : null;
			const kindGroup = h("div", { key: "kind", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "kl", style: c.filterLabel }, "类型"),
				...[["all", "全部"], ["semantic", "语义"], ["episodic", "情景"], ["procedural", "程序"]].map(([value, label]) => h("button", { key: "k" + value, type: "button", "aria-label": "类型：" + label, "aria-pressed": kindFilter === value, style: c.filterChip(kindFilter === value), onClick: () => setKindFilter(value) }, label)),
			]);
			const scopeGroup = h("div", { key: "scope", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "sl", style: c.filterLabel }, "范围"),
				...[["all", "全部"], ["global", "全局"], ["project", "项目"]].map(([value, label]) => h("button", { key: "s" + value, type: "button", "aria-label": "范围：" + label, "aria-pressed": scopeFilter === value, style: c.filterChip(scopeFilter === value), onClick: () => setScopeFilter(value) }, label)),
			]);

			const saveNew = async (form) => {
				const res = editing ? await rpc("update", { id: editing.id, patch: form }) : await rpc("add", { ...form, source: "user" });
				if (res.ok) { setNotice(editing ? "已更新" : "已添加"); setEditing(null); setTab("list"); await refresh(); }
			};
			const remove = async (rec) => {
				if (!confirm("删除这条记忆？\n\n" + renderLine(rec, resolveStrategy(rec, strategy, rules)))) return;
				await rpc("delete", { id: rec.id });
				await refresh();
			};

			const togglePin = async (rec) => {
				try {
					const result = await rpc("update", { id: rec.id, patch: { pinned: !rec.pinned } });
					if (!result.ok) throw new Error(result.error || "更新失败");
					await refresh();
				} catch (error) { setNotice("常驻更新失败：" + error.message); }
			};
			const memoryRow = (rec) => h(MemoryRow, { key: rec.id, rec, strategy, rules, onPin: togglePin, onEdit: (r) => { setEditing(r); setTab("add"); }, onDelete: remove });
			const tabs = [["list", "记忆（" + memories.length + "）"], ["add", editing ? "编辑" : "新增"], ["settings", "策略与设置"], ["io", "导入导出"], ["profile", "画像"], ["agents", "规则文件"], ["help", "说明"]];

			return h("div", { className: "dshmem-root", style: c.page }, [h("style", { key: "css" }, css), h("div", { key: "content", className: "dshmem-content", style: c.content }, [
				h("div", { key: "h", style: c.head }, [
					h("h1", { key: "t", style: c.title }, "记忆"),
					h("span", { key: "s", className: "dshmem-sub", style: c.sub }, STRATEGIES.find((x) => x.id === strategy)?.name + " · " + (data.settings.inject !== false ? "自动注入开" : "自动注入关")),
					h("span", { key: "sp", style: { flex: 1 } }),
					h("button", { key: "r", style: c.btn, onClick: refresh }, "刷新"),
				]),
                h("button", { key: "mode", type: "button", style: { ...c.btn, marginTop: 16 }, "aria-pressed": simpleMode, onClick: () => setSimpleMode(!simpleMode) }, simpleMode ? "切换到完整视图" : "切换到简化视图"),
                profileError ? h("p", { key: "profile-error", role: "alert", style: c.msg("err") }, profileError) : null,
                simpleMode ? h("div", { key: "simple" }, [
                    profilePanel,
                    simpleAdding ? h(SimpleMemoryForm, { key: "simple-form", onCancel: () => setSimpleAdding(false), onSubmit: async (form) => {
                        const result = await rpc("add", form);
                        if (!result.ok) throw new Error(result.error || "未知错误");
                        setSimpleAdding(false); setNotice("已添加"); await refresh();
                    } }) : h("button", { key: "simple-add", style: c.btnPrimary, onClick: () => setSimpleAdding(true) }, "+ 添加记忆"),
                ]) : null,
				!simpleMode ? h("div", { key: "tabs", className: "dshmem-tabs", role: "tablist", "aria-label": "记忆管理", style: c.tabs }, tabs.map(([id, label]) => h("button", { key: id, id: "dshmem-tab-" + id, role: "tab", "aria-selected": tab === id, "aria-controls": "dshmem-panel-" + id, tabIndex: tab === id ? 0 : -1, onKeyDown: (e) => { const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]; if (!keys.includes(e.key)) return; e.preventDefault(); const i = tabs.findIndex((x) => x[0] === id); const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[next][0]); document.getElementById("dshmem-tab-" + tabs[next][0])?.focus(); }, style: c.tab(tab === id || (id === "add" && editing !== null && tab === "add")), onClick: () => { if (id === "add") setEditing(null); setTab(id); } }, label))) : null,
				notice ? h("div", { key: "n", role: "status", style: c.msg("ok") }, notice) : null,

                !simpleMode ? h("section", { key: "panel", role: "tabpanel", id: "dshmem-panel-" + tab, "aria-labelledby": "dshmem-tab-" + tab }, [
				tab === "list" ? h("div", { key: "list" }, [
					h(PendingPanel, { key: "pending", pending: data.pending || [], refresh }),
					h("div", { key: "filters", className: "dshmem-filter-bar", style: c.filterBar }, [
						h("div", { key: "r1", style: c.filterRow }, [
							h("input", { key: "q", type: "search", "aria-label": "搜索记忆", style: { ...c.input, flex: "1 1 240px", width: "auto" }, placeholder: "搜索内容、标签、类别或人物…", value: query, onChange: (e) => setQuery(e.target.value) }),
							h("button", { key: "pinned", type: "button", "aria-pressed": pinnedOnly, style: c.filterChip(pinnedOnly), onClick: () => setPinnedOnly(!pinnedOnly) }, "常驻"),
							...(narrow ? [h("button", {
								key: "toggle", type: "button", style: c.btn,
								"aria-expanded": filtersOpen, "aria-controls": "dshmem-filter-panel",
								onClick: () => setFiltersOpen(!filtersOpen),
							}, "筛选" + (activeFilterCount > 0 ? "（" + activeFilterCount + "）" : ""))] : [sortSelect, groupSelect]),
						]),
						h("div", { key: "panel", id: "dshmem-filter-panel", style: { ...c.filterPanel, display: (!narrow || filtersOpen) ? "flex" : "none" } }, (!narrow || filtersOpen) ? (
							narrow ? [
								h("div", { key: "narrow-row", style: c.filterRow }, [sortSelect, tagSelect, groupSelect]),
								kindGroup,
								scopeGroup,
								h("div", { key: "row", style: c.filterRow }, [clearButton, countEl]),
							] : h("div", { key: "all", className: "dshmem-filter-wide", style: c.filterWide }, [kindGroup, scopeGroup, tagSelect, clearButton, countEl])
						) : null),
						narrow && !filtersOpen ? h("div", { key: "summary", style: { ...c.filterRow, marginTop: 6 } }, [clearButton, countEl]) : null,
					]),
					sorted.length === 0 ? h("div", { key: "e", style: c.empty }, [
						h(MemoryIcon, { key: "icon" }),
						h("p", { key: "text" }, memories.length === 0 ? "把值得记住的偏好与经历留在这里。" : "没有匹配的记忆，试试调整筛选条件。"),
						memories.length === 0
							? h("button", { key: "add", style: c.btnPrimary, onClick: () => { setEditing(null); setTab("add"); } }, "新增记忆")
							: (hasFilters ? h("button", { key: "clear2", style: c.btn, onClick: clearFilters }, "清除筛选") : null),
					]) : null,
					groupBy === "none"
						? sorted.map(memoryRow)
						: [...sorted.filter((r) => r.pinned).map(memoryRow), ...groups.map((group, gi) => h("section", { key: group.key, "aria-label": group.label }, [
							h("h2", { key: "h", style: { fontSize: 12, lineHeight: "18px", fontWeight: 600, color: t.secondary, margin: (gi === 0 ? "0" : "24px") + " 0 8px" } }, group.label + " · " + group.items.length),
							...group.items.map(memoryRow),
						]))],
				]) : null,

				tab === "add" ? h("div", { key: "add" }, [
					h(MemoryForm, { key: editing?.id || "new", strategy, initial: editing, onSubmit: saveNew, onCancel: editing ? () => { setEditing(null); setTab("list"); } : null }),
				]) : null,

				tab === "settings" ? h(SettingsPanel, { key: "set", data, generating, onGenerate: generate, onSaved: (settings) => setData({ ...data, settings }) }) : null,

				tab === "profile" ? profilePanel : null,

				tab === "io" ? h(IoPanel, { key: "io", refresh }) : null,

				tab === "agents" ? h(AgentsPanel, { key: "agents" }) : null,

				tab === "help" ? h(HelpPanel, { key: "help", dir: data.dir }) : null,
                ]) : null,
			])]);
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
