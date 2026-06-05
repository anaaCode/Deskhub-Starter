/* ── Toast queue ── */
const toastContainer = () => document.getElementById("toast-container");

const toastQueue = [];

export function showToast(message, type = "info", duration = 3000) {
  const container = toastContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span style="font-weight:700">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  toastQueue.push(toast);

  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => {
      toast.remove();
      const idx = toastQueue.indexOf(toast);
      if (idx > -1) toastQueue.splice(idx, 1);
    }, 300);
  }, duration);
}

/* ── Full-screen loader ── */
export function showLoader(visible = true) {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  if (visible) el.classList.remove("hidden");
  else         el.classList.add("hidden");
}

/* ── Modal helpers ── */
export function openModal(backdropId = "modal-backdrop") {
  const el = document.getElementById(backdropId);
  if (!el) return;
  el.classList.remove("hidden");
  // Close on backdrop click
  el.addEventListener("click", (e) => {
    if (e.target === el) closeModal(backdropId);
  }, { once: true });
  // Close on Esc
  const onKey = (e) => {
    if (e.key === "Escape") { closeModal(backdropId); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
}

export function closeModal(backdropId = "modal-backdrop") {
  const el = document.getElementById(backdropId);
  if (el) el.classList.add("hidden");
}

/* ── Confirm dialog ── */
export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById("confirm-backdrop");
    if (!backdrop) { resolve(false); return; }

    document.getElementById("confirm-title").textContent   = title;
    document.getElementById("confirm-message").textContent = message;

    openModal("confirm-backdrop");

    const cleanup = () => closeModal("confirm-backdrop");

    document.getElementById("confirm-ok").onclick = () => { cleanup(); resolve(true); };
    document.getElementById("confirm-cancel").onclick = () => { cleanup(); resolve(false); };
    document.getElementById("confirm-close").onclick  = () => { cleanup(); resolve(false); };
  });
}