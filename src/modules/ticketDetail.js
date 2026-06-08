import { getTicket, updateTicket, deleteTicket, listComments, addComment, listUsers } from "../api/tickets.js";
import { isAuthenticated } from "../api/auth.js";
import { getCurrentUser } from "../api/auth.js";
import { formatDate, formatDateTime } from "../utils/formatDate.js";
import { showToast, confirmDialog } from "./ui.js";

const PRIORITY_CLASS = { urgent: "badge-urgent", high: "badge-high", medium: "badge-medium", low: "badge-low" };
const STATUS_CLASS   = { open: "badge-open", "in-progress": "badge-inprogress", resolved: "badge-resolved", closed: "badge-closed" };

let ticketId = null;
let usersMap = {};

/* ── Show / hide skeleton states ── */
function showState(which) {
  document.getElementById("detail-loading").classList.toggle("hidden", which !== "loading");
  document.getElementById("detail-error").classList.toggle("hidden", which !== "error");
  document.getElementById("detail-content").classList.toggle("hidden", which !== "content");
}

/* ── Render ticket fields ── */
function renderTicket(ticket, users) {
  document.title = `#${ticket.id} — ${ticket.title} | DeskHub`;

  document.getElementById("detail-id").textContent = `#${ticket.id}`;

  const statusBadge = document.getElementById("detail-status-badge");
  statusBadge.textContent = ticket.status;
  statusBadge.className = `badge ${STATUS_CLASS[ticket.status] || ""}`;

  const prioBadge = document.getElementById("detail-priority-badge");
  prioBadge.textContent = ticket.priority;
  prioBadge.className = `badge ${PRIORITY_CLASS[ticket.priority] || ""}`;

  document.getElementById("detail-title").textContent = ticket.title;
  document.getElementById("detail-description").textContent = ticket.description || "No description.";
  document.getElementById("detail-category").textContent = ticket.category || "—";
  document.getElementById("detail-customer").textContent = ticket.customerName || "—";
  document.getElementById("detail-email").textContent = ticket.customerEmail || "—";
  document.getElementById("detail-created").textContent = formatDateTime(ticket.createdAt);
  document.getElementById("detail-updated").textContent = formatDateTime(ticket.updatedAt);

  // Sidebar selects
  document.getElementById("status-select").value   = ticket.status;
  document.getElementById("priority-select").value = ticket.priority;

  // Populate + set assignee dropdown
  const assigneeSel = document.getElementById("assignee-select");
  assigneeSel.innerHTML = `<option value="">Unassigned</option>`;
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    if (String(u.id) === String(ticket.assignedTo)) opt.selected = true;
    assigneeSel.appendChild(opt);
  });
}

/* ── Patch helper with toast ── */
async function patchTicket(field, value) {
  try {
    const updatedAt = new Date().toISOString();
    await updateTicket(ticketId, { [field]: value, updatedAt });
    document.getElementById("detail-updated").textContent = formatDateTime(updatedAt);
    showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`, "success");
  } catch (err) {
    showToast("Update failed: " + err.message, "error");
  }
}

/* ── Render comments ── */
function renderComments(comments) {
  const list = document.getElementById("comments-list");

  if (!comments.length) {
    list.innerHTML = `<p class="empty-state-small">No comments yet.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment-item";
    const author = usersMap[c.authorId] || c.authorName || "Agent";
    const date   = formatDateTime(c.createdAt);
    div.innerHTML = `
      <div class="comment-header">
        <span class="comment-author"></span>
        <span class="comment-date">${date}</span>
      </div>
      <p class="comment-body"></p>
    `;
    div.querySelector(".comment-author").textContent = author;
    div.querySelector(".comment-body").textContent = c.body || c.text || "";
    frag.appendChild(div);
  });

  list.innerHTML = "";
  list.appendChild(frag);
}

/* ── Load comments ── */
async function loadComments() {
  try {
    const { data: comments } = await listComments(ticketId);
    renderComments(Array.isArray(comments) ? comments : []);
  } catch {
    document.getElementById("comments-list").innerHTML =
      `<p class="empty-state-small">Could not load comments.</p>`;
  }
}

/* ── Post a comment ── */
async function postComment() {
  const input  = document.getElementById("comment-input");
  const btn    = document.getElementById("comment-submit");
  const text   = input.value.trim();

  if (!text) { showToast("Comment cannot be empty", "error"); return; }

  btn.disabled    = true;
  btn.textContent = "Posting…";
  try {
    const user = getCurrentUser();
    await addComment({
      ticketId: Number(ticketId),
      authorId: user ? user.id : null,
      authorName: user ? user.name : "Agent",
      body: text,
      createdAt: new Date().toISOString(),
    });
    input.value = "";
    await loadComments();
    showToast("Comment posted", "success");
  } catch (err) {
    showToast("Failed to post comment: " + err.message, "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Post Comment";
  }
}

/* ── Boot ── */
export async function initTicketDetail() {
  if (!isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  const params = new URLSearchParams(location.search);
  ticketId = params.get("id");
  if (!ticketId) {
    document.getElementById("detail-error-msg").textContent = "No ticket ID in URL.";
    showState("error");
    return;
  }

  // Show current user in topbar
  const user = getCurrentUser();
  const topbarUser = document.getElementById("topbar-user");
  if (topbarUser && user) topbarUser.textContent = user.name;

  showState("loading");

  try {
    // Parallel fetch: ticket + comments + users
    const [ticketRes, commentsRes, usersRes] = await Promise.all([
      getTicket(ticketId),
      listComments(ticketId),
      listUsers(),
    ]);

    const ticket   = ticketRes.data;
    const comments = Array.isArray(commentsRes.data) ? commentsRes.data : [];
    const users    = Array.isArray(usersRes.data)    ? usersRes.data    : [];

    users.forEach(u => { usersMap[u.id] = u.name; });

    renderTicket(ticket, users);
    renderComments(comments);
    showState("content");

    // Wire sidebar change handlers
    document.getElementById("status-select").addEventListener("change", (e) => {
      const val = e.target.value;
      patchTicket("status", val).then(() => {
        const badge = document.getElementById("detail-status-badge");
        badge.textContent = val;
        badge.className = `badge ${STATUS_CLASS[val] || ""}`;
      });
    });

    document.getElementById("priority-select").addEventListener("change", (e) => {
      const val = e.target.value;
      patchTicket("priority", val).then(() => {
        const badge = document.getElementById("detail-priority-badge");
        badge.textContent = val;
        badge.className = `badge ${PRIORITY_CLASS[val] || ""}`;
      });
    });

    document.getElementById("assignee-select").addEventListener("change", (e) => {
      const val = e.target.value ? Number(e.target.value) : null;
      patchTicket("assignedTo", val);
    });

    // Comment submit
    document.getElementById("comment-submit").addEventListener("click", postComment);
    document.getElementById("comment-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment();
    });

    // Delete ticket
    document.getElementById("delete-btn").addEventListener("click", async () => {
      const confirmed = await confirmDialog(
        "Delete Ticket",
        `Are you sure you want to delete ticket #${ticketId}? This cannot be undone.`
      );
      if (!confirmed) return;
      try {
        await deleteTicket(ticketId);
        showToast("Ticket deleted", "success");
        setTimeout(() => { window.location.href = "tickets.html"; }, 800);
      } catch (err) {
        showToast("Delete failed: " + err.message, "error");
      }
    });

  } catch (err) {
    console.error(err);
    document.getElementById("detail-error-msg").textContent = "Could not load ticket: " + err.message;
    showState("error");
  }
}
