import { get as getStored } from "../utils/storage.js";

const LOCAL_URL = "http://localhost:3001";

// Detect at startup whether json-server is reachable.
// We cache the result so we only probe once per page load.
let _useLocal = null;

export async function isLocalAvailable() {
  if (_useLocal !== null) return _useLocal;
  try {
    const res = await fetch(LOCAL_URL + "/users?_limit=1", { signal: AbortSignal.timeout(1500) });
    _useLocal = res.ok;
  } catch {
    _useLocal = false;
  }
  return _useLocal;
}

export async function request(path, options = {}) {
  try {
    const headers = { ...options.headers };
    if (options.body) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    const token = getStored("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(LOCAL_URL + path, { ...options, headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    if (err instanceof TypeError) throw new Error("Network error — is the API server running?");
    throw err;
  }
}

export const get   = (path)       => request(path);
export const post  = (path, body) => request(path, { method: "POST",   body });
export const patch = (path, body) => request(path, { method: "PATCH",  body });
export const put   = (path, body) => request(path, { method: "PUT",    body });
export const del   = (path)       => request(path, { method: "DELETE" });
