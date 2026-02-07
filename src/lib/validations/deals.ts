import { z } from "zod";

export const createDealSchema = z.object({
  title: z.string().min(1, "Tytuł jest wymagany").max(200, "Tytuł max 200 znaków"),
  stage_id: z.string().uuid("Etap musi być prawidłowym UUID"),
  value: z.number().min(0, "Wartość nie może być ujemna").optional(),
  currency: z
    .enum(["PLN", "EUR", "USD", "GBP", "CHF"])
    .default("PLN"),
  probability: z.number().min(0).max(100).optional(),
  contact_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .default("medium"),
  owner_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  stage_id: z.string().uuid().optional(),
  value: z.number().min(0).optional(),
  currency: z.enum(["PLN", "EUR", "USD", "GBP", "CHF"]).optional(),
  probability: z.number().min(0).max(100).optional(),
  contact_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  owner_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  lost_reason: z.string().nullable().optional(),
  probability_override: z.number().min(0).max(100).nullable().optional(),
  won_at: z.string().nullable().optional(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;
