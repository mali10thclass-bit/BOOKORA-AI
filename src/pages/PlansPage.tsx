import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { getPlanLimits } from "@/lib/utils";
import type { PlanTier } from "@/types";
import { Check, CreditCard, Zap, Crown, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

/** Static class map — dynamic `bg-${color}-50` names are not compiled
 *  by Tailwind and would render unstyled. */
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
  const { business, refreshBusiness } = useAuth();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

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

  const switchPlan = async (tier: PlanTier) => {
    if (!business) return;
    setSwitching(true);
    setError(null);
    const { error: updError } = await supabase
      .from("businesses")
      .update({ plan: tier, plan_status: "active" })
      .eq("id", business.id);
    if (updError) {
      console.error("Failed to change plan:", updError);
      setError(`Could not change the plan: ${updError.message}`);
      setSwitching(false);
      return;
    }
    await refreshBusiness();
    setSwitching(false);
    setConfirming(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("plans")}</h1>
        <p className="text-sm text-gray-500 mt-1">Choose the plan that fits your business</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-error-300 bg-error-50 dark:bg-error-900/20 dark:border-error-800 px-4 py-3 text-sm text-error-700 dark:text-error-300">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-error-500"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

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
                <div
                  className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center`}
                >
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
                {limits.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-accent-600 shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setConfirming(plan.tier)}
                disabled={isCurrent || switching}
                className={`btn w-full ${isCurrent ? "btn-secondary" : "btn-primary"}`}
              >
                {isCurrent ? "Current Plan" : `Switch to ${plan.name}`}
              </button>
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
        <p className="text-xs text-gray-400">
          Online payment integration requires Stripe configuration
        </p>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !switching && setConfirming(null)}
          />
          <div className="relative w-full max-w-md card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning-600" />
              <h3 className="font-semibold">
                Switch to {plans.find((p) => p.tier === confirming)?.name}?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Billing is not connected yet, so{" "}
              <span className="font-medium">no payment will be taken</span>. The plan label and
              limits will change immediately, and the change is recorded on your business.
            </p>
            {error && <p className="text-sm text-error-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                disabled={switching}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => confirming && switchPlan(confirming)}
                disabled={switching}
                className="btn-primary"
              >
                {switching ? "Switching..." : "Confirm (no charge)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
