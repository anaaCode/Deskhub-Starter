import { listTickets, listUsers } from "../api/tickets.js";
import { formatDate } from "../utils/formatDate.js";
import { debounce } from "../utils/debounce.js";
import { isAuthenticated } from "../api/auth.js";
import { getCurrentUser } from "../api/auth.js";

let usersCache = [];

const state = {
  search:   "",
  status:   "",
  priority: "",
  assignee: "",
  sort:     "createdAt",
  order:    "desc",
  page:     1,
  limit:    10,
  total:    0,
};

export async function initTicketsList() {
  if (!isAuthenticated()) { window.location.href = "index.html"; return; }

  // Show logged-in user
  const userEl = document.getElementById("topbar-user");
  if (userEl) {
    const user = getCurrentUser();
    if (user) userEl.textContent = user.name;
  }

  try {
    usersCache = await listUsers();
    populateAssigneeDropdown();
  } catch (e) {
    console.warn("Could not load users:", e.message);
  }

  bindFilters();
  readFiltersFromURL();
  await refresh();
}

function readFiltersFromURL() {
  const p = new URLSearchParams(location.search);
  if (p.get("q"))        state.search   = p.get("q");
  if (p.get("status"))   state.status   = p.get("status");
  if (p.get("priority")) state.priority = p.get("priority");
  if (p.get("assignee")) state.assignee = p.get("assignee");
  if (p.get("sort"))     state.sort     = p.get("sort");
  if (p.get("page"))     state.page     = parseInt(p.get("page"), 10) || 1;

  const el = id => document.getElementById(id);
  if (el("search-input"))    el("search-input").value    = state.search;
  if (el("status-filter"))   el("status-filter").value   = state.status;
  if (el("priority-filter")) el("priority-filter").value = state.priority;
  if (el("assignee-filter")) el("assignee-filter").value = state.assignee;
  if (el("sort-select"))     el("sort-select").value     = state.sort;
}

function pushURL() {
  const p = new URLSearchParams();
  if (state.search)              p.set("q",        state.search);
  if (state.status)              p.set("status",   state.status);
  if (state.priority)            p.set("priority", state.priority);
  if (state.assignee)            p.set("assignee", state.assignee);
  if (state.sort !== "createdAt") p.set("sort",   state.sort);
  if (state.page > 1)            p.set("page",    state.page);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function populateAssigneeDropdown() {
  const sel = document.getElementById("assignee-filter");
  if (!sel) return;
  usersCache.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    sel.appendChild(opt);
  });
}

function bindFilters() {
  const debouncedRefresh = debounce(resetAndRefresh, 300);

  const search = document.getElementById("search-input");
  if (search) search.addEventListener("input", e => { state.search = e.target.value.trim(); debouncedRefresh(); });

  const status = document.getElementById("status-filter");
  if (status) status.addEventListener("change", e => { state.status = e.target.value; resetAndRefresh(); });

  const priority = document.getElementById("priority-filter");
  if (priority) priority.addEventListener("change", e => { state.priority = e.target.value; resetAndRefresh(); });

  const assignee = document.getElementById("assignee-filter");
  if (assignee) assignee.addEventListener("change", e => { state.assignee = e.target.value; resetAndRefresh(); });

  const sort = document.getElementById("sort-select");
  if (sort) sort.addEventListener("change", e => { state.sort = e.target.value; resetAndRefresh(); });

  const resetBtn = document.getElementById("reset-filters");
  if (resetBtn) resetBtn.addEventListener("click", resetFilters);
}

function resetFilters() {
  state.search   = "";
  state.status   = "";
  state.priority = "";
  state.assignee = "";
  state.sort     = "createdAt";
  state.order    = "desc";
  state.page     = 1;

  const el = id => document.getElementById(id);
  if (el("search-input"))    el("search-input").value    = "";
  if (el("status-filter"))   el("status-filter").value   = "";
  if (el("priority-filter")) el("priority-filter").value = "";
  if (el("assignee-filter")) el("assignee-filter").value = "";
  if (el("sort-select"))     el("sort-select").value     = "createdAt";

  refresh();
}

