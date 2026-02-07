import { describe, it, expect } from "vitest";
import { formatCurrency, formatCompactCurrency } from "../formatCurrency";

describe("formatCurrency", () => {
  it("formats PLN correctly", () => {
    const result = formatCurrency(1500, "PLN");
    expect(result).toContain("1");
    expect(result).toContain("500");
  });

  it("returns em-dash for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("handles zero", () => {
    const result = formatCurrency(0, "PLN");
    expect(result).toContain("0");
  });

  it("handles decimals", () => {
    const result = formatCurrency(1500.5, "PLN");
    expect(result).toBeTruthy();
  });

  it("supports EUR, USD, GBP", () => {
    expect(formatCurrency(1000, "EUR")).toBeTruthy();
    expect(formatCurrency(1000, "USD")).toBeTruthy();
    expect(formatCurrency(1000, "GBP")).toBeTruthy();
  });

  it("defaults to PLN when no currency provided", () => {
    const result = formatCurrency(100);
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});

describe("formatCompactCurrency", () => {
  it("formats millions as M", () => {
    expect(formatCompactCurrency(1_500_000, "PLN")).toBe("1.5M PLN");
  });

  it("formats exact millions without decimal", () => {
    expect(formatCompactCurrency(2_000_000, "PLN")).toBe("2M PLN");
  });

  it("formats thousands as K", () => {
    expect(formatCompactCurrency(50_000, "PLN")).toBe("50K PLN");
  });

  it("formats small values normally", () => {
    const result = formatCompactCurrency(500, "PLN");
    expect(result).toBe("500 PLN");
  });

  it("returns em-dash for null", () => {
    expect(formatCompactCurrency(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatCompactCurrency(undefined)).toBe("—");
  });
});
