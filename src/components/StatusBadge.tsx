const statusStyles: Record<string, string> = {
  pending: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
  confirmed: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
  completed: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  no_show: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
  paid: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
  unpaid: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
  refunded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  partial: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
};

export function StatusBadge({ status }: { status: string | null }) {
  return (
    <span
      className={`badge ${statusStyles[status ?? "pending"] || statusStyles["pending"]} capitalize`}
    >
      {(status ?? "pending").replace("_", " ")}
    </span>
  );
}
