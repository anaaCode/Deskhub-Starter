import { listTickets, createTicket, listUsers } from "../api/tickets.js";
import { isAuthenticated } from "../api/auth.js";
import { formatDate } from "../utils/formatDate.js";
import { debounce } from "../utils/debounce.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { validateForm, wireBlurValidation } from "./form.js";

const FIELDS = ["title", "description", "customerName", "customerEmail", "priority", "category"];

const PRIORITY_CLASS = { urgent: "badge-urgent", high: "badge-high", medium: "badge-medium", low: "badge-low" };
const STATUS_CLASS   = { open: "badge-open", "in-progress": "badge-inprogress", resolved: "badge-resolved", closed: "badge-closed" };

let usersCache = {};

// State object — single source of truth for filters/pagination
let state = {
  q: "",
  status: "",
  priority: "",
  assignee: "",
  sort: "createdAt_desc",
  page: 1,
  limit: 10,
  total: 0,
};

/* ── Helpers ── */
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildQueryString(s) {
  const params = new URLSearchParams();
  if (s.q)        params.set("q", s.q);
  if (s.status)   params.set("status", s.status);
  if (s.priority) params.set("priority", s.priority);
  if (s.assignee) params.set("assignedTo", s.assignee);

  const [sortField, sortOrder] = s.sort.split("_");
  params.set("_sort",  sortField);
  params.set("_order", sortOrder);
  params.set("_page",  s.page);
  params.set("_limit", s.limit);
  return "?" + params.toString();
}

/* ── Render helpers ── */
function showState(which) {
  document.getElementById("state-loading").classList.toggle("hidden", which !== "loading");
  document.getElementById("state-error").classList.toggle("hidden",   which !== "error");
  document.getElementById("tickets-table").classList.toggle("hidden", which !== "table");
}

