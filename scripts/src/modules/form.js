/* Validators */
const validators = {
  required: (v) => v.trim().length > 0 || "This field is required",
  minLength: (min) => (v) => v.trim().length >= min || `Minimum ${min} characters`,
  maxLength: (max) => (v) => v.trim().length <= max || `Maximum ${max} characters`,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Enter a valid email address",
  oneOf: (vals) => (v) => vals.includes(v) || `Must be one of: ${vals.join(", ")}`,
};

const FIELD_RULES = {
  title:         [validators.required, validators.minLength(5), validators.maxLength(100)],
  description:   [validators.required, validators.minLength(10)],
  customerName:  [validators.required],
  customerEmail: [validators.required, validators.email],
  priority:      [validators.required, validators.oneOf(["low", "medium", "high", "urgent"])],
  category:      [validators.required, validators.oneOf(["billing", "technical", "general", "feature-request", "bug"])],
};

/**
 * Validate a single field. Returns first error string or null.
 */
export function validateField(name, value) {
  const rules = FIELD_RULES[name] || [];
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) return result;
  }
  return null;
}

/**
 * Show inline error under a field.
 */
export function showFieldError(name, message) {
  const el = document.getElementById(`err-${name}`);
  if (!el) return;
  el.textContent = message || "";
}

/**
 * Wire blur-time validation on form fields.
 * Returns a cleanup function.
 */
export function wireBlurValidation(form, fieldNames) {
  const handlers = [];
  fieldNames.forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    const handler = () => {
      const err = validateField(name, input.value);
      showFieldError(name, err || "");
    };
    input.addEventListener("blur", handler);
    handlers.push({ input, handler });
  });
  return () => handlers.forEach(({ input, handler }) => input.removeEventListener("blur", handler));
}

/**
 * Validate entire form. Returns { valid, errors }.
 */
export function validateForm(form, fieldNames) {
  let valid = true;
  const errors = {};
  fieldNames.forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    const value = input ? input.value : "";
    const err   = validateField(name, value);
    errors[name] = err;
    showFieldError(name, err || "");
    if (err) valid = false;
  });
  return { valid, errors };
}