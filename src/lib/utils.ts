import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { BookingStatus, PaymentStatus, PlanTier } from "@/types";

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined, fmt = "MMM d, yyyy"): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "just now";
  if (mins < 0) return `${Math.abs(mins)}m ago`;
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}

export function statusColor(status: string | null | undefined): string {
  const colors: Record<string, string> = {
    pending: "warning",
    confirmed: "primary",
    completed: "accent",
    cancelled: "gray",
    no_show: "error",
    paid: "accent",
    unpaid: "warning",
    refunded: "gray",
    partial: "primary",
  };
  return colors[status ?? ""] || "gray";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPlanLimits(plan: PlanTier | string | null | undefined) {
  const limits = {
    free: {
      maxStaff: 3,
      maxLocations: 1,
      maxServices: 10,
      features: ["Basic dashboard", "Booking management", "1 location", "Email notifications"],
    },
    pro: {
      maxStaff: 15,
      maxLocations: 3,
      maxServices: 50,
      features: [
        "Everything in Free",
        "Up to 15 staff",
        "3 locations",
        "Analytics & CSV export",
        "SMS reminders",
        "AI assistant",
      ],
    },
    ultimate: {
      maxStaff: 999,
      maxLocations: 999,
      maxServices: 999,
      features: [
        "Everything in Pro",
        "Unlimited staff",
        "Unlimited locations",
        "White-label branding",
        "Priority support",
        "Advanced automation",
      ],
    },
  };
  return limits[(plan ?? "free") as PlanTier];
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const s = String(val).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
