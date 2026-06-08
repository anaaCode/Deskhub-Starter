/* ═══════════════════════════════════════════════════════════════
   ui.js  —  toast · modal · confirmDialog · fullscreen loader
   ═══════════════════════════════════════════════════════════════ */

/* ── TOAST ──────────────────────────────────────────────────────
   Queued so multiple toasts stack without overwriting each other. */

const _queue = [];
let   _busy  = false;

export function showToast(message, type = "success") {
  _queue.push({ message, type });
  if (!_busy) _flush();
}

function _flush() {
  if (!_queue.length) { _busy = false; return; }
  _busy = true;

  const { message, type } = _queue.shift();
  const container = document.getElementById("toast-container");
  if (!container) { _flush(); return; }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const span  = document.createElement("span");
  span.className = "toast-msg";
  span.textContent = message;

  const icon = document.createElement("span");
  icon.className   = "toast-icon";
  icon.textContent = icons[type] || "ℹ";

  toast.appendChild(icon);
  toast.appendChild(span);
  container.appendChild(toast);

  // Animate in (next paint)
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast-show")));

  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => { toast.remove(); _flush(); }, { once: true });
  }, 3000);
}

/* ── MODAL ──────────────────────────────────────────────────────
   openModal / closeModal work by toggling `hidden` + a CSS class. */

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => el.classList.add("modal-visible"));

  // Close on outside click
  el._outsideClick = (e) => { if (e.target === el) closeModal(id); };
  el.addEventListener("click", el._outsideClick);

  // Close on Escape
  el._keyHandler = (e) => { if (e.key === "Escape") closeModal(id); };
  document.addEventListener("keydown", el._keyHandler);
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("modal-visible");
  el.removeEventListener("click", el._outsideClick);
  document.removeEventListener("keydown", el._keyHandler);
  setTimeout(() => {
    el.hidden = true;
    document.body.style.overflow = "";
  }, 180);
}

/* ── CONFIRM DIALOG ──────────────────────────────────────────── */

export function confirmDialog(title, message, danger = true) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById("confirm-backdrop");
    if (!backdrop) { resolve(false); return; }

    document.getElementById("confirm-title").textContent   = title;
    document.getElementById("confirm-message").textContent = message;

    // Get fresh references (cloneNode removes old listeners)
    let okBtn     = document.getElementById("confirm-ok");
    let cancelBtn = document.getElementById("confirm-cancel");
    const closeBtn = document.getElementById("confirm-close");

    okBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;

    function finish(result) {
      closeModal("confirm-backdrop");
      // Remove listeners by replacing nodes
      const newOk     = okBtn.cloneNode(true);
      const newCancel = cancelBtn.cloneNode(true);
      okBtn.replaceWith(newOk);
      cancelBtn.replaceWith(newCancel);
      resolve(result);
    }

    okBtn.addEventListener("click",     () => finish(true),  { once: true });
    cancelBtn.addEventListener("click", () => finish(false), { once: true });
    closeBtn?.addEventListener("click", () => finish(false), { once: true });

    openModal("confirm-backdrop");
  });
}

/* ── FULLSCREEN LOADER ───────────────────────────────────────── */

export function showLoader() {
  let el = document.getElementById("fullscreen-loader");
  if (!el) {
    el = document.createElement("div");
    el.id        = "fullscreen-loader";
    el.className = "fullscreen-loader";
    el.innerHTML = `<div class="spinner"></div>`;
    document.body.appendChild(el);
  }
  el.hidden = false;
}

export function hideLoader() {
  const el = document.getElementById("fullscreen-loader");
  if (el) el.hidden = true;
}
