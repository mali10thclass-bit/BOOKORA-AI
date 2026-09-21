import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { getPlanLimits } from "@/lib/utils";
import type { PlanTier } from "@/types";

interface PlanGateProps {
  minimumPlan: Exclude<PlanTier, "free">;
  children: ReactNode;
  featureName: string;
}

const rank: Record<PlanTier, number> = { free: 0, pro: 1, ultimate: 2 };

export function PlanGate({ minimumPlan, children, featureName }: PlanGateProps) {
  const { business } = useAuth();
  const current = (business?.plan || "free") as PlanTier;

  if (rank[current] >= rank[minimumPlan]) return <>{children}</>;

  const limits = getPlanLimits(minimumPlan);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
      <div className="card w-full p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 text-xl font-bold">{featureName} is a {minimumPlan === "ultimate" ? "Ultimate" : "Pro"} feature</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Your current {current} plan does not include this feature. Upgrade to unlock it.
        </p>
        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-left dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} className="text-primary-600" />
            {minimumPlan === "ultimate" ? "Ultimate" : "Pro"} includes
          </div>
          <ul className="mt-2 space-y-1 text-xs text-gray-500">
            {limits.features.slice(0, 5).map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </div>
        <Link to="/plans" className="btn-primary mt-6">
          View plans
        </Link>
      </div>
    </div>
  );
}
