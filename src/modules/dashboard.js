import { listTickets } from "../api/tickets.js";
import { getCurrentUser } from "../api/auth.js";
import { formatDate } from "../utils/formatDate.js";

const PRIORITY_CLASS = { urgent: "badge-urgent", high: "badge-high", medium: "badge-medium", low: "badge-low" };
const STATUS_CLASS   = { open: "badge-open", "in-progress": "badge-inprogress", resolved: "badge-resolved", closed: "badge-closed" };

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function fetchCount(params) {
  try {
    const { total, data } = await listTickets(params);
    // total comes from X-Total-Count; fallback to array length
    return total || (Array.isArray(data) ? data.length : 0);
  } catch {
    return "—";
  }
}

export async function initDashboard() {
  // Show welcome greeting
  const user = getCurrentUser();
  const greeting = document.getElementById("user-greeting");
  if (greeting && user) greeting.textContent = `Welcome back, ${user.name}!`;

  // Parallel stat fetches
  const [total, open, inProgress, resolved] = await Promise.all([
    fetchCount("?_limit=1"),
    fetchCount("?status=open&_limit=1"),
    fetchCount("?status=in-progress&_limit=1"),
    fetchCount("?status=resolved&_limit=1"),
  ]);

  document.getElementById("stat-total").textContent      = total;
  document.getElementById("stat-open").textContent       = open;
  document.getElementById("stat-inprogress").textContent = inProgress;
  document.getElementById("stat-resolved").textContent   = resolved;

  // Recent 5 tickets
  const loadingEl   = document.getElementById("recent-loading");
  const errorEl     = document.getElementById("recent-error");
  const tableWrap   = document.getElementById("recent-table-wrap");
  const tbody       = document.getElementById("recent-tbody");

  try {
    const { data: tickets } = await listTickets("?_sort=createdAt&_order=desc&_limit=5");
    const list = Array.isArray(tickets) ? tickets : [];

    loadingEl.classList.add("hidden");

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
        <td class="col-priority"><span class="badge ${PRIORITY_CLASS[t.priority] || ""}">${t.priority}</span></td>
        <td class="col-status"><span class="badge ${STATUS_CLASS[t.status] || ""}">${t.status}</span></td>
        <td class="col-date">${formatDate(t.createdAt)}</td>
      `;
      tr.querySelector(".ticket-title-cell").textContent = t.title;
      tr.addEventListener("click", () => {
        window.location.href = `ticket-detail.html?id=${t.id}`;
      });
      frag.appendChild(tr);
    });

    tbody.innerHTML = "";
    tbody.appendChild(frag);
    tableWrap.style.display = "block";
  } catch (err) {
    console.error(err);
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
  }
}
