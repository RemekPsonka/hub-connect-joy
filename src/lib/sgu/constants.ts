/**
 * SGU module constants — type-safe references to the `sgu` app_role
 * and related literals used across hooks, RLS guards and UI gating.
 *
 * Source of truth for the role enum lives in `public.app_role` (DB).
 * Keep this file in sync with migrations `20260206084517_*` (enum)
 * and `20260206084543_*` (helper functions).
 */

export const SGU_ROLE = 'sgu' as const;
export type SguRole = typeof SGU_ROLE;

/**
 * Member role inside `deal_team_members.role` that grants partner-level
 * privileges to an SGU team member (vs. plain rep).
 */
export const SGU_TEAM_ROLE_PARTNER = 'partner' as const;
export const SGU_TEAM_ROLE_REPRESENTATIVE = 'representative' as const;

export type SguTeamRole =
  | typeof SGU_TEAM_ROLE_PARTNER
  | typeof SGU_TEAM_ROLE_REPRESENTATIVE;

/**
 * Helper function names exposed by the DB for SGU access checks.
 * Use these constants when calling `supabase.rpc(...)` to avoid typos.
 */
export const SGU_RPC = {
  GET_TEAM_ID: 'get_sgu_team_id',
  IS_PARTNER: 'is_sgu_partner',
  IS_REPRESENTATIVE: 'is_sgu_representative',
  HAS_ACCESS: 'has_sgu_access',
  GET_CRM_CONTACT_BASIC: 'rpc_sgu_get_crm_contact_basic',
} as const;
