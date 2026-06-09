import { initLogin, initLogout, requireAuth } from "./modules/auth.js";
import { initTicketsList }  from "./modules/tickets.js";
import { initTicketDetail } from "./modules/ticketDetail.js";
import { initDashboard }    from "./modules/dashboard.js";
import { initTheme }        from "./modules/ui.js";

window.onerror = (msg, src, line, col, err) => console.error("Unhandled:", err || msg);

// Apply theme immediately to avoid flash
initTheme();

try {
  const page = document.body.dataset.page;

  switch (page) {
    case "login":
      initLogin();
      break;

    case "dashboard":
      requireAuth();
      initLogout();
      initDashboard();
      break;

    case "tickets-list":
      initTicketsList();
      initLogout();
      break;

    case "ticket-detail":
      requireAuth();
      initLogout();
      initTicketDetail();
      break;

    default:
      if (page) console.warn("Unknown page:", page);
  }
} catch (err) {
  console.error("Boot error:", err);
}
