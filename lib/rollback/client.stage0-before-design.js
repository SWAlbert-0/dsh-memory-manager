window.__ModuleLoader__.load({
	id: "dsh-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const h = react.createElement;
		const { useState, useEffect, useCallback } = react;

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

		const c = {
			page: { height: "100%", overflow: "auto", padding: "20px 24px 40px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "inherit" },
			head: { display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 },
			title: { fontSize: 22, fontWeight: 650, margin: 0 },
			sub: { fontSize: 12, opacity: 0.6 },
			tabs: { display: "flex", gap: 6, margin: "16px 0 18px", borderBottom: "1px solid rgba(127,127,127,.25)", paddingBottom: 8, flexWrap: "wrap" },
			tab: (active) => ({ padding: "6px 12px", borderRadius: 8, border: "1px solid " + (active ? "rgba(127,127,127,.45)" : "transparent"), background: active ? "rgba(127,127,127,.14)" : "transparent", cursor: "pointer", fontSize: 13, color: "inherit" }),
			card: { border: "1px solid rgba(127,127,127,.22)", borderRadius: 12, padding: 14, marginBottom: 10, background: "rgba(127,127,127,.045)" },
			row: { display: "flex", gap: 10, alignItems: "flex-start" },
			grow: { flex: 1, minWidth: 0 },
			meta: { fontSize: 11, opacity: 0.6, marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" },
			chip: { border: "1px solid rgba(127,127,127,.3)", borderRadius: 999, padding: "1px 7px", fontSize: 10.5, opacity: 0.8 },
			btn: { padding: "6px 11px", borderRadius: 8, border: "1px solid rgba(127,127,127,.35)", background: "rgba(127,127,127,.08)", color: "inherit", cursor: "pointer", fontSize: 12.5 },
			btnPrimary: { padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(80,130,255,.55)", background: "rgba(80,130,255,.18)", color: "inherit", cursor: "pointer", fontSize: 13, fontWeight: 600 },
			btnDanger: { padding: "5px 9px", borderRadius: 7, border: "1px solid rgba(220,80,80,.45)", background: "rgba(220,80,80,.10)", color: "inherit", cursor: "pointer", fontSize: 12 },
			input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(127,127,127,.35)", background: "rgba(127,127,127,.06)", color: "inherit", fontSize: 13, outline: "none" },
			area: { width: "100%", boxSizing: "border-box", minHeight: 90, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(127,127,127,.35)", background: "rgba(127,127,127,.06)", color: "inherit", fontSize: 13, fontFamily: "inherit", resize: "vertical" },
			label: { display: "block", fontSize: 12, opacity: 0.75, margin: "10px 0 5px" },
			grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
			grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
			msg: (kind) => ({ marginTop: 10, fontSize: 12.5, color: kind === "err" ? "#d9534f" : "#3a9d5d" }),
			strategyCard: (active) => ({ border: "1px solid " + (active ? "rgba(80,130,255,.65)" : "rgba(127,127,127,.25)"), background: active ? "rgba(80,130,255,.10)" : "rgba(127,127,127,.04)", borderRadius: 10, padding: 12, cursor: "pointer", marginBottom: 8 }),
			empty: { textAlign: "center", opacity: 0.55, fontSize: 13, padding: "40px 0" },
		};

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

		function Field(props) {
			return h("label", { style: c.label }, [props.label, props.children]);
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
			return { data, setData, error, refresh };
		}

		function MemoryRow(props) {
			const { rec, strategy, onEdit, onDelete } = props;
			return h("div", { style: c.card }, [
				h("div", { key: "r", style: c.row }, [
					h("div", { key: "g", style: c.grow }, [
						h("div", { key: "t", style: { fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, renderLine(rec, strategy)),
						h("div", { key: "m", style: c.meta }, [
							h("span", { key: "k", style: c.chip }, (KINDS.find((x) => x.id === rec.kind) || { name: rec.kind }).name),
							h("span", { key: "s", style: c.chip }, rec.scope === "project" ? "项目" : "全局"),
							...(rec.tags || []).map((t, i) => h("span", { key: "tag" + i, style: c.chip }, "#" + t)),
							h("span", { key: "time" }, fmtTime(rec.updatedAt)),
						]),
					]),
					h("div", { key: "a", style: { display: "flex", gap: 6, flexShrink: 0 } }, [
						h("button", { key: "e", style: c.btn, onClick: () => onEdit(rec) }, "编辑"),
						h("button", { key: "d", style: c.btnDanger, onClick: () => onDelete(rec) }, "删除"),
					]),
				]),
			]);
		}

		function MemoryForm(props) {
			const { strategy, initial, onSubmit, onCancel } = props;
			const [form, setForm] = useState(() => ({
				text: initial?.text || "",
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
			const structured = strategy === "json" || strategy === "advanced";
			const advanced = strategy === "advanced";
			return h("div", { style: c.card }, [
				h(Field, { key: "t", label: "内容（一句话或一段话）" }, h("textarea", { style: c.area, value: form.text, onChange: set("text"), placeholder: "例如：用户偏好靠窗座位，且是素食者。" })),
				h("div", { key: "k", style: c.grid3 }, [
					h(Field, { key: "kind", label: "类型" }, h("select", { style: c.input, value: form.kind, onChange: set("kind") }, KINDS.map((k) => h("option", { key: k.id, value: k.id }, k.name)))),
					h(Field, { key: "scope", label: "范围" }, h("select", { style: c.input, value: form.scope, onChange: set("scope") }, [h("option", { key: "g", value: "global" }, "全局"), h("option", { key: "p", value: "project" }, "项目")])),
					h(Field, { key: "imp", label: "重要性 1-5" }, h("input", { style: c.input, type: "number", min: 1, max: 5, value: form.importance, onChange: set("importance") })),
				]),
				h(Field, { key: "tags", label: "标签（逗号分隔）" }, h("input", { style: c.input, value: form.tags, onChange: set("tags"), placeholder: "旅行, 饮食" })),
				structured ? h("div", { key: "s", style: c.grid3 }, [
					h(Field, { key: "cat", label: "类别" }, h("input", { style: c.input, value: form.category, onChange: set("category"), placeholder: "work" })),
					h(Field, { key: "sub", label: "子类别" }, h("input", { style: c.input, value: form.subcategory, onChange: set("subcategory"), placeholder: "position" })),
					h(Field, { key: "key", label: "字段" }, h("input", { style: c.input, value: form.key, onChange: set("key"), placeholder: "title" })),
				]) : null,
				structured ? h(Field, { key: "val", label: "字段值" }, h("input", { style: c.input, value: form.value, onChange: set("value"), placeholder: "高级工程师" })) : null,
				advanced ? h("div", { key: "adv", style: c.grid3 }, [
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
			const { data, onSaved } = props;
			const [form, setForm] = useState(data.settings);
			const [msg, setMsg] = useState("");
			useEffect(() => { setForm(data.settings); }, [data.settings]);
			const save = async () => {
				const res = await rpc("settings", form);
				if (res.ok) { setMsg("已保存"); onSaved(res.settings); } else setMsg("保存失败");
			};
			return h("div", null, [
				h("div", { key: "st", style: { fontSize: 14, fontWeight: 600, marginBottom: 10 } }, "记忆策略"),
				...STRATEGIES.map((s) => h("div", { key: s.id, style: c.strategyCard(form.strategy === s.id), onClick: () => setForm({ ...form, strategy: s.id }) }, [
					h("div", { key: "n", style: { fontSize: 13.5, fontWeight: 600 } }, s.name + (form.strategy === s.id ? "  ✓" : "")),
					h("div", { key: "d", style: { fontSize: 12, opacity: 0.7, marginTop: 4, lineHeight: 1.5 } }, s.desc),
				])),
				h("div", { key: "inj", style: { ...c.card, marginTop: 16 } }, [
					h("label", { key: "l", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.inject !== false, onChange: (e) => setForm({ ...form, inject: e.target.checked }) }),
						"每轮自动注入相关记忆",
					]),
					h("label", { key: "ac", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 10 } }, [
						h("input", { key: "i", type: "checkbox", checked: form.autoCapture !== false, onChange: (e) => setForm({ ...form, autoCapture: e.target.checked }) }),
						"提示模型主动记录新事实（memory_write）",
					]),
					h("div", { key: "g", style: { ...c.grid2, marginTop: 4 } }, [
						h(Field, { key: "n", label: "最多注入条数" }, h("input", { style: c.input, type: "number", min: 0, max: 50, value: form.maxInject, onChange: (e) => setForm({ ...form, maxInject: Number(e.target.value) }) })),
						h(Field, { key: "c", label: "注入字符上限" }, h("input", { style: c.input, type: "number", min: 200, max: 20000, value: form.maxInjectChars, onChange: (e) => setForm({ ...form, maxInjectChars: Number(e.target.value) }) })),
					]),
				]),
				h("div", { key: "dir", style: { fontSize: 11.5, opacity: 0.55, marginTop: 10 } }, "存储目录：" + (data.dir || "")),
				h("div", { key: "a", style: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 } }, [
					h("button", { key: "s", style: c.btnPrimary, onClick: save }, "保存设置"),
					msg ? h("span", { key: "m", style: c.msg("ok") }, msg) : null,
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
					h("div", { key: "d", style: { fontSize: 12, opacity: 0.7, marginBottom: 10 } }, "导出全部记忆与设置为 JSON，便于备份或迁移到另一台机器。"),
					h("button", { key: "b", style: c.btnPrimary, onClick: doExport }, "导出 JSON"),
				]),
				h("div", { key: "i", style: { ...c.card } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "导入"),
					h("div", { key: "d", style: { fontSize: 12, opacity: 0.7, marginBottom: 10 } }, "粘贴导出的 JSON。合并会按 id 更新同一条；替换会清空现有记忆。"),
					h("textarea", { key: "a", style: { ...c.area, minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }, value: text, onChange: (e) => setText(e.target.value), placeholder: "{\n  \"version\": 1,\n  \"settings\": { ... },\n  \"memories\": [ ... ]\n}" }),
					h("div", { key: "r", style: { display: "flex", gap: 10, alignItems: "center", marginTop: 10 } }, [
						h("select", { key: "m", style: { ...c.input, width: 140 }, value: mode, onChange: (e) => setMode(e.target.value) }, [h("option", { key: "m", value: "merge" }, "合并"), h("option", { key: "r", value: "replace" }, "替换")]),
						h("button", { key: "b", style: c.btnPrimary, onClick: doImport }, "导入"),
					]),
				]),
				h("div", { key: "c", style: { ...c.card, borderColor: "rgba(220,80,80,.35)" } }, [
					h("div", { key: "t", style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, "危险操作"),
					h("div", { key: "d", style: { fontSize: 12, opacity: 0.7, marginBottom: 10 } }, "清空全部记忆，不可撤销（建议先导出备份）。"),
					h("button", { key: "b", style: c.btnDanger, onClick: async () => {
						if (!confirm("确定清空全部记忆？建议先导出备份。")) return;
						await rpc("clear", {});
						await refresh();
						setMsg("已清空");
					} }, "清空全部记忆"),
				]),
				msg ? h("div", { key: "m", style: c.msg("ok") }, msg) : null,
			]);
		}

		function MemoryPage() {
			const { data, setData, error, refresh } = useStore();
			const [tab, setTab] = useState("list");
			const [query, setQuery] = useState("");
			const [editing, setEditing] = useState(null);
			const [notice, setNotice] = useState("");

			if (error) return h("div", { style: c.page }, h("div", { style: c.msg("err") }, "加载失败：" + error + "（插件宿主端是否已启用？）"));
			if (!data) return h("div", { style: c.page }, h("div", { style: c.empty }, "加载中…"));

			const strategy = data.settings.strategy;
			const memories = data.memories || [];
			const filtered = query.trim()
				? memories.filter((r) => (renderLine(r, strategy) + " " + (r.tags || []).join(" ")).toLowerCase().includes(query.trim().toLowerCase()))
				: memories;
			const sorted = [...filtered].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

			const saveNew = async (form) => {
				const res = editing ? await rpc("update", { id: editing.id, patch: form }) : await rpc("add", { ...form, source: "user" });
				if (res.ok) { setNotice(editing ? "已更新" : "已添加"); setEditing(null); setTab("list"); await refresh(); }
			};
			const remove = async (rec) => {
				if (!confirm("删除这条记忆？\n\n" + renderLine(rec, strategy))) return;
				await rpc("delete", { id: rec.id });
				await refresh();
			};

			const tabs = [["list", "记忆（" + memories.length + "）"], ["add", editing ? "编辑" : "新增"], ["settings", "策略与设置"], ["io", "导入导出"]];

			return h("div", { style: c.page }, [
				h("div", { key: "h", style: c.head }, [
					h("h1", { key: "t", style: c.title }, "记忆"),
					h("span", { key: "s", style: c.sub }, STRATEGIES.find((x) => x.id === strategy)?.name + " · " + (data.settings.inject !== false ? "自动注入开" : "自动注入关")),
					h("span", { key: "sp", style: { flex: 1 } }),
					h("button", { key: "r", style: c.btn, onClick: refresh }, "刷新"),
				]),
				h("div", { key: "tabs", style: c.tabs }, tabs.map(([id, label]) => h("button", { key: id, style: c.tab(tab === id || (id === "add" && editing !== null && tab === "add")), onClick: () => { if (id === "add") setEditing(null); setTab(id); } }, label))),
				notice ? h("div", { key: "n", style: c.msg("ok") }, notice) : null,

				tab === "list" ? h("div", { key: "list" }, [
					h("input", { key: "q", style: { ...c.input, marginBottom: 12 }, placeholder: "搜索记忆…", value: query, onChange: (e) => setQuery(e.target.value) }),
					sorted.length === 0 ? h("div", { key: "e", style: c.empty }, memories.length === 0 ? "还没有记忆。可以在「新增」里手动添加，或让 Agent 调用 memory_write。" : "没有匹配的记忆。") : null,
					...sorted.map((rec) => h(MemoryRow, { key: rec.id, rec, strategy, onEdit: (r) => { setEditing(r); setTab("add"); }, onDelete: remove })),
				]) : null,

				tab === "add" ? h("div", { key: "add" }, [
					h(MemoryForm, { key: editing?.id || "new", strategy, initial: editing, onSubmit: saveNew, onCancel: editing ? () => { setEditing(null); setTab("list"); } : null }),
				]) : null,

				tab === "settings" ? h(SettingsPanel, { key: "set", data, onSaved: (settings) => setData({ ...data, settings }) }) : null,

				tab === "io" ? h(IoPanel, { key: "io", refresh }) : null,
			]);
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
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: "memory",
			}, MemoryPage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: "memory",
				order: 5,
				label: () => "记忆",
			}, MemoryIcon));
		}

		exports.MemoryPage = MemoryPage;
		exports.MemoryIcon = MemoryIcon;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
