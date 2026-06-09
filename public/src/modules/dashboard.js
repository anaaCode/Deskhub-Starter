/* ═══════════════════════════════════════════════════════════════
   dashboard.js  —  stat cards · recent 5 tickets
   ═══════════════════════════════════════════════════════════════ */
import { listTickets }    from "../api/tickets.js";
import { getCurrentUser } from "../api/auth.js";
import { formatDate }     from "../utils/formatDate.js";
import {
  showBootstrapLoader, hideBootstrapLoader,
  initTheme, toggleTheme,
  initKeyboardShortcuts,
} from "./ui.js";

const PRIORITY_CLS = { urgent:"priority-urgent", high:"priority-high", medium:"priority-medium", low:"priority-low" };
const STATUS_CLS   = { open:"status-open", "in-progress":"status-in-progress", resolved:"status-resolved", closed:"status-closed" };

async function fetchCount(params) {
  try {
    const { total, data } = await listTickets({ ...params, _limit: 1 });
    return total ?? (Array.isArray(data) ? data.length : 0);
  } catch { return "—"; }
}

export async function initDashboard() {
  initTheme();
  showBootstrapLoader();

  const user = getCurrentUser();
  const greeting = document.getElementById("user-greeting");
  if (greeting && user) greeting.textContent = `Welcome back, ${user.name}!`;

  const topbarUser = document.getElementById("topbar-user");
  if (topbarUser && user) topbarUser.textContent = user.name;

  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);

  initKeyboardShortcuts({});

  // 4 parallel stat fetches
  const [total, open, inProgress, resolved] = await Promise.all([
    fetchCount({}),
    fetchCount({ status: "open" }),
    fetchCount({ status: "in-progress" }),
    fetchCount({ status: "resolved" }),
  ]);

  document.getElementById("stat-total").textContent      = total;
  document.getElementById("stat-open").textContent       = open;
  document.getElementById("stat-inprogress").textContent = inProgress;
  document.getElementById("stat-resolved").textContent   = resolved;

  const loadingEl = document.getElementById("recent-loading");
  const errorEl   = document.getElementById("recent-error");
  const tableWrap = document.getElementById("recent-table-wrap");
  const tbody     = document.getElementById("recent-tbody");

  try {
    const { data: tickets } = await listTickets({ _sort: "createdAt", _order: "desc", _limit: 5 });
    const list = Array.isArray(tickets) ? tickets : [];

    loadingEl.hidden = true;

    if (!list.length) {
      tableWrap.style.display = "block";
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No tickets yet.</td></tr>`;
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach(t => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td class="col-id">#${t.id}</td>
        <td class="col-title"><span class="ticket-title-cell"></span></td>
        <td class="col-priority"><span class="badge ${PRIORITY_CLS[t.priority] || ""}">${t.priority}</span></td>
        <td class="col-status"><span class="badge ${STATUS_CLS[t.status] || ""}">${t.status.replace("-"," ")}</span></td>
        <td class="col-date">${formatDate(t.createdAt)}</td>
      `;
      tr.querySelector(".ticket-title-cell").textContent = t.title;
      tr.addEventListener("click", () => { window.location.href = `ticket-detail.html?id=${t.id}`; });
      frag.appendChild(tr);
    });

    tbody.innerHTML = "";
    tbody.appendChild(frag);
    tableWrap.style.display = "block";
  } catch (err) {
    console.error(err);
    loadingEl.hidden = true;
    errorEl.style.display = "block";
  } finally {
    setTimeout(hideBootstrapLoader, 200);
  }
}
