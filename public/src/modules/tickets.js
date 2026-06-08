/* ═══════════════════════════════════════════════════════════════
   tickets.js  —  list · filters · pagination · new/edit/delete
   ═══════════════════════════════════════════════════════════════ */
import { listTickets, listUsers, createTicket, deleteTicket } from "../api/tickets.js";
import { formatDate }           from "../utils/formatDate.js";
import { debounce }             from "../utils/debounce.js";
import { isAuthenticated, getCurrentUser } from "../api/auth.js";
import { isLocalAvailable }     from "../api/client.js";
import { showToast, openModal, closeModal, confirmDialog } from "./ui.js";
import { validateForm, clearAllErrors, wireBlurValidation, TICKET_RULES } from "./form.js";

let usersCache = [];

const state = {
  search: "", status: "", priority: "", assignee: "",
  sort: "createdAt", order: "desc",
  page: 1, limit: 10, total: 0,
};

/* ── boot ───────────────────────────────────────────────────── */
export async function initTicketsList() {
  if (!isAuthenticated()) { window.location.href = "index.html"; return; }

  const local  = await isLocalAvailable();
  const banner = document.getElementById("demo-banner");
  if (banner && !local) banner.hidden = false;

  const userEl = document.getElementById("topbar-user");
  if (userEl) { const u = getCurrentUser(); if (u) userEl.textContent = u.name; }

  try {
    const raw    = await listUsers();
    usersCache   = Array.isArray(raw) ? raw : (raw?.data ?? []);
    populateAssigneeDropdown();
  } catch (e) { console.warn("Users load failed:", e.message); }

  bindFilters();
  wireNewTicketModal();
  readFiltersFromURL();
  await refresh();
}

/* ── URL state ──────────────────────────────────────────────── */
function readFiltersFromURL() {
  const p = new URLSearchParams(location.search);
  if (p.get("q"))        state.search   = p.get("q");
  if (p.get("status"))   state.status   = p.get("status");
  if (p.get("priority")) state.priority = p.get("priority");
  if (p.get("assignee")) state.assignee = p.get("assignee");
  if (p.get("sort"))     state.sort     = p.get("sort");
  if (p.get("page"))     state.page     = parseInt(p.get("page"), 10) || 1;

  const g = (id) => document.getElementById(id);
  if (g("search-input"))    g("search-input").value    = state.search;
  if (g("status-filter"))   g("status-filter").value   = state.status;
  if (g("priority-filter")) g("priority-filter").value = state.priority;
  if (g("assignee-filter")) g("assignee-filter").value = state.assignee;
  if (g("sort-select"))     g("sort-select").value     = state.sort;
}

