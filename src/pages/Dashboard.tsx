import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  formatCurrency,
  formatDate,
  formatTime,
  isoToZonedParts,
  shiftDate,
  zonedTimeToIso,
} from "@/lib/utils";
import type { Booking } from "@/types";
import {
  CalendarDays,
  DollarSign,
  Users,
  UserCog,
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Settings,
  Clock3,
  ExternalLink,
} from "lucide-react";

interface DashboardStats {
  totalBookings: number;
  revenue: number;
  activeCustomers: number;
  staffCount: number;
}

const colorMap: Record<string, string> = {
  primary: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
  accent: "bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400",
  warning: "bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400",
};

export function Dashboard() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    revenue: 0,
    activeCustomers: 0,
    staffCount: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (!business) return;

      const businessId = business.id;
      const tz = business.timezone || "UTC";
      const todayBiz = isoToZonedParts(new Date().toISOString(), tz).date;
      const todayStartIso = zonedTimeToIso(todayBiz, "00:00", tz);
      const todayEndIso = zonedTimeToIso(shiftDate(todayBiz, 1), "00:00", tz);

      try {
        if (manual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [bookingsRes, customersRes, staffRes, todayRes] = await Promise.all([
          supabase
            .from("bookings")
            .select("*, service:services(*), staff:staff(*), customer:customers(*)")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
          supabase
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId),
          supabase
            .from("staff")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .eq("is_active", true),
          supabase
            .from("bookings")
            .select("*, service:services(*), staff:staff(*), customer:customers(*)")
            .eq("business_id", businessId)
            .gte("start_time", todayStartIso)
            .lt("start_time", todayEndIso)
            .neq("status", "cancelled")
            .order("start_time", { ascending: true }),
        ]);

        const firstError = bookingsRes.error || customersRes.error || staffRes.error || todayRes.error;
        if (firstError) {
          console.error("Dashboard load error:", firstError);
          setError("Failed to load dashboard data. Please try again.");
          return;
        }

        const allBookings = (bookingsRes.data || []) as unknown as Booking[];
        const today = (todayRes.data || []) as unknown as Booking[];
        const revenue = allBookings
          .filter((booking) => booking.payment_status === "paid")
          .reduce((sum, booking) => sum + Number(booking.price || 0), 0);

        setStats({
          totalBookings: allBookings.length,
          revenue,
          activeCustomers: customersRes.count || 0,
          staffCount: staffRes.count || 0,
        });
        setRecentBookings(allBookings.slice(0, 8));
        setTodayBookings(today.slice(0, 8));
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("An error occurred while loading the dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [business],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const nextBooking = useMemo(() => {
    const now = Date.now();
    return todayBookings.find((booking) => new Date(booking.start_time).getTime() >= now) ?? todayBookings[0];
  }, [todayBookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-primary-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md text-center">
          <AlertCircle size={32} className="mx-auto mb-2 text-error-600" />
          <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
          <button onClick={() => void loadDashboard(true)} className="btn-secondary mt-4">
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: t("total_bookings"), value: stats.totalBookings, icon: CalendarDays, sub: `${todayBookings.length} today`, color: "primary", to: "/bookings" },
    { label: t("revenue"), value: formatCurrency(stats.revenue, business?.currency || "USD"), icon: DollarSign, sub: "paid bookings", color: "accent", to: "/analytics" },
    { label: t("active_customers"), value: stats.activeCustomers, icon: Users, sub: "total registered", color: "warning", to: "/customers" },
    { label: t("staff_members"), value: stats.staffCount, icon: UserCog, sub: "active staff", color: "primary", to: "/staff" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gray-950 p-6 text-white shadow-sm sm:p-7">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary-600/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-accent-600/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary-200">
              <Sparkles size={14} />
              BUSINESS COMMAND CENTER
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("welcome_back")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Here's what's happening at {business?.name}. Monitor today's schedule, move quickly into operations, and keep your business data in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="btn-secondary border-white/10 bg-white/10 text-white hover:bg-white/15">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <Link to="/bookings" className="btn-primary">
              <Plus size={16} /> New booking
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} to={kpi.to} className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{kpi.sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[kpi.color]}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition group-hover:opacity-100">
                Open {kpi.label} <ArrowRight size={13} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Clock3 size={18} className="text-primary-600" />
                Today's schedule
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{todayBookings.length} active booking{todayBookings.length === 1 ? "" : "s"} today</p>
            </div>
            <Link to="/calendar" className="text-sm text-primary-600 hover:underline">Open calendar</Link>
          </div>

          {todayBookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments today"
              description="Create a booking or share your public booking page to fill the schedule."
              action={<Link to="/bookings" className="btn-primary"><Plus size={15} /> New booking</Link>}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {todayBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to="/bookings"
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-sm font-semibold">{formatTime(booking.start_time)}</p>
                    <p className="text-[11px] text-gray-400">{isoToZonedParts(booking.start_time, business?.timezone || "UTC").date}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{booking.customer?.name || "Unknown customer"}</p>
                    <p className="truncate text-xs text-gray-500">{booking.service?.name || "Service"} · {booking.staff?.name || "Unassigned"}</p>
                  </div>
                  <StatusBadge status={booking.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next appointment</p>
              <h2 className="mt-1 text-lg font-semibold">{nextBooking?.customer?.name || "You're clear"}</h2>
            </div>
            <CalendarDays size={20} className="text-primary-600" />
          </div>
          {nextBooking ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                <p className="font-medium">{nextBooking.service?.name || "Service"}</p>
                <p className="mt-1 text-sm text-gray-500">{nextBooking.staff?.name || "Unassigned staff"}</p>
                <p className="mt-3 text-sm font-medium">
                  {formatDate(nextBooking.start_time)} · {formatTime(nextBooking.start_time)}
                </p>
              </div>
              <Link to="/bookings" className="btn-secondary w-full justify-center">Open booking list <ArrowRight size={15} /></Link>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-gray-500">No upcoming appointment is scheduled for today.</p>
          )}
        </section>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { to: "/bookings", icon: CalendarDays, title: "Manage bookings", text: "Create, confirm, reschedule and track appointments." },
          { to: "/customers", icon: Users, title: "Customers", text: "Open customer records, history and notes." },
          { to: "/settings", icon: Settings, title: "Business setup", text: "Update your profile, timezone, booking rules and branding." },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <item.icon size={20} className="text-primary-600" />
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-500">{item.text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600">Open feature <ArrowRight size={14} /></span>
          </Link>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp size={18} className="text-primary-600" />
            {t("recent_bookings")}
          </h2>
          <div className="flex items-center gap-3">
            <a href={`/book/${business?.slug}`} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-sm text-gray-500 hover:text-gray-900 sm:flex dark:hover:text-white">
              Public page <ExternalLink size={13} />
            </a>
            <Link to="/bookings" className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
              {t("view_all")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("no_bookings")}
            description="Create your first booking to get started"
            action={<Link to="/bookings" className="btn-primary"><Plus size={15} /> New booking</Link>}
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentBookings.map((booking) => (
              <Link
                key={booking.id}
                to="/bookings"
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{booking.customer?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{booking.service?.name} · {booking.staff?.name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm">{formatDate(booking.start_time)}, {formatTime(booking.start_time)}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1.5">
                    <StatusBadge status={booking.status} />
                    <StatusBadge status={booking.payment_status} />
                  </div>
                </div>
                <p className="w-20 shrink-0 text-right text-sm font-medium">
                  {formatCurrency(Number(booking.price || 0), business?.currency || "USD")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