function resetAndRefresh() {
  state.page = 1;
  refresh();
}

export async function refresh() {
  showLoading(true);
  hideError();

  const params = {
    _page:  state.page,
    _limit: state.limit,
    _sort:  state.sort,
    _order: state.order,
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

  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No tickets found. <button class="link-btn" id="clear-search">Clear filters</button></td></tr>`;
    document.getElementById("clear-search")?.addEventListener("click", resetFilters);
    updateCount(0);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const t of tickets) {
    const tr = document.createElement("tr");
    tr.className = "ticket-row";

    const assignee = usersCache.find(u => u.id === t.assignedTo);

    // Build row safely via textContent (XSS protection)
    tr.innerHTML = `
      <td class="col-id">#${t.id}</td>
      <td class="col-title"><a href="ticket-detail.html?id=${t.id}" class="ticket-link"></a></td>
      <td class="col-customer"></td>
      <td class="col-priority"><span class="badge priority-${t.priority}"></span></td>
      <td class="col-status"><span class="badge status-${t.status}"></span></td>
      <td class="col-category"><span class="badge category-tag"></span></td>
      <td class="col-assignee"></td>
      <td class="col-date"></td>
    `;

    tr.querySelector(".ticket-link").textContent          = t.title;
    tr.querySelector(".col-customer").textContent         = t.customerName;
    tr.querySelector(".priority-" + t.priority).textContent = t.priority;
    tr.querySelector(".status-" + t.status).textContent    = t.status.replace("-", " ");
    tr.querySelector(".category-tag").textContent          = t.category;
    tr.querySelector(".col-assignee").textContent          = assignee ? assignee.name : "Unassigned";
    tr.querySelector(".col-date").textContent              = formatDate(t.createdAt);

    fragment.appendChild(tr);
  }

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
  updateCount(state.total);
}

function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;

  const totalPages = Math.ceil(state.total / state.limit) || 1;
  const current    = state.page;

  let html = `<div class="pagination-info">Page ${current} of ${totalPages}&nbsp;·&nbsp;${state.total} tickets</div><div class="pagination-controls">`;
  html += `<button class="page-btn" id="prev-btn" ${current <= 1 ? "disabled" : ""}>‹ Prev</button>`;

  for (const p of pageRange(current, totalPages)) {
    if (p === "…") {
      html += `<span class="page-ellipsis">…</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
  }

  html += `<button class="page-btn" id="next-btn" ${current >= totalPages ? "disabled" : ""}>Next ›</button></div>`;
  container.innerHTML = html;

  document.getElementById("prev-btn")?.addEventListener("click", () => { state.page--; refresh(); });
  document.getElementById("next-btn")?.addEventListener("click", () => { state.page++; refresh(); });
  container.querySelectorAll("[data-page]").forEach(btn =>
    btn.addEventListener("click", () => { state.page = parseInt(btn.dataset.page, 10); refresh(); })
  );
}

function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function updateCount(n) {
  const el = document.getElementById("tickets-count");
  if (el) el.textContent = `${n} ticket${n !== 1 ? "s" : ""}`;
}

function showLoading(on) {
  const el = document.getElementById("loading-state");
  if (el) el.hidden = !on;
  const tbody = document.getElementById("tickets-tbody");
  if (tbody) tbody.style.opacity = on ? "0.4" : "1";
}

function hideError() {
  const el = document.getElementById("error-state");
  if (el) el.hidden = true;
}

function showError(msg) {
  const el = document.getElementById("error-state");
  if (!el) return;
  el.hidden = false;
  const msgEl = el.querySelector(".error-msg-text");
  if (msgEl) msgEl.textContent = msg;
  const retry = el.querySelector("#retry-btn");
  if (retry) retry.onclick = refresh;
}
