/* ═══════════════════════════════════════════════════════════════
   ticketDetail.js  —  load · render · edit · comments · delete
   ═══════════════════════════════════════════════════════════════ */
import { getTicket, updateTicket, deleteTicket,
         listComments, addComment, listUsers }   from "../api/tickets.js";
import { isAuthenticated, getCurrentUser }        from "../api/auth.js";
import { formatDate, formatDateTime, formatRelative } from "../utils/formatDate.js";
import { showToast, openModal, closeModal, confirmDialog } from "./ui.js";
import { validateForm, clearAllErrors,
         wireBlurValidation, TICKET_RULES }       from "./form.js";

/* ── maps ───────────────────────────────────────────────────── */
const PRIORITY_CLS = { urgent:"priority-urgent", high:"priority-high",
                       medium:"priority-medium", low:"priority-low" };
const STATUS_CLS   = { open:"status-open", "in-progress":"status-in-progress",
                       resolved:"status-resolved", closed:"status-closed" };

/* ── module state ───────────────────────────────────────────── */
let ticketId     = null;
let current      = null;   // live ticket object
let usersMap     = {};     // id → name
let usersList    = [];

/* ── tiny helpers ───────────────────────────────────────────── */
const $  = (id) => document.getElementById(id);
const el = (id) => document.getElementById(id); // alias for readability

function showSection(which) {
  $("detail-loading").hidden = which !== "loading";
  $("detail-error").hidden   = which !== "error";
  $("detail-content").hidden = which !== "content";
}

/* ── render ticket ──────────────────────────────────────────── */
function renderTicket(t) {
  current = t;
  document.title = `#${t.id} — ${t.title} | DeskHub`;

  $("detail-id").textContent          = `#${t.id}`;
  $("detail-title").textContent       = t.title;
  $("detail-description").textContent = t.description || "No description provided.";
  $("detail-category").textContent    = t.category    || "—";
  $("detail-customer").textContent    = t.customerName  || "—";
  $("detail-email").textContent       = t.customerEmail || "—";
  $("detail-created").textContent     = formatDateTime(t.createdAt);
  $("detail-updated").textContent     = formatDateTime(t.updatedAt);

  const sb = $("detail-status-badge");
  sb.textContent = t.status.replace("-"," ");
  sb.className   = `badge ${STATUS_CLS[t.status] || ""}`;

  const pb = $("detail-priority-badge");
  pb.textContent = t.priority;
  pb.className   = `badge ${PRIORITY_CLS[t.priority] || ""}`;

  $("status-select").value   = t.status;
  $("priority-select").value = t.priority;

  // Rebuild assignee options
  const sel = $("assignee-select");
  sel.innerHTML = `<option value="">Unassigned</option>`;
  usersList.forEach(u => {
    const o = document.createElement("option");
    o.value = u.id;
    o.textContent = u.name;
    if (String(u.id) === String(t.assignedTo)) o.selected = true;
    sel.appendChild(o);
  });
}

