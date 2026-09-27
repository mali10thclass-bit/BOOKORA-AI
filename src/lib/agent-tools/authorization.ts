/**
 * BOOKORA AI — action-request authorization policy.
 *
 * Pure mirror of `is_business_manager_or_above()` /
 * `set_ai_action_request_decision()` in
 * supabase/migrations/20260927_001_restrict_ai_action_decisions.sql.
 *
 * The database remains the final authority (SECURITY DEFINER functions with
 * their own checks). This module exists so the server layer can deny early
 * with a clear message and so the policy is unit-testable without a database.
 */

export type BusinessRole = "owner" | "admin" | "manager" | "staff";

/** Mirrors SQL role_rank(): owner 4, admin 3, manager 2, staff 1, else 0. */
export function roleRank(role: string | null | undefined): number {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "manager":
      return 2;
    case "staff":
      return 1;
    default:
      return 0;
  }
}

/**
 * Management gate: owner, admin and manager may approve/reject AI action
 * requests. Staff, unknown roles and non-members may not.
 */
export function canDecideActionRequests(role: string | null | undefined): boolean {
  return roleRank(role) >= 2;
}

/** Same gate for executing an approved action. */
export function canExecuteActionRequests(role: string | null | undefined): boolean {
  return canDecideActionRequests(role);
}

export const DECISION_DENIED_MESSAGE =
  "Approving or rejecting AI actions requires an owner, admin, or manager role.";

export const EXECUTION_DENIED_MESSAGE =
  "Executing approved AI actions requires an owner, admin, or manager role.";
