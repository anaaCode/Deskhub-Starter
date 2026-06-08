/* ═══════════════════════════════════════════════════════════════
   form.js  —  validators · validateField · validateForm · blur wiring
   ═══════════════════════════════════════════════════════════════ */

/* ── Primitive validators ────────────────────────────────────── */
export const validators = {
  required:  (v) => v.trim().length > 0  ? null : "This field is required.",
  minLength: (n) => (v) => v.trim().length >= n  ? null : `Must be at least ${n} characters.`,
  maxLength: (n) => (v) => v.trim().length <= n  ? null : `Must be at most ${n} characters.`,
  email:     (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address.",
  oneOf:     (list) => (v) => list.includes(v)   ? null : `Pick one of: ${list.join(", ")}.`,
};

/* ── Field rules ─────────────────────────────────────────────────
   Each entry: [name, [fn, fn, …]]  — first failure wins.         */
export const TICKET_RULES = [
  ["title",         [validators.required, validators.minLength(5),  validators.maxLength(100)]],
  ["description",   [validators.required, validators.minLength(10)]],
  ["customerName",  [validators.required]],
  ["customerEmail", [validators.required, validators.email]],
  ["priority",      [validators.required, validators.oneOf(["low","medium","high","urgent"])]],
  ["category",      [validators.required, validators.oneOf(["billing","technical","general","feature-request","bug"])]],
];

/* ── validateField ───────────────────────────────────────────── */
export function validateField(name, value, rules = TICKET_RULES) {
  const rule = rules.find(([n]) => n === name);
  if (!rule) return null;
  for (const fn of rule[1]) {
    const err = fn(value);
    if (err) return err;
  }
  return null;
}

/* ── validateForm ────────────────────────────────────────────── */
export function validateForm(formEl, rules = TICKET_RULES) {
  let valid = true;
  for (const [name] of rules) {
    const input = formEl.elements[name];
    if (!input) continue;
    const err = validateField(name, input.value, rules);
    showFieldError(name, err);
    if (err) valid = false;
  }
  return valid;
}

/* ── DOM helpers ─────────────────────────────────────────────── */
export function showFieldError(name, message) {
  const errEl = document.getElementById(`err-${name}`);
  if (errEl) errEl.textContent = message || "";
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.classList.toggle("input-error", !!message);
}

export function clearAllErrors(rules = TICKET_RULES) {
  for (const [name] of rules) showFieldError(name, null);
}

/* ── Wire blur validation ────────────────────────────────────── */
export function wireBlurValidation(formEl, rules = TICKET_RULES) {
  for (const [name] of rules) {
    const input = formEl.elements[name];
    if (!input) continue;
    input.addEventListener("blur", () => {
      showFieldError(name, validateField(name, input.value, rules));
    });
  }
}
