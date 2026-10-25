window.__ModuleLoader__.load({
	id: "dsh-memory-manager",
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
            actionBtn: { ...button, padding: "4px 8px", minHeight: 30, fontSize: 12, lineHeight: "18px" },
            input, area: { ...input, minHeight: 104, resize: "vertical" },
            label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: t.secondary, margin: "10px 0 12px" },
            grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
            grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
            msg: (kind) => ({ margin: "12px 0", fontSize: 12.5, color: kind === "err" ? t.error : "color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, var(--dsw-alias-label-primary) 30%)" }),
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
					if (previous && typeof previous.focus === "function") previous.focus();
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

		function MemoryRow(props) {
			const { rec, strategy, rules, onEdit, onDelete, onPin, onToggleVisibility } = props;
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
			const activeStrategy = effectiveStrategy(rec, strategy, rules);
			const parts = renderParts(rec, activeStrategy);

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
			}, [expanded, activeStrategy, narrow, rec]);

			return h("article", { className: "dshmem-card" + (rec.pinned ? " dshmem-pinned" : "") + (rec.visibility === "hidden" ? " dshmem-hidden" : ""), style: c.memCard }, [
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
							rec.pinned ? h("span", { key: "pinned", className: "dshmem-pinned-badge", style: { ...c.chip, color: t.brand, background: "color-mix(in srgb, " + t.brand + " 8%, transparent)" } }, "📌 常驻") : null,
							rec.visibility === "hidden" ? h("span", { key: "hidden", className: "dshmem-hidden-badge", style: { ...c.chip, color: t.warnText, background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent)" } }, "已隐藏") : null,
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
					h("div", { key: "a", className: "dshmem-actions", style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", flexShrink: 0 } }, [
						h("div", { key: "state", style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" } }, [
							h("button", { key: "pin", type: "button", style: c.actionBtn, "aria-label": rec.pinned ? "取消常驻" : "设为常驻", "aria-pressed": rec.pinned === true, onClick: () => onPin(rec) }, rec.pinned ? "取消常驻" : "设为常驻"),
							h("button", { key: "vis", type: "button", style: c.actionBtn, "aria-label": rec.visibility === "hidden" ? "恢复为对 Agent 可见" : "对 Agent 隐藏", "aria-pressed": rec.visibility === "hidden", onClick: () => onToggleVisibility(rec) }, rec.visibility === "hidden" ? "恢复对 Agent 可见" : "对 Agent 隐藏"),
						]),
						h("div", { key: "record", style: { display: "flex", gap: 6, justifyContent: "flex-end" } }, [
							h("button", { key: "e", type: "button", className: "dshmem-quiet", "aria-label": "编辑记忆", "aria-describedby": textId, style: c.quiet, onClick: () => onEdit(rec) }, "编辑"),
							h("button", { key: "d", type: "button", className: "dshmem-quiet dshmem-danger", "aria-label": "删除记忆", "aria-describedby": textId, style: c.quiet, onClick: () => onDelete(rec) }, "删除"),
						]),
					]),
				]),
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
			}));
			const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
			const [saving, setSaving] = useState(false);
            const [error, setError] = useState("");
            const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(initial && (initial.strategy || initial.category || initial.subcategory || initial.key || initial.value || initial.person || initial.relationship || initial.backstory)));
            const baseline = useRef(JSON.stringify(form));
            useEffect(() => { onDirty?.(JSON.stringify(form) !== baseline.current); }, [form, onDirty]);
            const submit = async () => {
                if (saving || !form.text.trim()) return;
                setSaving(true); setError("");
                try { await onSubmit({ ...form, tags: form.tags.split(/[,，]/).map(x => x.trim()).filter(Boolean), importance: Number(form.importance) }); }
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
						advanced ? h("div", { key: "adv", className: "dshmem-grid", style: c.grid3 }, [
							h(Field, { key: "who", label: "主体（person）" }, h("input", { style: c.input, value: form.person, onChange: set("person"), placeholder: "张医生" })),
							h(Field, { key: "rel", label: "关系（relationship）" }, h("input", { style: c.input, value: form.relationship, onChange: set("relationship"), placeholder: "用户的牙科医生" })),
							h(Field, { key: "back", label: "背景（backstory）" }, h("input", { style: c.input, value: form.backstory, onChange: set("backstory"), placeholder: "2026-10 就诊时提到" })),
						]) : null,
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
			const baseline = useRef(JSON.stringify(withDefaults(data.settings)));
            const formDirty = JSON.stringify(form) !== baseline.current;
            useEffect(() => { onDirty?.(formDirty); }, [formDirty, onDirty]);
            useEffect(() => { if (!formDirty) { baseline.current = JSON.stringify(withDefaults(data.settings)); setForm(withDefaults(data.settings)); } }, [data.settings]);
			const pinnedChars = (data.memories || []).filter((r) => r.pinned && r.visibility !== "hidden").map((r) => "- " + renderLine(r, effectiveStrategy(r, form.strategy, form.strategyRules))).join("\n").length;
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
					baseline.current = JSON.stringify(withDefaults(res.settings)); setForm(withDefaults(res.settings)); onDirty?.(false); onSaved(res.settings);
					const placement = res.settings.entryPlacement;
					setTimeout(() => window.dispatchEvent(new CustomEvent("dsh-memory:placement", { detail: { placement } })), 700);
				} else setMsg("保存失败：" + (res.error === "invalid-rules" ? "混合策略规则无效，请检查条件字段、条件值和目标策略" : res.error || "未知错误"));
			};
			return h("div", null, [
				h("p", { key: "save-hint", style: { fontSize: 12, color: t.secondary, margin: "0 0 10px", lineHeight: 1.6 } }, formDirty ? "有未保存修改，点底部「保存设置」生效。" : "修改后点底部「保存设置」生效。"),
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
				h("div", { key: "inj", style: { ...c.card, marginTop: 16 } }, [
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
					h("div", { key: "hint", style: { fontSize: 11.5, color: t.secondary, marginTop: 8, lineHeight: 1.6 } }, "保存后入口位置立即调整；若当前页面消失，从新入口重新打开即可。"),
				]),
				h("div", { key: "dir", style: { fontSize: 12, color: t.secondary, overflowWrap: "anywhere", marginTop: 16 } }, "存储目录：" + (data.dir || "")),
				h("div", { key: "a", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, onClick: save }, "保存设置"),
					formDirty ? h("span", { key: "dirty", style: { fontSize: 12, color: t.secondary } }, "有未保存修改") : null,
					msg ? h("span", { key: "m", role: "status", style: c.msg(msg === "已保存" ? "ok" : "err") }, msg) : null,
				]),
			]);
		}

		function IoPanel(props) {
			const { refresh } = props;
			const [text, setText] = useState("");
			const [mode, setMode] = useState("merge");
			const [msg, setMsg] = useState("");
			const [msgKind, setMsgKind] = useState("info");
			const notify = (text, kind = "info") => { setMsg(text); setMsgKind(kind); };
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
					notify("已导出并开始下载", "ok");
				} catch (e) { notify("已生成 JSON，可手动复制", "info"); }
			};
			const doImport = async () => {
				let data;
				try { data = JSON.parse(text); } catch (e) { notify("JSON 解析失败：" + e.message, "err"); return; }
				try {
					const checked = await rpc("preview-import", { data, mode });
					if (!checked.ok) { notify("预览失败：" + (checked.error || ""), "err"); return; }
					const p = checked.preview;
					const summary = "新增 " + p.newCount + " / 更新 " + p.updateCount + " / 无变化 " + p.keptCount + " / 无效 " + p.invalidCount + (p.settingsChanged ? "；设置将改变" : "");
					notify(summary, "info");
					if (p.invalidCount) { notify(summary + "。请修正无效记录后重试。", "err"); return; }
					if (!confirm(summary + (mode === "replace" ? "。将替换现有记忆并自动备份。" : "。") + "确认导入？")) return;
					const res = await rpc("import", { data, mode });
					if (res.ok) { notify("导入完成，共 " + res.count + " 条", "ok"); await refresh(); } else notify("导入失败：" + (res.error || ""), "err");
				} catch (error) { notify("导入失败：" + (error.message || error), "err"); }
			};
			return h("div", null, [
				h("div", { key: "e", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导出"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "导出全部记忆、设置与画像为 JSON，便于备份或迁移到另一台机器。"),
					h("button", { key: "b", style: c.btnPrimary, onClick: doExport }, "导出 JSON"),
				]),
				h("div", { key: "i", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导入（先预览）"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "粘贴导出的 JSON，先预览再确认写入。合并会按 id 更新同一条；替换会清空现有记忆。"),
					h("textarea", { key: "a", "aria-label": "导入或导出的 JSON", spellCheck: false, style: { ...c.area, minHeight: 160, fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)", fontSize: 11.5 }, value: text, onChange: (e) => setText(e.target.value), placeholder: "{\n  \"version\": 1,\n  \"settings\": { ... },\n  \"memories\": [ ... ]\n}" }),
					h("div", { key: "r", style: { display: "flex", gap: 10, alignItems: "center", marginTop: 10 } }, [
                        h("div", { key: "m", role: "group", "aria-label": "导入方式", style: { ...c.tabs, margin: 0 } }, ["merge", "replace"].map((m) => h("button", { key: m, "aria-pressed": mode === m, style: c.tab(mode === m), onClick: () => setMode(m) }, m === "merge" ? "合并" : "替换"))),
						h("button", { key: "b", style: c.btnPrimary, onClick: doImport }, "预览导入"),
					]),
				]),
				h("div", { key: "c", style: { ...c.card, borderColor: "color-mix(in srgb, " + t.error + " 35%, transparent)", background: "color-mix(in srgb, " + t.error + " 3%, " + t.surface + ")" } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "危险操作"),
					h("div", { key: "d", style: { fontSize: 12, color: t.secondary, marginBottom: 10 } }, "清空全部记忆，不可撤销（建议先导出备份）。"),
					h("button", { key: "b", style: c.btnDanger, onClick: async () => {
						if (!confirm("确定清空全部记忆？建议先导出备份。")) return;
						await rpc("clear", {});
						await refresh();
						notify("已清空", "ok");
					} }, "清空全部记忆"),
				]),
				msg ? h("div", { key: "m", role: "status", style: c.msg(msgKind) }, msg) : null,
			]);
		}

        function qualityGroups(memories) {
            const texts = new Map(), paths = new Map();
            for (const rec of memories) {
                const text = (rec.text || "").trim();
                if (text) { if (!texts.has(text)) texts.set(text, []); texts.get(text).push(rec); }
                if (rec.category || rec.subcategory || rec.key) {
                    const path = JSON.stringify([rec.category || "", rec.subcategory || "", rec.key]);
                    if (!paths.has(path)) paths.set(path, []);
                    paths.get(path).push(rec);
                }
            }
            const groups = [];
            for (const [text, rows] of texts) if (rows.length > 1) groups.push({ type: "duplicate", label: "精确重复", rows });
            for (const [path, rows] of paths) if (new Set(rows.map(r => r.value || "")).size > 1)
                groups.push({ type: "conflict", label: "同路径多值：" + JSON.parse(path).filter(Boolean).join("."), rows });
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
                if (!confirm((merge ? "合并所有标签并保留最新记录" : "保留最新记录") + "（" + newest.id + "），删除其余 " + (rows.length - 1) + " 条？此操作可能包含不同范围或人物，请先核对。")) return;
                setBusy(true); setError("");
                try {
                    if (merge) {
                        // Never copy tags from a hidden record into a visible one; hidden tags
                        // would otherwise become searchable through the merged record.
                        const tagRows = newest.visibility === "hidden" ? rows : rows.filter((r) => r.visibility !== "hidden");
                        const result = await rpc("update", { id: newest.id, patch: { tags: [...new Set(tagRows.flatMap(r => r.tags || []))] } });
                        if (!result.ok) throw new Error(result.error || "合并失败");
                    }
                    for (const rec of rows.slice(1)) {
                        const result = await rpc("delete", { id: rec.id });
                        if (!result.ok) throw new Error(result.error || "删除失败");
                    }
                } catch (error) { setError("操作失败：" + error.message); }
                finally { await refresh(); setBusy(false); }
            };
            return h("section", { style: embedded ? { ...c.card, border: "none", padding: 0, marginBottom: 0, background: "transparent" } : c.card, "aria-label": "记忆质量审阅" }, [
                embedded ? null : h("h2", { key: "title", style: { fontSize: 15, marginTop: 0 } }, "质量审阅"),
                !groups.length ? h("p", { key: "empty", style: { fontSize: 13, color: t.secondary } }, "没有待审阅的重复或同路径多值") : null,
                ...groups.map(group => h("article", { key: group.id, style: c.card }, [
                    h("h3", { key: "title", style: { fontSize: 14, overflowWrap: "anywhere" } }, group.label),
                    ...group.rows.map(rec => h("p", { key: rec.id, style: { fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, rec.id + " · " + fmtTime(rec.updatedAt) + " · " + (rec.scope || "global") + " · " + (rec.person || "未指定人物") + "\n" + rec.text + (group.type === "conflict" ? "\n值：" + rec.value : ""))),
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

		function ProfilePanel({ profile = {}, memories = [] }) {
			const count = memories.filter((r) => (r.status || "active") === "active" && r.visibility !== "hidden").length;
			return h("section", { style: { ...c.card, marginTop: 16 }, "aria-label": "用户画像" }, [
				h("h2", { key: "title", style: { fontSize: 16, marginTop: 0 } }, "用户画像"),
				h("p", { key: "status", role: "status", style: { fontSize: 12, color: t.secondary } }, "基于 " + count + " 条记忆 · " + (profile.generatedAt ? "生成于 " + relativeTime(profile.generatedAt) : "尚未生成")),
				profile.stale ? h("p", { key: "stale", role: "status", style: { fontSize: 13, color: t.warnText } }, "数据已变更，摘要待更新") : null,
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
            const changeTab = (next) => { if (next === tab) return; if (!leaveEdit()) return; setDirty(false); setEditing(null); setAdding(false); setTab(next); };
            useEffect(() => {
                let active = true, fetching = false;
                const signature = (j) => JSON.stringify([j.memories.length, j.memories.reduce((max, r) => Math.max(max, r.updatedAt || 0), 0), j.profile, j.settings]);
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
			const profilePanel = h(ProfilePanel, { key: "profile", profile: data.profile, memories: data.memories });
			const rules = data.settings.strategyRules || [];
			const memories = data.memories || [];
			const hiddenCount = memories.filter((r) => r.visibility === "hidden").length;
			const q = query.trim().toLowerCase();
			const allTags = [...new Set(memories.flatMap((r) => r.tags || []))].sort((a, b) => a.localeCompare(b, "zh"));
			const filtered = memories.filter((r) => {
				if (pinnedOnly && !r.pinned) return false;
				if (visibilityFilter === "visible" && r.visibility === "hidden") return false;
				if (visibilityFilter === "hidden" && r.visibility !== "hidden") return false;
				if (kindFilter !== "all" && r.kind !== kindFilter) return false;
				if (scopeFilter !== "all" && (r.scope || "global") !== scopeFilter) return false;
				if (tagFilter && !(r.tags || []).includes(tagFilter)) return false;
				if (!q) return true;
				const hay = [renderLine(r, effectiveStrategy(r, strategy, rules)), r.category, r.subcategory, r.key, r.value, r.person, r.relationship, ...(r.tags || [])].filter(Boolean).join(" ").toLowerCase();
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
			const hasFilters = pinnedOnly || visibilityFilter !== "all" || Boolean(q) || kindFilter !== "all" || scopeFilter !== "all" || Boolean(tagFilter) || sortBy !== "updated";
			const clearFilters = () => { setQuery(""); setKindFilter("all"); setScopeFilter("all"); setTagFilter(""); setSortBy("updated"); setPinnedOnly(false); setVisibilityFilter("all"); };
			const activeFilterCount = (pinnedOnly ? 1 : 0) + (visibilityFilter !== "all" ? 1 : 0) + (kindFilter !== "all" ? 1 : 0) + (scopeFilter !== "all" ? 1 : 0) + (tagFilter ? 1 : 0) + (sortBy !== "updated" ? 1 : 0);
			const countEl = h("span", { key: "count", role: "status", "aria-live": "polite", "aria-atomic": true, style: c.filterMeta }, "显示 " + sorted.length + " / " + memories.length + " 条");
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
			const kindGroup = h("div", { key: "kind", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "kl", style: c.filterLabel }, "类型"),
				...[["all", "全部"], ["semantic", "语义"], ["episodic", "情景"], ["procedural", "程序"]].map(([value, label]) => h("button", { key: "k" + value, type: "button", "aria-label": "类型：" + label, "aria-pressed": kindFilter === value, style: c.filterChip(kindFilter === value), onClick: () => setKindFilter(value) }, label)),
			]);
			const scopeGroup = h("div", { key: "scope", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "sl", style: c.filterLabel }, "范围"),
				...[["all", "全部"], ["global", "全局"], ["project", "项目"]].map(([value, label]) => h("button", { key: "s" + value, type: "button", "aria-label": "范围：" + label, "aria-pressed": scopeFilter === value, style: c.filterChip(scopeFilter === value), onClick: () => setScopeFilter(value) }, label)),
			]);
			const visibilityGroup = h("div", { key: "visibility", className: "dshmem-filter-group", style: c.filterGroup }, [
				h("span", { key: "vl", style: c.filterLabel }, "可见性"),
				...[["all", "全部"], ["visible", "Agent 可见"], ["hidden", "已隐藏"]].map(([value, label]) => h("button", { key: "v" + value, type: "button", "aria-label": "可见性：" + label, "aria-pressed": visibilityFilter === value, style: c.filterChip(visibilityFilter === value), onClick: () => setVisibilityFilter(value) }, label)),
			]);

			const saveNew = async (form) => {
				const res = editing ? await rpc("update", { id: editing.id, patch: form }) : await rpc("add", { ...form, source: "user" });
				if (!res.ok) throw new Error(res.error || "保存失败");
                setNotice(editing ? "已更新" : "已添加"); setDirty(false); setEditing(null); setAdding(false); setTab("list"); await refresh();
			};
			const remove = async (rec) => {
				if (!confirm("删除这条记忆？\n\n" + renderLine(rec, effectiveStrategy(rec, strategy, rules)))) return;
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
			const toggleVisibility = async (rec) => {
				try {
					const result = await rpc("update", { id: rec.id, patch: { visibility: rec.visibility === "hidden" ? "visible" : "hidden" } });
					if (!result.ok) throw new Error(result.error || "更新失败");
					await refresh();
					setNotice(rec.visibility === "hidden" ? "已恢复可见" : "已对 Agent 隐藏");
				} catch (error) { setNotice("可见性更新失败：" + error.message); }
			};
			const memoryRow = (rec) => h(MemoryRow, { key: rec.id, rec, strategy, rules, onPin: togglePin, onToggleVisibility: toggleVisibility, onEdit: (r) => { if (!leaveEdit()) return; setDirty(false); setEditing(r); setAdding(true); setTab("list"); }, onDelete: remove });
            const tabs = [["list", "记忆"], ["profile", "画像"], ["agents", "全局规则"], ["settings", "设置"], ["help", "说明"]];
            const formModal = adding ? h(Modal, { key: "form-modal", title: editing ? "编辑记忆" : "新增记忆", onClose: closeEditor }, h(MemoryForm, { key: editing?.id || "new-" + draftId, embedded: true, strategy, rules, initial: editing, onDirty: setDirty, onSubmit: saveNew, onCancel: closeEditor })) : null;
            const reviewModal = reviewOpen ? h(Modal, { key: "review-modal", title: "审阅重复与矛盾", onClose: () => setReviewOpen(false) }, h(QualityPanel, { key: "quality", embedded: true, memories, refresh })) : null;

			return h("div", { className: "dshmem-root", style: c.page }, [h("style", { key: "css" }, css), h("div", { key: "content", className: "dshmem-content", style: c.content }, [
				h("div", { key: "h", style: c.head }, [
					h("h1", { key: "t", style: c.title }, "记忆"),
					h("span", { key: "s", className: "dshmem-sub", style: c.sub }, STRATEGIES.find((x) => x.id === strategy)?.name + " · " + (data.settings.inject !== false ? "自动注入开" : "自动注入关")),
					h("span", { key: "sp", style: { flex: 1 } }),
					h("button", { key: "r", style: c.btn, onClick: refresh }, "刷新"),
				]),
 				h("div", { key: "tabs", className: "dshmem-tabs", role: "tablist", "aria-label": "记忆管理", style: c.tabs }, tabs.map(([id, label]) => h("button", { key: id, id: "dshmem-tab-" + id, role: "tab", "aria-selected": tab === id, "aria-controls": "dshmem-panel-" + id, tabIndex: tab === id ? 0 : -1, onKeyDown: (e) => { const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]; if (!keys.includes(e.key)) return; e.preventDefault(); const i = tabs.findIndex((x) => x[0] === id); const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; changeTab(tabs[next][0]); document.getElementById("dshmem-tab-" + tabs[next][0])?.focus(); }, style: c.tab(tab === id), onClick: () => changeTab(id) }, label))),
				data.loadError ? h("div", { key: "load-error", role: "alert", style: c.msg("err") }, "记忆文件加载失败，已进入只读恢复态，原文件不会被覆盖。请修复文件后重启插件：" + data.loadError) : null,
				notice ? h("div", { key: "n", role: "status", style: c.msg("ok") }, notice) : null,

                h("section", { key: "panel", role: "tabpanel", id: "dshmem-panel-" + tab, "aria-labelledby": "dshmem-tab-" + tab }, [
				tab === "list" ? h("div", { key: "list" }, [
                    h("div", { key: "tools", style: { ...c.filterRow, margin: "12px 0" } }, [
                        h("button", { key: "add", style: c.btnPrimary, onClick: () => { if (!leaveEdit()) return; setDirty(false); setEditing(null); setDraftId(i => i + 1); setAdding(true); } }, "+ 新增记忆"),
                        h("button", { key: "quality", style: c.btn, onClick: () => setReviewOpen(!reviewOpen), "aria-expanded": reviewOpen }, "审阅重复与矛盾"),
                    ]),
                    memories.length > 0 ? h("p", { key: "visibility-hint", role: "note", style: { fontSize: 12, lineHeight: "18px", color: t.secondary, margin: "0 0 12px" } }, "隐藏会立即生效，Agent 不再读取；记录仍保留，画像摘要会标记为待更新。") : null,
					h(PendingPanel, { key: "pending", pending: data.pending || [], refresh }),
					h("div", { key: "filters", className: "dshmem-filter-bar" + (filtersOpen ? " dshmem-filters-open" : ""), style: c.filterBar }, [
						h("div", { key: "r1", style: c.filterRow }, [
							h("input", { key: "q", type: "search", "aria-label": "搜索记忆", style: { ...c.input, flex: "1 1 240px", width: "auto" }, placeholder: "按关键词过滤（非 Agent 检索）", value: query, onChange: (e) => setQuery(e.target.value) }),
							h("button", { key: "pinned", type: "button", "aria-pressed": pinnedOnly, style: c.filterChip(pinnedOnly), onClick: () => setPinnedOnly(!pinnedOnly) }, "常驻"),
							...(narrow ? [h("button", {
								key: "toggle", type: "button", style: c.btn,
								"aria-expanded": filtersOpen, "aria-controls": "dshmem-filter-panel",
								onClick: () => setFiltersOpen(!filtersOpen),
							}, "筛选" + (activeFilterCount > 0 ? "（" + activeFilterCount + "）" : ""))] : [sortSelect, groupSelect]),
						]),
						h("div", { key: "panel", id: "dshmem-filter-panel", className: "dshmem-filter-panel", style: { ...c.filterPanel, display: (!narrow || filtersOpen) ? "flex" : "none" } }, (!narrow || filtersOpen) ? (
							narrow ? [
								h("div", { key: "narrow-row", style: c.filterRow }, [sortSelect, groupSelect]),
                                tagSelect,
								kindGroup,
								scopeGroup,
								visibilityGroup,
								h("div", { key: "row", style: c.filterRow }, [clearButton, countEl]),
							] : h("div", { key: "all", className: "dshmem-filter-wide", style: c.filterWide }, [kindGroup, scopeGroup, visibilityGroup, tagSelect, clearButton, countEl])
						) : null),
						narrow && !filtersOpen ? h("div", { key: "summary", style: { ...c.filterRow, marginTop: 6 } }, [clearButton, countEl]) : null,
					]),
					sorted.length === 0 ? h("div", { key: "e", style: c.empty }, [
						h(MemoryIcon, { key: "icon" }),
						h("p", { key: "text" }, memories.length === 0 ? "把值得记住的偏好与经历留在这里。" : (visibilityFilter === "hidden" && hiddenCount === 0) ? "还没有已隐藏的记忆。隐藏后仍可在这里查看和恢复。" : "没有匹配的记忆，试试调整筛选条件。"),
						memories.length === 0
							? h("button", { key: "add", style: c.btnPrimary, onClick: () => { if (!leaveEdit()) return; setDirty(false); setEditing(null); setDraftId(i => i + 1); setAdding(true); } }, "新增记忆")
							: (visibilityFilter === "hidden" && hiddenCount === 0)
								? h("button", { key: "showall", style: c.btn, onClick: () => setVisibilityFilter("all") }, "查看全部记忆")
								: (hasFilters ? h("button", { key: "clear2", style: c.btn, onClick: clearFilters }, "清除筛选") : null),
					]) : null,
					groupBy === "none"
						? sorted.map(memoryRow)
						: [...sorted.filter((r) => r.pinned).map(memoryRow), ...groups.map((group, gi) => h("section", { key: group.key, "aria-label": group.label }, [
							h("h2", { key: "h", style: { fontSize: 12, lineHeight: "18px", fontWeight: 600, color: t.secondary, margin: (gi === 0 ? "0" : "24px") + " 0 8px" } }, group.label + " · " + group.items.length),
							...group.items.map(memoryRow),
						]))],
				]) : null,

                tab === "settings" ? h("div", { key: "settings" }, [
                    h(SettingsPanel, { key: "set", data, onDirty: setDirty, onSaved: (settings) => setData(prev => ({ ...prev, settings })) }),
                    h("section", { key: "io", style: { marginTop: 24 } }, [h("h2", { key: "title", style: { fontSize: 16 } }, "导入导出"), h(IoPanel, { key: "panel", refresh })]),
                ]) : null,

				tab === "profile" ? profilePanel : null,


				tab === "agents" ? h(AgentsPanel, { key: "agents", onDirty: setDirty }) : null,

				tab === "help" ? h(HelpPanel, { key: "help", dir: data.dir }) : null,
                ]),
			]), formModal, reviewModal]);
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
