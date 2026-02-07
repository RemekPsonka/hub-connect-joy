import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

beforeEach(() => {
  localStorage.clear();
});

describe("useCompanyLogo", () => {
  it("returns initials when no website", () => {
    const { result } = renderHook(() => useCompanyLogo("Acme Corp", null));
    expect(result.current.initials).toBe("AC");
    expect(result.current.logoUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("generates correct initials for single word", () => {
    const { result } = renderHook(() => useCompanyLogo("Google", null));
    expect(result.current.initials).toBe("G");
  });

  it("generates correct initials for multiple words", () => {
    const { result } = renderHook(() =>
      useCompanyLogo("Polska Grupa Energetyczna", null),
    );
    expect(result.current.initials).toBe("PG");
  });

  it("returns ? for null company name", () => {
    const { result } = renderHook(() => useCompanyLogo(null, null));
    expect(result.current.initials).toBe("?");
  });

  it("returns cached logo immediately", () => {
    const domain = "google.com";
    const logoUrl = "https://logo.clearbit.com/google.com?size=64&format=png";
    localStorage.setItem(
      `logo_${domain}`,
      JSON.stringify({ url: logoUrl, cachedAt: Date.now() }),
    );
    const { result } = renderHook(() =>
      useCompanyLogo("Google", "https://google.com"),
    );
    expect(result.current.logoUrl).toBe(logoUrl);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns null for cached not-found domain", () => {
    const domain = "nologo.xyz";
    localStorage.setItem(
      `logo_${domain}`,
      JSON.stringify({ url: null, cachedAt: Date.now() }),
    );
    const { result } = renderHook(() =>
      useCompanyLogo("NoLogo", "nologo.xyz"),
    );
    expect(result.current.logoUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("uses overrideLogoUrl when provided", () => {
    const override = "https://example.com/custom-logo.png";
    const { result } = renderHook(() =>
      useCompanyLogo("Test", "test.com", override),
    );
    expect(result.current.logoUrl).toBe(override);
    expect(result.current.isLoading).toBe(false);
  });
});