/* ── PATCH one field ────────────────────────────────────────── */
async function patchField(field, value) {
  try {
    const updatedAt = new Date().toISOString();
    await updateTicket(ticketId, { [field]: value, updatedAt });
    $("detail-updated").textContent = formatDateTime(updatedAt);
    current[field]  = value;
    current.updatedAt = updatedAt;
    showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`, "success");
    return true;
  } catch (err) {
    showToast("Update failed: " + err.message, "error");
    return false;
  }
}

/* ── render comments ────────────────────────────────────────── */
function renderComments(comments) {
  const list = $("comments-list");

  if (!comments.length) {
    list.innerHTML = `<p class="empty-state-small">No comments yet. Be the first to reply!</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  comments.forEach(c => {
    const div    = document.createElement("div");
    div.className = "comment-item";
    const author = usersMap[c.authorId] || c.authorName || "Agent";
    const initials = author.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

    div.innerHTML = `
      <div class="comment-header">
        <div class="comment-author-wrap">
          <span class="comment-avatar"></span>
          <span class="comment-author"></span>
        </div>
        <span class="comment-date" title=""></span>
      </div>
      <p class="comment-body"></p>
    `;
    div.querySelector(".comment-avatar").textContent = initials;
    div.querySelector(".comment-author").textContent = author;
    const dateEl = div.querySelector(".comment-date");
    dateEl.textContent = formatRelative(c.createdAt);
    dateEl.title       = formatDateTime(c.createdAt);
    div.querySelector(".comment-body").textContent   = c.body || c.text || "";
    frag.appendChild(div);
  });

  list.innerHTML = "";
  list.appendChild(frag);
}

/* ── load / reload comments ─────────────────────────────────── */
async function loadComments() {
  try {
    const raw      = await listComments(ticketId);
    const comments = Array.isArray(raw) ? raw : (raw?.data ?? []);
    renderComments(comments);
  } catch {
    $("comments-list").innerHTML =
      `<p class="empty-state-small" style="color:#ef4444">Could not load comments.</p>`;
  }
}

/* ── post a comment ─────────────────────────────────────────── */
async function postComment() {
  const input = $("comment-input");
  const btn   = $("comment-submit");
  const text  = input.value.trim();
  if (!text) { showToast("Comment cannot be empty.", "error"); return; }

  btn.disabled    = true;
  btn.textContent = "Posting…";
  try {
    const user = getCurrentUser();
    await addComment({
      ticketId:   Number(ticketId),
      authorId:   user?.id   ?? null,
      authorName: user?.name ?? "Agent",
      body:       text,
      createdAt:  new Date().toISOString(),
    });
    input.value = "";
    await loadComments();
    showToast("Comment posted!", "success");
  } catch (err) {
    showToast("Failed to post: " + err.message, "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Post Comment";
  }
}

/* ── wire Edit modal ────────────────────────────────────────── */
function wireEditModal() {
  const editBtn = $("edit-btn");
  if (!editBtn || !$("edit-form")) return;

  editBtn.addEventListener("click", () => {
    const form = $("edit-form");
    // Pre-fill with current values
    form.elements["title"].value         = current.title         ?? "";
    form.elements["description"].value   = current.description   ?? "";
    form.elements["customerName"].value  = current.customerName  ?? "";
    form.elements["customerEmail"].value = current.customerEmail ?? "";
    form.elements["priority"].value      = current.priority      ?? "";
    form.elements["category"].value      = current.category      ?? "";
    clearAllErrors(TICKET_RULES);
    openModal("edit-modal-backdrop");
  });

  $("edit-modal-close")?.addEventListener("click",  () => closeModal("edit-modal-backdrop"));
  $("edit-modal-cancel")?.addEventListener("click", () => closeModal("edit-modal-backdrop"));

  wireBlurValidation($("edit-form"), TICKET_RULES);

  $("edit-modal-submit").addEventListener("click", async () => {
    const form = $("edit-form");
    if (!validateForm(form, TICKET_RULES)) return;

    const submitBtn = $("edit-modal-submit");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Saving…";
    try {
      const body = {
        title:         form.elements["title"].value.trim(),
        description:   form.elements["description"].value.trim(),
        customerName:  form.elements["customerName"].value.trim(),
        customerEmail: form.elements["customerEmail"].value.trim(),
        priority:      form.elements["priority"].value,
        category:      form.elements["category"].value,
        updatedAt:     new Date().toISOString(),
      };
      await updateTicket(ticketId, body);
      closeModal("edit-modal-backdrop");
      showToast("Ticket updated!", "success");
      // Re-fetch + re-render so all UI reflects saved values
      const fresh = await getTicket(ticketId);
      const t = Array.isArray(fresh) ? fresh[0] : (fresh?.data ?? fresh);
      renderTicket(t);
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Changes";
    }
  });
}

/* ── boot ───────────────────────────────────────────────────── */
export async function initTicketDetail() {
  if (!isAuthenticated()) { window.location.href = "index.html"; return; }

  // Show user in topbar
  const user = getCurrentUser();
  if ($("topbar-user") && user) $("topbar-user").textContent = user.name;

  // Read ?id=N
  ticketId = new URLSearchParams(location.search).get("id");
  if (!ticketId) {
    $("detail-error-msg").textContent = "No ticket ID in URL.";
    showSection("error");
    return;
  }

  showSection("loading");

  try {
    // Parallel fetch — ticket + comments + users
    const [ticketRaw, commentsRaw, usersRaw] = await Promise.all([
      getTicket(ticketId),
      listComments(ticketId),
      listUsers(),
    ]);

    // Normalise (json-server returns plain obj; mock may differ)
    const ticket   = Array.isArray(ticketRaw)   ? ticketRaw[0]  : (ticketRaw?.data   ?? ticketRaw);
    const comments = Array.isArray(commentsRaw) ? commentsRaw   : (commentsRaw?.data  ?? []);
    const users    = Array.isArray(usersRaw)    ? usersRaw      : (usersRaw?.data     ?? []);

    usersList = users;
    users.forEach(u => { usersMap[u.id] = u.name; });

    renderTicket(ticket);
    renderComments(comments);
    showSection("content");

    /* ── sidebar property selects ──────────────────────────── */
    $("status-select").addEventListener("change", async (e) => {
      const val = e.target.value;
      const ok  = await patchField("status", val);
      if (ok) {
        const b = $("detail-status-badge");
        b.textContent = val.replace("-"," ");
        b.className   = `badge ${STATUS_CLS[val] || ""}`;
      } else {
        e.target.value = current.status;
      }
    });

    $("priority-select").addEventListener("change", async (e) => {
      const val = e.target.value;
      const ok  = await patchField("priority", val);
      if (ok) {
        const b = $("detail-priority-badge");
        b.textContent = val;
        b.className   = `badge ${PRIORITY_CLS[val] || ""}`;
      } else {
        e.target.value = current.priority;
      }
    });

    $("assignee-select").addEventListener("change", async (e) => {
      const val = e.target.value ? Number(e.target.value) : null;
      const ok  = await patchField("assignedTo", val);
      if (!ok) e.target.value = current.assignedTo ?? "";
    });

    /* ── comments ───────────────────────────────────────────── */
    $("comment-submit").addEventListener("click", postComment);
    $("comment-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment();
    });

    /* ── edit modal ─────────────────────────────────────────── */
    wireEditModal();

    /* ── delete ─────────────────────────────────────────────── */
    $("delete-btn").addEventListener("click", async () => {
      const yes = await confirmDialog(
        "Delete Ticket",
        `Permanently delete ticket #${ticketId}? This cannot be undone.`,
        true
      );
      if (!yes) return;
      try {
        await deleteTicket(ticketId);
        showToast("Ticket deleted", "success");
        setTimeout(() => { window.location.href = "tickets.html"; }, 900);
      } catch (err) {
        showToast("Delete failed: " + err.message, "error");
      }
    });

  } catch (err) {
    console.error(err);
    $("detail-error-msg").textContent = "Could not load ticket: " + err.message;
    showSection("error");
  }
}
