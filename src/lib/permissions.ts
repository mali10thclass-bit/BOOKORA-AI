import { Role, PlanType } from "@/types";
import { PLANS } from "@/config/plans";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export function can(role: Role, permission: string): boolean {
  const permissions: Record<Role, string[]> = {
    OWNER: [
      "business.manage",
      "customers.manage",
      "services.manage",
      "staff.manage",
      "appointments.manage",
      "payments.manage",
      "analytics.view",
      "settings.manage",
      "subscription.manage",
      "audit.view",
      "notifications.manage",
      "ai.use",
      "public_booking.manage",
      "customer_self_service.manage",
    ],
    ADMIN: [
      "business.manage",
      "customers.manage",
      "services.manage",
      "staff.manage",
      "appointments.manage",
      "payments.manage",
      "analytics.view",
      "settings.manage",
      "notifications.manage",
      "audit.view",
    ],
    STAFF: [
      "appointments.view_own",
      "appointments.update_status",
      "customers.view_basic",
      "calendar.view_own",
    ],
  };

  return permissions[role]?.includes(permission) || false;
}

export function requirePermission(role: Role, permission: string): void {
  if (!can(role, permission)) {
    throw new PermissionError(`Permission denied: ${permission}`);
  }
}

export function hasFeature(plan: PlanType, feature: keyof typeof PLANS[PlanType]["features"]): boolean {
  return PLANS[plan].features[feature];
}

export function getPlanLimits(plan: PlanType) {
  return PLANS[plan].limits;
}

export function checkLimit(plan: PlanType, resource: keyof ReturnType<typeof getPlanLimits>, currentCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentCount < limits[resource];
}

export function getUpgradeMessage(plan: PlanType, feature: string): string {
  return `Upgrade to ${plan === "FREE" ? "Pro" : "Ultimate"} to unlock ${feature}`;
}

export function canAccessFeature(role: Role, plan: PlanType, permission: string, feature: keyof typeof PLANS[PlanType]["features"]): boolean {
  return can(role, permission) && hasFeature(plan, feature);
}