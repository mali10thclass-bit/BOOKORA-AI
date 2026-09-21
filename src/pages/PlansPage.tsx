import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { getPlanLimits } from "@/lib/utils";
import type { PlanTier } from "@/types";
import { Check, CreditCard, Zap, Crown, Sparkles, ShieldCheck } from "lucide-react";

const PLAN_COLORS: Record<PlanTier, { bg: string; text: string }> = {
  free: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
  pro: {
    bg: "bg-primary-50 dark:bg-primary-900/20",
    text: "text-primary-600 dark:text-primary-400",
  },
  ultimate: {
    bg: "bg-accent-50 dark:bg-accent-900/20",
    text: "text-accent-600 dark:text-accent-400",
  },
};

export function PlansPage() {
  const { business } = useAuth();
  const { t } = useI18n();

  const plans: {
    tier: PlanTier;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    icon: typeof Zap;
  }[] = [
    { tier: "free", name: t("free"), priceMonthly: 0, priceYearly: 0, icon: Sparkles },
    { tier: "pro", name: t("pro"), priceMonthly: 29, priceYearly: 290, icon: Zap },
    { tier: "ultimate", name: t("ultimate"), priceMonthly: 79, priceYearly: 790, icon: Crown },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("plans")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose the plan that fits your business. Paid plans activate through billing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const limits = getPlanLimits(plan.tier);
          const isCurrent = business?.plan === plan.tier;
          const color = PLAN_COLORS[plan.tier];

          return (
            <div
              key={plan.tier}
              className={`card p-6 ${isCurrent ? "ring-2 ring-primary-500" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center`}>
                  <plan.icon size={20} className={color.text} />
                </div>
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  {isCurrent && (
                    <span className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs">
                      Current
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                <span className="text-sm text-gray-500">/month USD</span>
                {plan.priceYearly > 0 && (
                  <p className="text-xs text-gray-400 mt-1">${plan.priceYearly}/year (save 17%)</p>
                )}
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Staff:</span>
                  <span className="font-medium">
                    {limits.maxStaff === 999 ? "Unlimited" : limits.maxStaff}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Locations:</span>
                  <span className="font-medium">
                    {limits.maxLocations === 999 ? "Unlimited" : limits.maxLocations}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Services:</span>
                  <span className="font-medium">
                    {limits.maxServices === 999 ? "Unlimited" : limits.maxServices}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {limits.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-accent-600 shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{f}</span>
                  </div>
                ))}
              </div>

              <div
                className={`w-full rounded-lg px-3 py-2 text-center text-sm font-medium ${
                  isCurrent
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    : "border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                }`}
              >
                {isCurrent
                  ? "Current plan"
                  : plan.tier === "free"
                    ? "Available after billing setup"
                    : "Activate through billing"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4 flex items-center gap-3">
        <CreditCard size={20} className="text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">Billing Status</p>
          <p className="text-xs text-gray-500 capitalize">
            {business?.plan_status || "trialing"} · {business?.plan || "free"} plan
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={15} />
          <span>Plan changes are protected at the database boundary.</span>
        </div>
      </div>
    </div>
  );
}
