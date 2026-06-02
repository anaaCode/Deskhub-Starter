import { initLogin, initLogout, requireAuth } from "./modules/auth.js";

window.onerror = (msg, src, line, col, err) => {
  console.error("Unhandled error:", err || msg);
};

try {
  const page = document.body.dataset.page;

  switch (page) {
    case "login":
      initLogin();
      break;
    case "dashboard":
      requireAuth();
      initLogout();
      break;
    default:
      console.warn("Unknown page:", page);
  }
} catch (err) {
  console.error("Boot error:", err);
}