function pushURL() {
  const p = new URLSearchParams();
  if (state.search)               p.set("q",        state.search);
  if (state.status)               p.set("status",   state.status);
  if (state.priority)             p.set("priority", state.priority);
  if (state.assignee)             p.set("assignee", state.assignee);
  if (state.sort !== "createdAt") p.set("sort",     state.sort);
  if (state.page > 1)             p.set("page",     state.page);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

/* ── dropdowns ──────────────────────────────────────────────── */
function populateAssigneeDropdown() {
  const sel = document.getElementById("assignee-filter");
  if (!sel) return;
  usersCache.forEach(u => {
    const o = document.createElement("option");
    o.value = u.id; o.textContent = u.name;
    sel.appendChild(o);
  });
}

/* ── filter events ──────────────────────────────────────────── */
function bindFilters() {
  const dbRefresh = debounce(resetAndRefresh, 300);
  const g = (id) => document.getElementById(id);

  g("search-input")?.addEventListener("input",  (e) => { state.search   = e.target.value.trim(); dbRefresh(); });
  g("status-filter")?.addEventListener("change",(e) => { state.status   = e.target.value; resetAndRefresh(); });
  g("priority-filter")?.addEventListener("change",(e)=>{ state.priority = e.target.value; resetAndRefresh(); });
  g("assignee-filter")?.addEventListener("change",(e)=>{ state.assignee = e.target.value; resetAndRefresh(); });
  g("sort-select")?.addEventListener("change",  (e) => { state.sort     = e.target.value; resetAndRefresh(); });
  g("reset-filters")?.addEventListener("click", resetFilters);
}

function resetFilters() {
  state.search = ""; state.status = ""; state.priority = "";
  state.assignee = ""; state.sort = "createdAt"; state.order = "desc"; state.page = 1;
  const g = (id) => document.getElementById(id);
  if (g("search-input"))    g("search-input").value    = "";
  if (g("status-filter"))   g("status-filter").value   = "";
  if (g("priority-filter")) g("priority-filter").value = "";
  if (g("assignee-filter")) g("assignee-filter").value = "";
  if (g("sort-select"))     g("sort-select").value     = "createdAt";
  refresh();
}

function resetAndRefresh() { state.page = 1; refresh(); }

/* ── New Ticket modal ───────────────────────────────────────── */
function wireNewTicketModal() {
  const form      = document.getElementById("create-form");
  if (!form) return;

  document.getElementById("new-ticket-btn")?.addEventListener("click", () => {
    form.reset();
    clearAllErrors(TICKET_RULES);
    openModal("new-ticket-backdrop");
  });

  document.getElementById("new-modal-close")?.addEventListener("click",  () => closeModal("new-ticket-backdrop"));
  document.getElementById("new-modal-cancel")?.addEventListener("click", () => closeModal("new-ticket-backdrop"));

  wireBlurValidation(form, TICKET_RULES);

  document.getElementById("new-modal-submit")?.addEventListener("click", async () => {
    if (!validateForm(form, TICKET_RULES)) return;

    const btn = document.getElementById("new-modal-submit");
    btn.disabled = true; btn.textContent = "Creating…";
    try {
      await createTicket({
        title:         form.elements["title"].value.trim(),
        description:   form.elements["description"].value.trim(),
        customerName:  form.elements["customerName"].value.trim(),
        customerEmail: form.elements["customerEmail"].value.trim(),
        priority:      form.elements["priority"].value,
        category:      form.elements["category"].value,
        status:        "open",
        assignedTo:    null,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      });
      closeModal("new-ticket-backdrop");
      showToast("Ticket created!", "success");
      state.page = 1;
      await refresh();
    } catch (err) {
      showToast("Create failed: " + err.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Create Ticket";
    }
  });
}

/* ── refresh + render ───────────────────────────────────────── */
export async function refresh() {
  showLoading(true);
  hideError();

  const params = {
    _page: state.page, _limit: state.limit,
    _sort: state.sort, _order: state.order,
  };
  if (state.search)   params.q          = state.search;
  if (state.status)   params.status     = state.status;
  if (state.priority) params.priority   = state.priority;
  if (state.assignee) params.assignedTo = state.assignee;

  try {
    const { data, total } = await listTickets(params);
    state.total = total;
    renderTable(data);
    renderPagination();
    pushURL();
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function renderTable(tickets) {
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;

  if (!tickets?.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No tickets found. <button class="link-btn" id="clear-search">Clear filters</button></td></tr>`;
    document.getElementById("clear-search")?.addEventListener("click", resetFilters);
    updateCount(0);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const t of tickets) {
    const tr       = document.createElement("tr");
    tr.className   = "ticket-row";
    const assignee = usersCache.find(u => String(u.id) === String(t.assignedTo));

    tr.innerHTML = `
      <td class="col-id">#${t.id}</td>
      <td class="col-title"><a href="ticket-detail.html?id=${t.id}" class="ticket-link"></a></td>
      <td class="col-customer"></td>
      <td class="col-priority"><span class="badge priority-${t.priority}"></span></td>
      <td class="col-status"><span class="badge status-${t.status}"></span></td>
      <td class="col-category"><span class="badge category-tag"></span></td>
      <td class="col-assignee"></td>
      <td class="col-date"></td>
      <td class="col-actions">
        <div class="row-actions">
          <a href="ticket-detail.html?id=${t.id}" class="row-action-btn" title="View details">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </a>
          <a href="ticket-detail.html?id=${t.id}" class="row-action-btn row-action-edit" title="Edit ticket">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </a>
          <button class="row-action-btn row-action-delete" title="Delete ticket" data-id="${t.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    `;

    // XSS-safe textContent fills
    tr.querySelector(".ticket-link").textContent              = t.title;
    tr.querySelector(".col-customer").textContent             = t.customerName;
    tr.querySelector(".priority-" + t.priority).textContent  = t.priority;
    tr.querySelector(".status-"   + t.status).textContent    = t.status.replace("-", " ");
    tr.querySelector(".category-tag").textContent             = t.category;
    tr.querySelector(".col-assignee").textContent             = assignee ? assignee.name : "Unassigned";
    tr.querySelector(".col-date").textContent                 = formatDate(t.createdAt);

    // Inline delete
    tr.querySelector(".row-action-delete").addEventListener("click", async (e) => {
      e.preventDefault();
      const id  = e.currentTarget.dataset.id;
      const yes = await confirmDialog("Delete Ticket",
        `Delete ticket #${id} "${t.title}"? This cannot be undone.`, true);
      if (!yes) return;
      try {
        await deleteTicket(id);
        showToast("Ticket deleted", "success");
        await refresh();
      } catch (err) {
        showToast("Delete failed: " + err.message, "error");
      }
    });

    frag.appendChild(tr);
  }

  tbody.innerHTML = "";
  tbody.appendChild(frag);
  updateCount(state.total);
}

/* ── pagination ─────────────────────────────────────────────── */
function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;

  const totalPages = Math.ceil(state.total / state.limit) || 1;
  const cur        = state.page;

  let html = `<div class="pagination-info">Page ${cur} of ${totalPages} · ${state.total} tickets</div><div class="pagination-controls">`;
  html += `<button class="page-btn" id="prev-btn" ${cur <= 1 ? "disabled" : ""}>‹ Prev</button>`;
  for (const p of pageRange(cur, totalPages)) {
    html += p === "…"
      ? `<span class="page-ellipsis">…</span>`
      : `<button class="page-btn ${p === cur ? "active" : ""}" data-page="${p}">${p}</button>`;
  }
  html += `<button class="page-btn" id="next-btn" ${cur >= totalPages ? "disabled" : ""}>Next ›</button></div>`;
  container.innerHTML = html;

  document.getElementById("prev-btn")?.addEventListener("click", () => { state.page--; refresh(); });
  document.getElementById("next-btn")?.addEventListener("click", () => { state.page++; refresh(); });
  container.querySelectorAll("[data-page]").forEach(btn =>
    btn.addEventListener("click", () => { state.page = +btn.dataset.page; refresh(); }));
}

function pageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)          return [1,2,3,4,5,"…",total];
  if (cur >= total - 3)  return [1,"…",total-4,total-3,total-2,total-1,total];
  return [1,"…",cur-1,cur,cur+1,"…",total];
}

/* ── tiny UI helpers ────────────────────────────────────────── */
function updateCount(n) {
  const el = document.getElementById("tickets-count");
  if (el) el.textContent = `${n} ticket${n !== 1 ? "s" : ""}`;
}
function showLoading(on) {
  const el = document.getElementById("loading-state");
  if (el) el.hidden = !on;
  const tb = document.getElementById("tickets-tbody");
  if (tb) tb.style.opacity = on ? "0.4" : "1";
}
function hideError() {
  const el = document.getElementById("error-state");
  if (el) el.hidden = true;
}
function showError(msg) {
  const el = document.getElementById("error-state");
  if (!el) return;
  el.hidden = false;
  const m = el.querySelector(".error-msg-text");
  if (m) m.textContent = msg;
  const r = el.querySelector("#retry-btn");
  if (r) r.onclick = refresh;
}
