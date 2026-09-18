import * as React from "react";
import { cn } from "@/lib/utils";
import { ToastProvider, ToastViewport, Toast } from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

interface ToastData {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastColors = {
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-200 bg-blue-50",
};

const toastIconColors = {
  success: "text-emerald-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
};

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toastIcons[toast.type];

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg animate-in slide-in-from-right fade-in-0",
        toastColors[toast.type]
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", toastIconColors[toast.type])} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-slate-600">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/50 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <ToastViewport className="fixed top-4 right-4 z-[100] flex flex-col gap-2" />
  );
}

export { Toast, ToastContainer };
