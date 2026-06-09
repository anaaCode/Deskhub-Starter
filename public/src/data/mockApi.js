/**
 * mockApi.js
 * Runs entirely in-browser. Mimics json-server query behaviour:
 * ?q=         full-text search across all string fields
 * ?status=    exact match on any field
 * ?priority=
 * ?assignedTo=
 * ?_sort=     field to sort by
 * ?_order=    asc | desc (default desc)
 * ?_page=     1-based page number
 * ?_limit=    page size
 *
 * Returns { data, total } — same shape as our listTickets() wrapper.
 */
import { DB } from "./db.js";

// In-memory mutable state (resets on page reload — fine for a demo)
let _tickets  = DB.tickets.map(t => ({ ...t }));
let _comments = DB.comments.map(c => ({ ...c }));
let _nextTicketId  = Math.max(..._tickets.map(t => t.id),  0) + 1;
let _nextCommentId = Math.max(..._comments.map(c => c.id), 0) + 1;

// ── helpers ──────────────────────────────────────────────────────────────────

function matchesSearch(ticket, q) {
  const lower = q.toLowerCase();
  return Object.values(ticket).some(v =>
    typeof v === "string" && v.toLowerCase().includes(lower)
  );
}

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER   = { open: 0, "in-progress": 1, resolved: 2, closed: 3 };

function sortTickets(arr, sort, order) {
  return [...arr].sort((a, b) => {
    let va = a[sort], vb = b[sort];

    if (sort === "priority") { va = PRIORITY_ORDER[va] ?? 99; vb = PRIORITY_ORDER[vb] ?? 99; }
    if (sort === "status")   { va = STATUS_ORDER[va]   ?? 99; vb = STATUS_ORDER[vb]   ?? 99; }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();

    if (va < vb) return order === "asc" ? -1 : 1;
    if (va > vb) return order === "asc" ?  1 : -1;
    return 0;
  });
}

// ── public API ────────────────────────────────────────────────────────────────

export function queryTickets(params = {}) {
  const { q, status, priority, assignedTo, _sort = "createdAt", _order = "desc", _page = 1, _limit = 10 } = params;

  let result = _tickets;
  if (q)          result = result.filter(t => matchesSearch(t, q));
  if (status)     result = result.filter(t => t.status   === status);
  if (priority)   result = result.filter(t => t.priority === priority);
  if (assignedTo) result = result.filter(t => String(t.assignedTo) === String(assignedTo));

  result = sortTickets(result, _sort, _order);

  const total = result.length;
  const page  = parseInt(_page,  10);
  const limit = parseInt(_limit, 10);
  const start = (page - 1) * limit;
  const data  = result.slice(start, start + limit);

  return { data, total };
}

export function getTicket(id) {
  return _tickets.find(t => t.id === parseInt(id, 10)) ?? null;
}

export function createTicket(body) {
  const now = new Date().toISOString();
  const ticket = { ...body, id: _nextTicketId++, createdAt: now, updatedAt: now };
  _tickets.unshift(ticket);
  return ticket;
}

export function updateTicket(id, body) {
  const idx = _tickets.findIndex(t => t.id === parseInt(id, 10));
  if (idx === -1) return null;
  _tickets[idx] = { ..._tickets[idx], ...body, updatedAt: new Date().toISOString() };
  return _tickets[idx];
}

export function deleteTicket(id) {
  const idx = _tickets.findIndex(t => t.id === parseInt(id, 10));
  if (idx !== -1) _tickets.splice(idx, 1);
}

export function getUsers() {
  return DB.users;
}

export function queryComments(ticketId) {
  return _comments
    .filter(c => c.ticketId === parseInt(ticketId, 10))
    .sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
}

export function addComment(body) {
  const comment = { ...body, id: _nextCommentId++, createdAt: new Date().toISOString() };
  _comments.push(comment);
  return comment;
}
