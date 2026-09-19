import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { formatCurrency, downloadCSV, isoToZonedParts } from "@/lib/utils";
import type { Booking } from "@/types";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BusinessAssistant } from "@/components/BusinessAssistant";

/** Calendar math on business-timezone date strings (YYYY-MM-DD). */
function shiftBizDate(bizDate: string, days: number): string {
  const [y, m, d] = bizDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split("T")[0];
}

export function Analytics() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadData = useCallback(async () => {
    if (!business) return;
    const businessId = business.id;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, service:services(*), staff:staff(*), customer:customers(*)")
      .eq("business_id", businessId)
      .order("start_time", { ascending: false });
    if (error) {
      console.error("Failed to load analytics:", error);
      setLoadError("Failed to load analytics. Please try again.");
      setLoading(false);
      return;
    }
    setBookings((data || []) as unknown as Booking[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!business) {
    return <p className="text-center text-gray-400 py-20">Complete onboarding to see analytics.</p>;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );

  if (loadError)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto mb-3 text-error-600" size={32} />
          <p className="text-gray-600 dark:text-gray-300">{loadError}</p>
          <button onClick={loadData} className="btn-secondary mt-3">
            Try again
          </button>
        </div>
      </div>
    );

  const tz = business.timezone || "UTC";
  // Business-timezone date of each booking (never the viewer's timezone).
  const withBizDate = bookings.map((b) => ({ b, date: isoToZonedParts(b.start_time, tz).date }));
  const today = isoToZonedParts(new Date().toISOString(), tz).date;
  const windowStart = shiftBizDate(today, -30);
  const prevStart = shiftBizDate(today, -60);

  const inWindow = (d: string, from: string, to: string) => d > from && d <= to;
  const current = withBizDate.filter(({ date }) => inWindow(date, windowStart, today));
  const previous = withBizDate.filter(({ date }) => inWindow(date, prevStart, windowStart));

  const sumRevenue = (rows: { b: Booking }[]) =>
    rows
      .filter(({ b }) => b.payment_status === "paid")
      .reduce((s, { b }) => s + Number(b.price), 0);
  const countCompleted = (rows: { b: Booking }[]) =>
    rows.filter(({ b }) => b.status === "completed").length;

  const revenue = sumRevenue(current);
  const prevRevenue = sumRevenue(previous);
  const completed = countCompleted(current);
  const prevCompleted = countCompleted(previous);
  const total = current.length;
  const prevTotal = previous.length;
  const completedAll = bookings.filter((b) => b.status === "completed");
  const cancelledAll = bookings.filter((b) => b.status === "cancelled");
  const completionRate = bookings.length > 0 ? (completedAll.length / bookings.length) * 100 : 0;

  /** Real period-over-period change, or a null label when the previous
   *  period has no data (we never display an invented trend). */
  const trendOf = (now: number, before: number): { label: string | null; up: boolean } => {
    if (before <= 0 && now <= 0) return { label: null, up: true };
    if (before <= 0) return { label: "+new", up: true };
    const pct = Math.round(((now - before) / before) * 100);
    if (pct === 0) return { label: "0%", up: true };
    return { label: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0 };
  };

  const completionRateCur = total > 0 ? (completed / total) * 100 : 0;
  const completionRatePrev = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0;
  const revenueTrend = trendOf(revenue, prevRevenue);
  const bookingsTrend = trendOf(total, prevTotal);
  const avgTrend = trendOf(
    total > 0 ? revenue / total : 0,
    prevTotal > 0 ? prevRevenue / prevTotal : 0,
  );
  const completionTrend = trendOf(completionRateCur, completionRatePrev);

  const kpis = [
    {
      label: t("total_revenue"),
      value: formatCurrency(revenue, business.currency || "USD"),
      icon: DollarSign,
      trend: revenueTrend,
    },
    {
      label: `${t("total_bookings")} (30d)`,
      value: total,
      icon: CalendarDays,
      trend: bookingsTrend,
    },
    {
      label: t("avg_booking_value"),
      value: formatCurrency(total > 0 ? revenue / total : 0, business.currency || "USD"),
      icon: TrendingUp,
      trend: avgTrend,
    },
    {
      label: t("completion_rate"),
      value: `${completionRate.toFixed(0)}%`,
      icon: CheckCircle2,
      trend: completionTrend,
    },
  ];

  // Last 7 business-timezone days.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const dayStr = shiftBizDate(today, i - 6);
    const count = withBizDate.filter(({ date }) => date === dayStr).length;
    return { date: dayStr.slice(5), bookings: count };
  });

  // Status breakdown (all time).
  const statusData = [
    {
      name: "Confirmed",
      value: bookings.filter((b) => b.status === "confirmed").length,
      color: "#3b82f6",
    },
    {
      name: "Pending",
      value: bookings.filter((b) => b.status === "pending").length,
      color: "#f59e0b",
    },
    { name: "Completed", value: completedAll.length, color: "#10b981" },
    { name: "Cancelled", value: cancelledAll.length, color: "#9ca3af" },
    {
      name: "No Show",
      value: bookings.filter((b) => b.status === "no_show").length,
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0);

  // Staff performance (all time, revenue = paid bookings only).
  const staffMap = new Map<string, { name: string; bookings: number; revenue: number }>();
  bookings.forEach((b) => {
    const name = b.staff?.name || "Unknown";
    const entry = staffMap.get(b.staff_id) || { name, bookings: 0, revenue: 0 };
    entry.bookings++;
    if (b.payment_status === "paid") entry.revenue += Number(b.price);
    staffMap.set(b.staff_id, entry);
  });
  const staffData = Array.from(staffMap.values());

  const handleExport = () => {
    downloadCSV(
      "analytics.csv",
      withBizDate.map(({ b, date }) => ({
        date,
        customer: b.customer?.name || "",
        service: b.service?.name || "",
        staff: b.staff?.name || "",
        status: b.status,
        payment: b.payment_status,
        price: b.price,
      })),
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("analytics")}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            KPIs compare the last 30 days with the 30 days before that, in the business timezone.
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download size={16} /> {t("export")} CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <k.icon size={18} className="text-primary-600" />
                </div>
                {k.trend.label === null ? (
                  <span className="text-xs text-gray-400">no prior data</span>
                ) : (
                  <span
                    className={`text-xs flex items-center gap-0.5 ${
                      k.trend.up ? "text-accent-600" : "text-error-600"
                    }`}
                  >
                    {k.trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{" "}
                    {k.trend.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Bookings — Last 7 Days (business time)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={last7}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                className="dark:stroke-gray-700"
              />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Status Breakdown</h3>
          {statusData.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 size={18} /> Staff Performance
          </h3>
        </div>
        {staffData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Staff</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Bookings</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Revenue (paid)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {staffData.map((s) => (
                  <tr key={s.name} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.bookings}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(s.revenue, business.currency || "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BusinessAssistant compact />
    </div>
  );
}
