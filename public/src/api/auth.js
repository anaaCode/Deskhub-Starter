import { get } from "./client.js";
import * as storage from "../utils/storage.js";

export async function login(email, password) {
  const users = await get(`/users?email=${encodeURIComponent(email)}`);
  const user = users[0];

  if (!user || user.password !== password) {
    throw new Error("Invalid credentials");
  }

  const token = crypto.randomUUID();
  storage.set("token", token);
  storage.set("user", user);

  return { token, user };
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