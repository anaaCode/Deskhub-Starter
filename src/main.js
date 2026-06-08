import { initLogin, initLogout, requireAuth } from "./modules/auth.js";
import { getCurrentUser } from "./api/auth.js";
import { initTicketsList } from "./modules/tickets.js";
import { initTicketDetail } from "./modules/ticketDetail.js";
import { initDashboard } from "./modules/dashboard.js";

window.onerror = (msg, src, line, col, err) => {
  console.error("Unhandled error:", err || msg);
};

try {
  const page = document.body.dataset.page;

  // Wire logout button (present on most pages)
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) initLogout();

  switch (page) {
    case "login":
      initLogin();
      break;

    case "dashboard":
      requireAuth();
      initDashboard();
      break;

    case "tickets-list":
      requireAuth();
      initTicketsList();
      break;

    case "ticket-detail":
      requireAuth();
      initTicketDetail();
      break;

    default:
      if (page) console.warn("Unknown page:", page);
  }

  // Show current user in topbar where present
  const user = getCurrentUser();
  const topbarUser = document.getElementById("topbar-user");
  if (topbarUser && user) topbarUser.textContent = user.name;

} catch (err) {
  console.error("Boot error:", err);
}
