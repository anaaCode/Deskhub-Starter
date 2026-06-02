import * as authApi from "../api/auth.js";

export function initLogin() {
  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("login-submit");
  const errorDiv = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    errorDiv.textContent = "";
    errorDiv.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      await authApi.login(email, password);
      window.location.href = "/dashboard.html";
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
}

export function initLogout(selector = "#logout-btn") {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener("click", () => {
    authApi.logout();
    window.location.href = "/index.html";
  });
}

export function requireAuth() {
  if (!authApi.isAuthenticated()) {
    window.location.href = "/index.html";
  }
}