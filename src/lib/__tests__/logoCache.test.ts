import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCachedLogo,
  setCachedLogo,
  extractDomain,
  clearExpiredLogos,
  getLogoUrl,
} from "../logoCache";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("extractDomain", () => {
  it("extracts from full URL", () => {
    expect(extractDomain("https://www.google.com/about")).toBe("google.com");
  });

  it("extracts from bare domain", () => {
    expect(extractDomain("google.com")).toBe("google.com");
  });

  it("strips www", () => {
    expect(extractDomain("www.example.com")).toBe("example.com");
  });

  it("returns null for null", () => {
    expect(extractDomain(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractDomain(undefined)).toBeNull();
  });

  it("handles invalid URLs gracefully", () => {
    expect(extractDomain("not a url !!!")).toBeNull();
  });
});

describe("logo cache", () => {
  it("returns undefined for uncached domain", () => {
    expect(getCachedLogo("example.com")).toBeUndefined();
  });

  it("caches and retrieves logo URL", () => {
    setCachedLogo("google.com", "https://logo.clearbit.com/google.com");
    expect(getCachedLogo("google.com")).toBe(
      "https://logo.clearbit.com/google.com",
    );
  });

  it("caches null for not-found logos", () => {
    setCachedLogo("nonexistent.xyz", null);
    expect(getCachedLogo("nonexistent.xyz")).toBeNull();
  });

  it("returns undefined for expired cache", () => {
    const oldEntry = JSON.stringify({
      url: "test",
      cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    localStorage.setItem("logo_example.com", oldEntry);
    expect(getCachedLogo("example.com")).toBeUndefined();
  });
});

describe("getLogoUrl", () => {
  it("generates Clearbit URL with custom size", () => {
    const url = getLogoUrl("google.com", 128);
    expect(url).toBe(
      "https://logo.clearbit.com/google.com?size=128&format=png",
    );
  });

  it("defaults to size 64", () => {
    expect(getLogoUrl("google.com")).toContain("size=64");
  });
});

describe("clearExpiredLogos", () => {
  it("removes expired entries", () => {
    const old = JSON.stringify({
      url: "test",
      cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    const fresh = JSON.stringify({ url: "test2", cachedAt: Date.now() });
    localStorage.setItem("logo_old.com", old);
    localStorage.setItem("logo_fresh.com", fresh);
    clearExpiredLogos();
    expect(localStorage.getItem("logo_old.com")).toBeNull();
    expect(localStorage.getItem("logo_fresh.com")).not.toBeNull();
  });

  it("ignores non-logo keys", () => {
    localStorage.setItem("other_key", "value");
    clearExpiredLogos();
    expect(localStorage.getItem("other_key")).toBe("value");
  });
});
