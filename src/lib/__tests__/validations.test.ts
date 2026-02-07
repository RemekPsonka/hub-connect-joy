import { describe, it, expect } from "vitest";
import { createDealSchema, updateDealSchema } from "../validations/deals";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createDealSchema", () => {
  it("validates a correct deal", () => {
    const result = createDealSchema.safeParse({
      title: "Test Deal",
      stage_id: VALID_UUID,
      currency: "PLN",
      priority: "medium",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createDealSchema.safeParse({
      title: "",
      stage_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("title");
    }
  });

  it("rejects invalid currency", () => {
    const result = createDealSchema.safeParse({
      title: "Deal",
      stage_id: VALID_UUID,
      currency: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = createDealSchema.safeParse({
      title: "Deal",
      stage_id: VALID_UUID,
      value: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as undefined", () => {
    const result = createDealSchema.safeParse({
      title: "Minimal Deal",
      stage_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for stage_id", () => {
    const result = createDealSchema.safeParse({
      title: "Deal",
      stage_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    const result = createDealSchema.safeParse({
      title: "A".repeat(201),
      stage_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDealSchema", () => {
  it("allows partial updates with id", () => {
    const result = updateDealSchema.safeParse({
      id: VALID_UUID,
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects probability_override over 100", () => {
    const result = updateDealSchema.safeParse({
      id: VALID_UUID,
      probability_override: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts probability_override in range", () => {
    const result = updateDealSchema.safeParse({
      id: VALID_UUID,
      probability_override: 75,
    });
    expect(result.success).toBe(true);
  });

  it("accepts lost_reason", () => {
    const result = updateDealSchema.safeParse({
      id: VALID_UUID,
      lost_reason: "Zbyt wysoka cena",
    });
    expect(result.success).toBe(true);
  });

  it("requires id", () => {
    const result = updateDealSchema.safeParse({
      priority: "high",
    });
    expect(result.success).toBe(false);
  });
});
