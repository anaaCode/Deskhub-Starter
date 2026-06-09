/* ═══════════════════════════════════════════════════════════════
   Vitest unit tests — DeskHub utility functions
   Coverage: formatDate, formatDateTime, formatRelative,
             debounce, storage (get/set/remove/clear)
   ═══════════════════════════════════════════════════════════════ */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ────────────────────────────────────────────────────────────────
   formatDate / formatDateTime / formatRelative
   We import the pure functions directly — no DOM needed.
──────────────────────────────────────────────────────────────── */
import { formatDate, formatDateTime, formatRelative } from "../public/src/utils/formatDate.js";

describe("formatDate", () => {
  it("returns '—' for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns '—' for empty string", () => {
    expect(formatDate("")).toBe("—");
  });

  it("formats a valid ISO string to a human date", () => {
    const result = formatDate("2026-05-07T10:30:00.000Z");
    // Should contain the year at minimum
    expect(result).toContain("2026");
    // Should not contain T or Z (raw ISO chars)
    expect(result).not.toContain("T");
  });

  it("handles Unix epoch correctly", () => {
    const result = formatDate("1970-01-01T00:00:00.000Z");
    expect(result).toContain("1970");
  });
});

describe("formatDateTime", () => {
  it("returns '—' for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns '—' for empty string", () => {
    expect(formatDateTime("")).toBe("—");
  });

  it("includes both date and time parts", () => {
    const result = formatDateTime("2026-05-07T14:30:00.000Z");
    expect(result).toContain("2026");
    // Should include some form of hour/minute separator
    expect(result.length).toBeGreaterThan(10);
  });

  it("is longer than formatDate for same input", () => {
    const iso = "2026-05-07T10:30:00.000Z";
    expect(formatDateTime(iso).length).toBeGreaterThan(formatDate(iso).length);
  });
});

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '—' for falsy input", () => {
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative("")).toBe("—");
  });

  it("returns 'just now' for < 1 minute ago", () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    expect(formatRelative("2026-06-01T11:59:45.000Z")).toBe("just now");
  });

  it("returns '5m ago' for 5 minutes ago", () => {
    vi.setSystemTime(new Date("2026-06-01T12:05:00.000Z"));
    expect(formatRelative("2026-06-01T12:00:00.000Z")).toBe("5m ago");
  });

  it("returns '2h ago' for 2 hours ago", () => {
    vi.setSystemTime(new Date("2026-06-01T14:00:00.000Z"));
    expect(formatRelative("2026-06-01T12:00:00.000Z")).toBe("2h ago");
  });

  it("returns '3d ago' for 3 days ago", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
    expect(formatRelative("2026-06-01T12:00:00.000Z")).toBe("3d ago");
  });

  it("falls back to formatDate for 8+ days ago", () => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    const result = formatRelative("2026-06-01T12:00:00.000Z");
    // Should be a date string (contains "2026"), NOT "Xd ago"
    expect(result).toContain("2026");
    expect(result).not.toMatch(/^\d+d ago$/);
  });
});

/* ────────────────────────────────────────────────────────────────
   debounce
──────────────────────────────────────────────────────────────── */
import { debounce } from "../public/src/utils/debounce.js";

describe("debounce", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach  (() => { vi.useRealTimers(); });

  it("delays execution by the specified wait", () => {
    const fn = vi.fn();
    const db = debounce(fn, 300);
    db();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on repeated calls (leading-edge suppression)", () => {
    const fn = vi.fn();
    const db = debounce(fn, 300);
    db(); db(); db();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes arguments through to the wrapped function", () => {
    const fn = vi.fn();
    const db = debounce(fn, 100);
    db("hello", 42);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("hello", 42);
  });

  it("can fire multiple times when called with sufficient gap", () => {
    const fn = vi.fn();
    const db = debounce(fn, 200);
    db();
    vi.advanceTimersByTime(200);
    db();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("returns a function", () => {
    expect(typeof debounce(() => {}, 100)).toBe("function");
  });
});

/* ────────────────────────────────────────────────────────────────
   storage (get / set / remove / clear)
   We mock localStorage using a Map so no DOM is needed.
──────────────────────────────────────────────────────────────── */
describe("storage utils", async () => {
  // Provide a minimal localStorage shim before importing the module
  const store = new Map();
  global.localStorage = {
    getItem:    (k) => store.has(k) ? store.get(k) : null,
    setItem:    (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
    get length() { return store.size; },
    key:        (i) => [...store.keys()][i] ?? null,
    [Symbol.iterator]: function* () { yield* store.keys(); },
  };
  // Polyfill Object.keys(localStorage) used in clear()
  Object.keys = (() => {
    const orig = Object.keys.bind(Object);
    return (obj) => {
      if (obj === global.localStorage) return [...store.keys()];
      return orig(obj);
    };
  })();

  const { get, set, remove, clear } = await import("../public/src/utils/storage.js");

  beforeEach(() => store.clear());

  it("set + get round-trips a string", () => {
    set("name", "DeskHub");
    expect(get("name")).toBe("DeskHub");
  });

  it("set + get round-trips an object", () => {
    const obj = { id: 1, role: "admin" };
    set("user", obj);
    expect(get("user")).toEqual(obj);
  });

  it("get returns null for missing key", () => {
    expect(get("nonexistent")).toBeNull();
  });

  it("remove deletes the key", () => {
    set("token", "abc123");
    remove("token");
    expect(get("token")).toBeNull();
  });

  it("clear removes all deskhub: prefixed keys", () => {
    set("a", 1); set("b", 2);
    clear();
    expect(get("a")).toBeNull();
    expect(get("b")).toBeNull();
  });

  it("set returns true on success", () => {
    expect(set("key", "val")).toBe(true);
  });

  it("does not store the raw value — JSON-encodes it", () => {
    set("num", 42);
    // raw localStorage value should be JSON-encoded
    const raw = store.get("deskhub:num");
    expect(raw).toBe("42");
  });
});
