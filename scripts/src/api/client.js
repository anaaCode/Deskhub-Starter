import { get as getStored } from "../utils/storage.js";

const BASE_URL = "http://localhost:3001";
const STATIC_DATA_KEY = "deskhub-static-data";

function isLocalApiAvailable() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

async function loadStaticData() {
  const stored = localStorage.getItem(STATIC_DATA_KEY);
  if (stored) return JSON.parse(stored);

  const res = await fetch(new URL("../../db.json", import.meta.url));
  if (!res.ok) throw new Error("Could not load static data");

  const data = await res.json();
  localStorage.setItem(STATIC_DATA_KEY, JSON.stringify(data));
  return data;
}

function saveStaticData(data) {
  localStorage.setItem(STATIC_DATA_KEY, JSON.stringify(data));
}

function matchesQuery(item, searchParams) {
  for (const [key, value] of searchParams.entries()) {
    // skip pagination/sort params
    if (["_page", "_limit", "_sort", "_order", "q"].includes(key)) continue;
    if (String(item[key]) !== value) return false;
  }
  return true;
}

function fullTextMatch(item, q) {
  const lower = q.toLowerCase();
  return Object.values(item).some(v =>
    String(v ?? "").toLowerCase().includes(lower)
  );
}

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER = { open: 1, "in-progress": 2, resolved: 3, closed: 4 };

async function staticRequest(path, options = {}) {
  const method = options.method || "GET";
  const url = new URL(path, window.location.origin);
  const [, collection, id] = url.pathname.split("/");
  const data = await loadStaticData();

  if (!data[collection]) throw new Error(`Unknown resource: ${collection}`);

  if (method === "GET") {
    let items = [...data[collection]];

    if (id) {
      const item = items.find(e => String(e.id) === id);
      if (!item) throw new Error("Not found");
      return { data: item, total: 1 };
    }

    // Full text search
    const q = url.searchParams.get("q");
    if (q) items = items.filter(i => fullTextMatch(i, q));

    // Exact filters
    items = items.filter(i => matchesQuery(i, url.searchParams));

    // Sort
    const sort = url.searchParams.get("_sort");
    const order = url.searchParams.get("_order") || "asc";
    if (sort) {
      items.sort((a, b) => {
        let av = a[sort], bv = b[sort];
        if (sort === "priority") { av = PRIORITY_ORDER[av] || 0; bv = PRIORITY_ORDER[bv] || 0; }
        else if (sort === "status") { av = STATUS_ORDER[av] || 0; bv = STATUS_ORDER[bv] || 0; }
        if (av < bv) return order === "asc" ? -1 : 1;
        if (av > bv) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const total = items.length;

    // Pagination
    const page  = parseInt(url.searchParams.get("_page"))  || null;
    const limit = parseInt(url.searchParams.get("_limit")) || null;
    if (page && limit) {
      const start = (page - 1) * limit;
      items = items.slice(start, start + limit);
    }

    return { data: items, total };
  }

  if (method === "POST") {
    const nextId = Math.max(0, ...data[collection].map(i => Number(i.id) || 0)) + 1;
    const item = { id: nextId, ...options.body };
    data[collection].push(item);
    saveStaticData(data);
    return { data: item, total: 1 };
  }

  if (method === "PATCH" || method === "PUT") {
    const idx = data[collection].findIndex(e => String(e.id) === id);
    if (idx === -1) throw new Error("Not found");
    data[collection][idx] = method === "PUT"
      ? { id: data[collection][idx].id, ...options.body }
      : { ...data[collection][idx], ...options.body };
    saveStaticData(data);
    return { data: data[collection][idx], total: 1 };
  }

  if (method === "DELETE") {
    data[collection] = data[collection].filter(e => String(e.id) !== id);
    saveStaticData(data);
    return { data: null, total: 0 };
  }

  throw new Error(`Unsupported method: ${method}`);
}

/**
 * Core request. Returns { data, total } where total comes from
 * X-Total-Count header (json-server) or static fallback.
 */
export async function request(path, options = {}) {
  if (!isLocalApiAvailable()) {
    return staticRequest(path, options);
  }

  try {
    const headers = { ...options.headers };

    if (options.body) {
      headers["Content-Type"] = "application/json";
      options = { ...options, body: JSON.stringify(options.body) };
    }

    const token = getStored("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(BASE_URL + path, { ...options, headers });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }

    if (res.status === 204) return { data: null, total: 0 };

    const total = parseInt(res.headers.get("X-Total-Count")) || 0;
    const data  = await res.json();
    return { data, total };
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Network error — is the API server running?");
    }
    throw err;
  }
}

export const get   = (path)       => request(path);
export const post  = (path, body) => request(path, { method: "POST",  body });
export const patch = (path, body) => request(path, { method: "PATCH", body });
export const del   = (path)       => request(path, { method: "DELETE" });