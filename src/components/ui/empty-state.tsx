import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox, ArrowLeft } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  illustration?: string;
}

function EmptyState({
  title = "No data",
  description = "There's nothing here yet. Get started by creating something new.",
  icon,
  action,
  className,
}: EmptyStateProps) {
  const defaultIcon = icon || (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
      <Inbox className="h-10 w-10 text-emerald-500" />
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-8 text-center",
        className
      )}
    >
      <div className="mb-4 animate-in fade-in-0 zoom-in-95">{defaultIcon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 transition-all hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" />
          {action.label}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
