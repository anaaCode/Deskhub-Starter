import { get as getStored } from "../utils/storage.js";

const BASE_URL = "http://localhost:3001";

export async function request(path, options = {}) {
  try {
    const headers = { ...options.headers };

    if (options.body) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const token = getStored("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(BASE_URL + path, { ...options, headers });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }

    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Network error — is the API server running?");
    }
    throw err;
  }
}

export const get   = (path)       => request(path);
export const post  = (path, body) => request(path, { method: "POST",   body });
export const patch = (path, body) => request(path, { method: "PATCH",  body });
export const put   = (path, body) => request(path, { method: "PUT",    body });
export const del   = (path)       => request(path, { method: "DELETE" });