function renderTable(tickets) {
  const tbody = document.getElementById("tickets-body");

  if (!tickets.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No tickets found matching your filters.</td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  tickets.forEach(t => {
    const assignee = t.assignedTo ? (usersCache[t.assignedTo] || `User ${t.assignedTo}`) : "Unassigned";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-id">#${t.id}</td>
      <td class="col-title"><div class="ticket-title"></div></td>
      <td class="col-customer">${escHtml(t.customerName)}</td>
      <td class="col-priority"><span class="badge ${PRIORITY_CLASS[t.priority] || ""}">${t.priority}</span></td>
      <td class="col-status"><span class="badge ${STATUS_CLASS[t.status] || ""}">${t.status}</span></td>
      <td class="col-assignee">${escHtml(assignee)}</td>
      <td class="col-date">${formatDate(t.createdAt)}</td>
    `;
    tr.querySelector(".ticket-title").textContent = t.title;
    tr.addEventListener("click", () => {
      window.location.href = `ticket-detail.html?id=${t.id}`;
    });
    frag.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(frag);
}

function renderPagination() {
  const totalPages = Math.ceil(state.total / state.limit) || 1;
  const info = document.getElementById("pagination-info");
  const pages = document.getElementById("pagination-pages");

  const start = Math.min((state.page - 1) * state.limit + 1, state.total);
  const end   = Math.min(state.page * state.limit, state.total);
  info.textContent = state.total > 0 ? `${start}–${end} of ${state.total} tickets` : "No tickets";

  // Build page buttons
  const btns = [];

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "←";
  prevBtn.disabled = state.page <= 1;
  prevBtn.addEventListener("click", () => { state.page--; refresh(); });
  btns.push(prevBtn);

  // Page numbers (show up to 7)
  const pageNums = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (state.page > 3) pageNums.push("…");
    for (let i = Math.max(2, state.page - 1); i <= Math.min(totalPages - 1, state.page + 1); i++) pageNums.push(i);
    if (state.page < totalPages - 2) pageNums.push("…");
    pageNums.push(totalPages);
  }

  pageNums.forEach(n => {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (n === state.page ? " active" : "");
    btn.textContent = n;
    btn.disabled = n === "…";
    if (typeof n === "number") {
      btn.addEventListener("click", () => { state.page = n; refresh(); });
    }
    btns.push(btn);
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "→";
  nextBtn.disabled = state.page >= totalPages;
  nextBtn.addEventListener("click", () => { state.page++; refresh(); });
  btns.push(nextBtn);

  pages.innerHTML = "";
  btns.forEach(b => pages.appendChild(b));
}

/* ── Core fetch ── */
export async function refresh() {
  showState("loading");
  try {
    const { data: tickets, total } = await listTickets(buildQueryString(state));
    state.total = total || (Array.isArray(tickets) ? tickets.length : 0);
    renderTable(Array.isArray(tickets) ? tickets : [tickets]);
    renderPagination();
    showState("table");
    // Reflect in URL (stretch goal)
    const url = new URL(window.location.href);
    if (state.q) url.searchParams.set("q", state.q); else url.searchParams.delete("q");
    if (state.status) url.searchParams.set("status", state.status); else url.searchParams.delete("status");
    url.searchParams.set("page", state.page);
    history.replaceState(null, "", url);
  } catch (err) {
    console.error(err);
    showState("error");
  }
}

/* ── Load users for assignee dropdown ── */
async function loadUsers() {
  try {
    const { data: users } = await listUsers();
    const list = Array.isArray(users) ? users : [users];
    list.forEach(u => { usersCache[u.id] = u.name; });
    return list;
  } catch {
    return [];
  }
}

/* ── Create ticket modal ── */
function initCreateModal(users) {
  const btn     = document.getElementById("new-ticket-btn");
  const form    = document.getElementById("create-form");
  const submit  = document.getElementById("modal-submit");
  const cancel  = document.getElementById("modal-cancel");
  const close   = document.getElementById("modal-close");

  let cleanupBlur = null;

  btn.addEventListener("click", () => {
    form.reset();
    FIELDS.forEach(f => { const el = document.getElementById(`err-${f}`); if (el) el.textContent = ""; });
    openModal("modal-backdrop");
    if (cleanupBlur) cleanupBlur();
    cleanupBlur = wireBlurValidation(form, FIELDS);
  });

  const closeCreate = () => closeModal("modal-backdrop");
  cancel.addEventListener("click", closeCreate);
  close.addEventListener("click", closeCreate);

  submit.addEventListener("click", async () => {
    const { valid } = validateForm(form, FIELDS);
    if (!valid) return;

    submit.disabled    = true;
    submit.textContent = "Creating…";

    try {
      const body = {
        title:         form.title.value.trim(),
        description:   form.description.value.trim(),
        customerName:  form.customerName.value.trim(),
        customerEmail: form.customerEmail.value.trim(),
        priority:      form.priority.value,
        category:      form.category.value,
        status:        "open",
        assignedTo:    null,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      };
      await createTicket(body);
      closeCreate();
      showToast("Ticket created successfully!", "success");
      state.page = 1;
      await refresh();
    } catch (err) {
      showToast("Failed to create ticket: " + err.message, "error");
    } finally {
      submit.disabled    = false;
      submit.textContent = "Create Ticket";
    }
  });
}

/* ── Filter wiring ── */
function initFilters() {
  // Restore from URL
  const url = new URL(window.location.href);
  if (url.searchParams.get("q"))      { state.q      = url.searchParams.get("q");      document.getElementById("search-input").value    = state.q; }
  if (url.searchParams.get("status")) { state.status  = url.searchParams.get("status"); document.getElementById("filter-status").value   = state.status; }
  if (url.searchParams.get("page"))   { state.page    = parseInt(url.searchParams.get("page")) || 1; }

  const resetPage = () => { state.page = 1; };

  // Search (debounced)
  document.getElementById("search-input").addEventListener("input", debounce((e) => {
    state.q = e.target.value.trim();
    resetPage();
    refresh();
  }, 300));

  // Status
  document.getElementById("filter-status").addEventListener("change", (e) => {
    state.status = e.target.value;
    resetPage();
    refresh();
  });

  // Priority
  document.getElementById("filter-priority").addEventListener("change", (e) => {
    state.priority = e.target.value;
    resetPage();
    refresh();
  });

  // Assignee
  document.getElementById("filter-assignee").addEventListener("change", (e) => {
    state.assignee = e.target.value;
    resetPage();
    refresh();
  });

  // Sort
  document.getElementById("filter-sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    resetPage();
    refresh();
  });
}

/* ── Boot ── */
export async function initTicketsList() {
  if (!isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("retry-btn").addEventListener("click", refresh);

  const users = await loadUsers();

  // Populate assignee dropdown
  const assigneeSel = document.getElementById("filter-assignee");
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    assigneeSel.appendChild(opt);
  });

  initFilters();
  initCreateModal(users);
  await refresh();
}