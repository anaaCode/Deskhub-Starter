/* ═══════════════════════════════════════════════════════════════
   ui.js  —  toast · modal · confirmDialog · fullscreen loader
              bootstrap loader · dark mode · keyboard shortcuts
   ═══════════════════════════════════════════════════════════════ */

/* ── DARK MODE ──────────────────────────────────────────────────
   Persists preference in localStorage. */

const THEME_KEY = "deskhub:theme";

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Light`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark`;
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next    = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

/* ── BOOTSTRAP LOADER ───────────────────────────────────────────
   Shows a branded splash for 1-1.5s on every internal page load. */

export function showBootstrapLoader() {
  // Inject if not already in HTML
  if (document.getElementById("bootstrap-loader")) return;
  const el = document.createElement("div");
  el.id = "bootstrap-loader";
  el.innerHTML = `
    <div class="boot-logo">DeskHub</div>
    <div class="boot-bar-wrap"><div class="boot-bar"></div></div>
  `;
  document.body.insertBefore(el, document.body.firstChild);
}

export function hideBootstrapLoader() {
  const el = document.getElementById("bootstrap-loader");
  if (!el) return;
  el.classList.add("fade-out");
  setTimeout(() => el.remove(), 400);
}

/* ── TOAST ──────────────────────────────────────────────────────
   Queued — multiple toasts stack without overwriting each other. */

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
  const icon  = document.createElement("span");
  icon.className   = "toast-icon";
  icon.textContent = icons[type] || "ℹ";

  const span = document.createElement("span");
  span.className   = "toast-msg";
  span.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(span);
  container.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast-show")));

  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => {
      toast.remove();
      // Small gap between toasts
      setTimeout(_flush, 80);
    }, { once: true });
  }, 3000);
}

/* ── MODAL ──────────────────────────────────────────────────────
   openModal / closeModal with slide-in animation. */

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => el.classList.add("modal-visible"));

  el._outsideClick = (e) => { if (e.target === el) closeModal(id); };
  el.addEventListener("click", el._outsideClick);

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

    let okBtn     = document.getElementById("confirm-ok");
    let cancelBtn = document.getElementById("confirm-cancel");
    const closeBtn = document.getElementById("confirm-close");

    okBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;

    function finish(result) {
      closeModal("confirm-backdrop");
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

/* ── FULLSCREEN LOADER (blocking overlay for slow ops) ──────── */

export function showLoader(text = "Loading…") {
  let el = document.getElementById("fullscreen-loader");
  if (!el) {
    el = document.createElement("div");
    el.id        = "fullscreen-loader";
    el.className = "fullscreen-loader";
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="fl-box">
      <div class="spinner"></div>
      <div class="fl-text">${text}</div>
    </div>`;
  el.hidden = false;
}

export function hideLoader() {
  const el = document.getElementById("fullscreen-loader");
  if (el) el.hidden = true;
}

/* ── KEYBOARD SHORTCUTS ─────────────────────────────────────────
   Ctrl+Z = undo, Ctrl+Y = redo (delegates to registered handlers).
   Ctrl+/ = show shortcuts cheat-sheet. */

const _undoHandlers = [];
const _redoHandlers = [];

export function registerUndo(fn) { _undoHandlers.push(fn); }
export function registerRedo(fn) { _redoHandlers.push(fn); }

function _showShortcutHelp() {
  let overlay = document.getElementById("shortcut-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id        = "shortcut-overlay";
    overlay.className = "shortcut-overlay";
    overlay.innerHTML = `
      <div class="shortcut-box">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <div class="shortcut-row"><span>Undo</span>         <kbd>Ctrl A</kbd></div>
        <div class="shortcut-row"><span>Redo</span>         <kbd>Ctrl B</kbd></div>
        <div class="shortcut-row"><span>New Ticket</span>   <kbd>Ctrl N</kbd></div>
        <div class="shortcut-row"><span>Recycle Bin</span>  <kbd>Ctrl R</kbd></div>
        <div class="shortcut-row"><span>Export CSV</span>   <kbd>Ctrl E</kbd></div>
        <div class="shortcut-row"><span>Toggle Dark</span>  <kbd>Ctrl D</kbd></div>
        <div class="shortcut-row"><span>This Help</span>    <kbd>Ctrl /</kbd></div>
        <div style="margin-top:.75rem;text-align:center">
          <button id="shortcut-close" class="btn btn-ghost btn-sm">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.add("visible");
  const close = () => overlay.classList.remove("visible");
  overlay.querySelector("#shortcut-close").onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

export function initKeyboardShortcuts({ onNewTicket, onRecycleBin, onExportCSV } = {}) {
  document.addEventListener("keydown", (e) => {
    // Don't fire inside inputs / textareas
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "a":
          if (!inInput) { e.preventDefault(); _undoHandlers.forEach(fn => fn()); }
          break;
        case "b":
          if (!inInput) { e.preventDefault(); _redoHandlers.forEach(fn => fn()); }
          break;
        case "n":
          if (!inInput) { e.preventDefault(); onNewTicket?.(); }
          break;
        case "r":
          e.preventDefault(); onRecycleBin?.();
          break;
        case "e":
          if (!inInput) { e.preventDefault(); onExportCSV?.(); }
          break;
        case "d":
          e.preventDefault(); toggleTheme();
          break;
        case "/":
          e.preventDefault(); _showShortcutHelp();
          break;
      }
    }
  });
}
