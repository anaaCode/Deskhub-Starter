import { get, post, patch, del } from "./client.js";

export async function listTickets(params = {}) {
  const qs = buildQueryString(params);
  const res = await fetch(`http://localhost:3001/tickets${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = res.headers.get("X-Total-Count");
  const data = await res.json();
  return { data, total: total ? parseInt(total, 10) : data.length };
}

export function getTicket(id)          { return get(`/tickets/${id}`); }
export function createTicket(body)     { return post("/tickets", body); }
export function updateTicket(id, body) { return patch(`/tickets/${id}`, body); }
export function deleteTicket(id)       { return del(`/tickets/${id}`); }
export function listComments(ticketId) { return get(`/comments?ticketId=${ticketId}&_sort=createdAt&_order=asc`); }
export function addComment(body)       { return post("/comments", body); }
export function listUsers()            { return get("/users"); }

function buildQueryString(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== null && v !== undefined) q.append(k, v);
  }
  const s = q.toString();
  return s ? "?" + s : "";
}
