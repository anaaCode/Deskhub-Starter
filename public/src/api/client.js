import { get as getStored } from "../utils/storage.js";

const LOCAL_URL = "http://localhost:3001";

let _probePromise = null;

// Probe immediately on module load so result is ready before login fires
function probe() {
  if (_probePromise) return _probePromise;
  _probePromise = (async () => {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 800);
      const res   = await fetch(LOCAL_URL + "/users?_limit=1", { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  })();
  return _probePromise;
}
probe(); // kick off immediately

export const isLocalAvailable = () => probe();

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
