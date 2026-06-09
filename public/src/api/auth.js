import { get } from "./client.js";
import { isLocalAvailable } from "./client.js";
import { DB } from "../data/db.js";
import * as storage from "../utils/storage.js";

export async function login(email, password) {
  let user;

  if (await isLocalAvailable()) {
    const users = await get(`/users?email=${encodeURIComponent(email)}`);
    user = users[0];
  } else {
    // Static fallback — check against embedded DB
    user = DB.users.find(u => u.email === email);
  }

  if (!user || user.password !== password) {
    throw new Error("Invalid email or password");
  }

  const token = crypto.randomUUID();
  storage.set("token", token);
  // Don't store the raw password
  const { password: _, ...safeUser } = user;
  storage.set("user", safeUser);

  return { token, user: safeUser };
}

export function logout() {
  storage.remove("token");
  storage.remove("user");
}

export function getCurrentUser() {
  return storage.get("user");
}

export function isAuthenticated() {
  return storage.get("token") !== null;
}
