(() => {
  "use strict";

  const state = {
    tasks: [],
    metaCustomers: [],
    metaAssignees: [],
    metaTags: [],
    metaStatuses: [],
    activeTab: "list",
    sort: { key: "due_date", dir: "asc" },
    editingId: null,
  };

  const TAG_COLORS = ["#4f6df5", "#22a366", "#f0973a", "#e5484d", "#9757d7", "#0aa6a6", "#c2985f", "#5b7bd6"];

  // ---------- Utilities ----------

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function tagColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return TAG_COLORS[hash % TAG_COLORS.length];
  }

  function tagPillsHtml(tags) {
    return tags.map((t) => `<span class="tag-pill" style="background:${tagColor(t)}">${escapeHtml(t)}</span>`).join("");
  }

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(s + "T00:00:00");
    return isNaN(d) ? null : d;
  }

  function todayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysDiff(date) {
    const t = todayDate();
    return Math.round((date - t) / 86400000);
  }

  function formatDate(s) {
    if (!s) return "";
    const d = parseDate(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function dueClass(task) {
    if (!task.due_date) return "none";
    if (task.status === "完了") return "";
    const diff = daysDiff(parseDate(task.due_date));
    if (diff < 0) return "overdue";
    if (diff <= 3) return "soon";
    return "";
  }

  function dueLabelHtml(task) {
    if (!task.due_date) return `<span class="due-text none">未設定</span>`;
    const cls = dueClass(task);
    const diff = daysDiff(parseDate(task.due_date));
    let suffix = "";
    if (task.status !== "完了") {
      if (diff < 0) suffix = `（${-diff}日超過）`;
      else if (diff === 0) suffix = "（本日）";
    }
    return `<span class="due-text ${cls}">${formatDate(task.due_date)}${suffix}</span>`;
  }

  function progressBarHtml(p) {
    return `<span class="progress-bar"><span class="progress-bar-fill ${p >= 100 ? "full" : ""}" style="width:${p}%"></span></span>${p}%`;
  }

  function statusBadgeHtml(s) {
    return `<span class="status-badge" data-status="${escapeHtml(s)}">${escapeHtml(s)}</span>`;
  }

  function showToast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  // ---------- API ----------

  const API = {
    async listTasks(params = {}) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const res = await fetch(`/api/tasks?${qs.toString()}`);
      if (!res.ok) throw new Error("タスクの取得に失敗しました");
      return res.json();
    },
    async createTask(data) {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("タスクの作成に失敗しました");
      return res.json();
    },
    async updateTask(id, data) {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("タスクの更新に失敗しました");
      return res.json();
    },
    async updateStatus(id, status) {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("ステータスの更新に失敗しました");
      return res.json();
    },
    async deleteTask(id) {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("タスクの削除に失敗しました");
    },
    async meta(kind) {
      const res = await fetch(`/api/meta/${kind}`);
      if (!res.ok) throw new Error("メタ情報の取得に失敗しました");
      return res.json();
    },
  };

  // ---------- Data loading ----------

  async function loadMeta() {
    const [customers, assignees, tags, statuses] = await Promise.all([
      API.meta("customers"), API.meta("assignees"), API.meta("tags"), API.meta("statuses"),
    ]);
    state.metaCustomers = customers;
    state.metaAssignees = assignees;
    state.metaTags = tags;
    state.metaStatuses = statuses;

    fillSelect($("#filter-customer"), customers, "顧客名: すべて");
    fillSelect($("#filter-assignee"), assignees, "担当者: すべて");
    fillSelect($("#filter-tag"), tags, "タグ: すべて");
    fillSelect($("#filter-status"), statuses, "ステータス: すべて");

    fillDatalist($("#dl-customers"), customers);
    fillDatalist($("#dl-assignees"), assignees);
    fillDatalist($("#dl-tags"), tags);

    const statusSelect = $("#f-status");
    statusSelect.innerHTML = statuses.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  }

  function fillSelect(sel, items, placeholder) {
    const current = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>` + items.map((i) => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join("");
    if (items.includes(current)) sel.value = current;
  }

  function fillDatalist(dl, items) {
    dl.innerHTML = items.map((i) => `<option value="${escapeHtml(i)}">`).join("");
  }

  function currentFilters() {
    return {
      q: $("#filter-q").value.trim(),
      customer: $("#filter-customer").value,
      assignee: $("#filter-assignee").value,
      tag: $("#filter-tag").value,
      status: $("#filter-status").value,
    };
  }

  async function reload() {
    state.tasks = await API.listTasks(currentFilters());
    renderActiveTab();
  }

  async function reloadAll() {
    await loadMeta();
    await reload();
  }

  // ---------- Tabs ----------

  function setActiveTab(tab) {
    state.activeTab = tab;
    $all(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $all(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${tab}`));
    renderActiveTab();
  }

  function renderActiveTab() {
    switch (state.activeTab) {
      case "list": renderList(); break;
      case "kanban": renderKanban(); break;
      case "due": renderDue(); break;
      case "customer": renderGroupBoard("customer-board", "customer", "顧客未設定"); break;
      case "assignee": renderGroupBoard("assignee-board", "assignee", "担当者未設定"); break;
    }
  }

  // ---------- タスクリスト ----------

  function sortedTasks() {
    const { key, dir } = state.sort;
    const arr = [...state.tasks];
    arr.sort((a, b) => {
      let va, vb;
      if (key === "tags") { va = a.tags.join(","); vb = b.tags.join(","); }
      else { va = a[key]; vb = b[key]; }
      if (va === null || va === undefined || va === "") va = dir === "asc" ? "￿" : "";
      if (vb === null || vb === undefined || vb === "") vb = dir === "asc" ? "￿" : "";
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }

  function renderList() {
    const tasks = sortedTasks();
    const body = $("#task-list-body");
    body.innerHTML = tasks.map((t) => `
      <tr data-id="${t.id}">
        <td>${escapeHtml(t.name)}</td>
        <td>${tagPillsHtml(t.tags) || "—"}</td>
        <td>${escapeHtml(t.customer) || "—"}</td>
        <td>${escapeHtml(t.assignee) || "—"}</td>
        <td>${dueLabelHtml(t)}</td>
        <td>${progressBarHtml(t.progress)}</td>
        <td>${statusBadgeHtml(t.status)}</td>
        <td class="col-actions">
          <button class="icon-btn" data-action="edit" data-id="${t.id}">編集</button>
          <button class="icon-btn" data-action="delete" data-id="${t.id}">削除</button>
        </td>
      </tr>
    `).join("");
    $("#list-empty").hidden = tasks.length > 0;

    $all("th[data-sort]").forEach((th) => {
      th.textContent = th.textContent.replace(/ ▲| ▼/, "");
      if (th.dataset.sort === state.sort.key) th.textContent += state.sort.dir === "asc" ? " ▲" : " ▼";
    });
  }

  // ---------- カンバンボード ----------

  function renderKanban() {
    const board = $("#kanban-board");
    board.innerHTML = state.metaStatuses.map((status) => {
      const tasks = state.tasks.filter((t) => t.status === status);
      return `
        <div class="kanban-col" data-status="${escapeHtml(status)}">
          <div class="kanban-col-header">
            <span>${escapeHtml(status)}</span>
            <span class="kanban-col-count">${tasks.length}</span>
          </div>
          <div class="kanban-cards">
            ${tasks.map((t) => `
              <div class="kanban-card" draggable="true" data-id="${t.id}">
                <div class="kanban-card-title">${escapeHtml(t.name)}</div>
                <div class="kanban-card-meta">${escapeHtml(t.customer) || "顧客未設定"} ・ ${escapeHtml(t.assignee) || "担当者未設定"}</div>
                <div class="kanban-card-meta">${dueLabelHtml(t)}</div>
                <div>${progressBarHtml(t.progress)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    $all(".kanban-card", board).forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.dataset.id);
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", () => openModal(Number(card.dataset.id)));
    });

    $all(".kanban-col", board).forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
      col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const id = Number(e.dataTransfer.getData("text/plain"));
        const newStatus = col.dataset.status;
        const task = state.tasks.find((t) => t.id === id);
        if (!task || task.status === newStatus) return;
        try {
          await API.updateStatus(id, newStatus);
          await reload();
          showToast("ステータスを更新しました");
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // ---------- 期日管理 ----------

  function renderDue() {
    const groups = [
      { key: "overdue", label: "期限超過", dot: "#e5484d" },
      { key: "today", label: "本日", dot: "#f0973a" },
      { key: "week", label: "今週中（7日以内）", dot: "#4f6df5" },
      { key: "later", label: "それ以降", dot: "#22a366" },
      { key: "none", label: "期日未設定", dot: "#9aa1b2" },
      { key: "done", label: "完了済み", dot: "#22a366" },
    ];
    const buckets = { overdue: [], today: [], week: [], later: [], none: [], done: [] };

    state.tasks.forEach((t) => {
      if (t.status === "完了") { buckets.done.push(t); return; }
      if (!t.due_date) { buckets.none.push(t); return; }
      const diff = daysDiff(parseDate(t.due_date));
      if (diff < 0) buckets.overdue.push(t);
      else if (diff === 0) buckets.today.push(t);
      else if (diff <= 7) buckets.week.push(t);
      else buckets.later.push(t);
    });

    Object.values(buckets).forEach((arr) => arr.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")));

    const board = $("#due-board");
    board.innerHTML = groups.map((g) => {
      const items = buckets[g.key];
      if (items.length === 0) return "";
      return `
        <div class="due-group">
          <div class="due-group-header"><span class="dot" style="background:${g.dot}"></span>${g.label}（${items.length}件）</div>
          <div class="due-group-body">
            ${items.map((t) => `
              <div class="due-row" data-id="${t.id}">
                <span class="r-name">${escapeHtml(t.name)}</span>
                <span class="r-customer">${escapeHtml(t.customer) || "—"}</span>
                <span class="r-assignee">${escapeHtml(t.assignee) || "—"}</span>
                <span class="r-due">${dueLabelHtml(t)}</span>
                <span>${progressBarHtml(t.progress)}</span>
                ${statusBadgeHtml(t.status)}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("") || `<p class="empty-msg">該当するタスクがありません。</p>`;

    $all(".due-row", board).forEach((row) => {
      row.addEventListener("click", () => openModal(Number(row.dataset.id)));
    });
  }

  // ---------- 顧客別 / 担当者別ビュー ----------

  function renderGroupBoard(elId, field, emptyLabel) {
    const map = new Map();
    state.tasks.forEach((t) => {
      const key = t[field] || emptyLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });

    const groups = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);

    const board = $(`#${elId}`);
    if (groups.length === 0) {
      board.innerHTML = `<p class="empty-msg">該当するタスクがありません。</p>`;
      return;
    }

    board.innerHTML = groups.map(([name, tasks]) => {
      const avgProgress = Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length);
      const overdue = tasks.filter((t) => t.status !== "完了" && t.due_date && daysDiff(parseDate(t.due_date)) < 0).length;
      const done = tasks.filter((t) => t.status === "完了").length;
      const sorted = [...tasks].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
      return `
        <div class="group-card">
          <div class="group-card-title">${escapeHtml(name)}</div>
          <div class="group-stats">
            <span>タスク数: <b>${tasks.length}</b></span>
            <span>平均進捗率: <b>${avgProgress}%</b></span>
            <span>完了: <b>${done}</b></span>
            <span>期限超過: <b style="${overdue > 0 ? "color:#e5484d" : ""}">${overdue}</b></span>
          </div>
          <div class="group-tasks">
            ${sorted.map((t) => `
              <div class="group-task-row" data-id="${t.id}">
                <span class="r-name">${escapeHtml(t.name)}</span>
                <span class="r-due">${dueLabelHtml(t)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    $all(".group-task-row", board).forEach((row) => {
      row.addEventListener("click", () => openModal(Number(row.dataset.id)));
    });
  }

  // ---------- モーダル (新規作成・編集) ----------

  function openModal(id = null) {
    state.editingId = id;
    const form = $("#task-form");
    form.reset();
    $("#f-progress-val").textContent = "0";
    $("#btn-delete-task").hidden = id === null;

    if (id !== null) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      $("#modal-title").textContent = "タスクを編集";
      $("#f-id").value = task.id;
      $("#f-name").value = task.name;
      $("#f-customer").value = task.customer;
      $("#f-assignee").value = task.assignee;
      $("#f-due-date").value = task.due_date || "";
      $("#f-status").value = task.status;
      $("#f-tags").value = task.tags.join(", ");
      $("#f-progress").value = task.progress;
      $("#f-progress-val").textContent = task.progress;
      $("#f-memo").value = task.memo || "";
    } else {
      $("#modal-title").textContent = "新規タスク";
      $("#f-id").value = "";
      $("#f-status").value = state.metaStatuses[0] || "";
    }
    $("#task-modal").hidden = false;
  }

  function closeModal() {
    $("#task-modal").hidden = true;
    state.editingId = null;
  }

  function collectFormData() {
    const tags = $("#f-tags").value.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      name: $("#f-name").value.trim(),
      customer: $("#f-customer").value.trim(),
      assignee: $("#f-assignee").value.trim(),
      due_date: $("#f-due-date").value || null,
      status: $("#f-status").value,
      progress: Number($("#f-progress").value),
      memo: $("#f-memo").value.trim(),
      tags,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const data = collectFormData();
    if (!data.name) { showToast("タスク名を入力してください"); return; }
    try {
      const id = $("#f-id").value;
      if (id) await API.updateTask(id, data);
      else await API.createTask(data);
      closeModal();
      await reloadAll();
      showToast("保存しました");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDelete() {
    const id = $("#f-id").value;
    if (!id) return;
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      await API.deleteTask(id);
      closeModal();
      await reloadAll();
      showToast("削除しました");
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---------- イベント初期化 ----------

  function initEvents() {
    $all(".tab-btn").forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));

    $("#btn-new-task").addEventListener("click", () => openModal(null));
    $("#btn-modal-close").addEventListener("click", closeModal);
    $("#btn-cancel").addEventListener("click", closeModal);
    $("#task-modal").addEventListener("click", (e) => { if (e.target.id === "task-modal") closeModal(); });
    $("#task-form").addEventListener("submit", handleSubmit);
    $("#btn-delete-task").addEventListener("click", handleDelete);
    $("#f-progress").addEventListener("input", (e) => { $("#f-progress-val").textContent = e.target.value; });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#task-modal").hidden) closeModal();
    });

    ["#filter-q", "#filter-customer", "#filter-assignee", "#filter-tag", "#filter-status"].forEach((sel) => {
      const el = $(sel);
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", debounce(reload, 250));
    });
    $("#btn-clear-filter").addEventListener("click", () => {
      $("#filter-q").value = "";
      $("#filter-customer").value = "";
      $("#filter-assignee").value = "";
      $("#filter-tag").value = "";
      $("#filter-status").value = "";
      reload();
    });

    $("#task-list-body").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (btn) {
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === "edit") openModal(id);
        else if (btn.dataset.action === "delete") deleteFromList(id);
        return;
      }
      const row = e.target.closest("tr[data-id]");
      if (row) openModal(Number(row.dataset.id));
    });

    $all("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sort.key === key) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        else { state.sort.key = key; state.sort.dir = "asc"; }
        renderList();
      });
    });
  }

  async function deleteFromList(id) {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      await API.deleteTask(id);
      await reloadAll();
      showToast("削除しました");
    } catch (err) {
      showToast(err.message);
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ---------- 起動 ----------

  async function init() {
    initEvents();
    try {
      await reloadAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
