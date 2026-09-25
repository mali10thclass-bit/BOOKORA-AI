import { Bot, ArrowRight, Lock } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { BusinessAssistant } from "@/components/BusinessAssistant";
import { useAuth } from "@/context/AuthContext";

export function DashboardCopilotCard() {
  const { business } = useAuth();
  const plan = business?.plan ?? "free";

  if (plan === "free") {
    return (
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="font-semibold">AI Business Copilot</h2>
            <p className="text-xs text-gray-500">Ask questions about your real business data</p>
          </div>
        </div>
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Lock size={18} />
          </div>
          <p className="mt-3 text-sm font-medium">Available on Pro and Ultimate</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
            Use natural language to explore bookings, revenue, customers and staff without leaving the dashboard.
          </p>
          <Link to="/plans" className="btn-secondary mt-4">
            View plans <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/40 p-1 dark:border-primary-900/30 dark:bg-primary-950/10">
      <BusinessAssistant compact />
    </section>
  );
}
