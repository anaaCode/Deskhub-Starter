import { get, post, patch, del, isLocalAvailable } from "./client.js";
import * as mock from "../data/mockApi.js";

// ── tickets ───────────────────────────────────────────────────────────────────

export async function listTickets(params = {}) {
  if (await isLocalAvailable()) {
    // Real json-server path — raw fetch so we can read X-Total-Count header
    const qs = buildQS(params);
    const res = await fetch("http://localhost:3001/tickets" + qs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = res.headers.get("X-Total-Count");
    const data  = await res.json();
    return { data, total: total ? parseInt(total, 10) : data.length };
  } else {
    // Mock path — filter/sort/paginate in-memory
    return mock.queryTickets(params);
  }
}

export async function getTicket(id) {
  if (await isLocalAvailable()) return get(`/tickets/${id}`);
  return mock.getTicket(id);
}

export async function createTicket(body) {
  if (await isLocalAvailable()) return post("/tickets", body);
  return mock.createTicket(body);
}

export async function updateTicket(id, body) {
  if (await isLocalAvailable()) return patch(`/tickets/${id}`, body);
  return mock.updateTicket(id, body);
}

export async function deleteTicket(id) {
  if (await isLocalAvailable()) return del(`/tickets/${id}`);
  return mock.deleteTicket(id);
}

export async function listComments(ticketId) {
  if (await isLocalAvailable()) return get(`/comments?ticketId=${ticketId}&_sort=createdAt&_order=asc`);
  return mock.queryComments(ticketId);
}

export async function addComment(body) {
  if (await isLocalAvailable()) return post("/comments", body);
  return mock.addComment(body);
}

export async function listUsers() {
  if (await isLocalAvailable()) return get("/users");
  return mock.getUsers();
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildQS(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== null && v !== undefined) q.append(k, v);
  }
  const s = q.toString();
  return s ? "?" + s : "";
}
