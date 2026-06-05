const PREFIX = "deskhub:";

export function get(key) {
  try {
    const val = localStorage.getItem(PREFIX + key);
    return val === null ? null : JSON.parse(val);
  } catch {
    return null;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

export function clear() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
}