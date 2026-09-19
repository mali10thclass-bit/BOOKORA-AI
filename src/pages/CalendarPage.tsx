import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, isoToZonedParts, shiftDate, zonedTimeToIso } from "@/lib/utils";
import type { Booking } from "@/types";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0=Sun) of a YYYY-MM-DD calendar date. */
function dow(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM" of a YYYY-MM-DD date shifted by `months` months. */
function addMonthsKey(dateStr: string, months: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

function monthTitle(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function CalendarPage() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // All calendar math happens on business-timezone date strings so the
  // grid matches what the business experiences (viewer TZ independent).
  const [cursor, setCursor] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [reloadKey, setReloadKey] = useState(0);

  const tz = business?.timezone || "UTC";

  useEffect(() => {
    if (business) setCursor(isoToZonedParts(new Date().toISOString(), tz).date);
  }, [business, tz]);

  useEffect(() => {
    if (!business || !cursor) return;
    // Capture after the guard: hoisted function declarations reset
    // TypeScript's narrowing of the outer consts.
    const businessId = business.id;
    const cursorDate = cursor;
    async function load() {
      const monthKey = cursorDate.slice(0, 7);
      let gridStart: string;
      let gridEnd: string;
      if (view === "month") {
        const first = `${monthKey}-01`;
        gridStart = shiftDate(first, -dow(first));
        // Cover the full 6-week (42-cell) grid the UI renders.
        gridEnd = shiftDate(gridStart, 42);
      } else if (view === "week") {
        gridStart = shiftDate(cursorDate, -dow(cursorDate));
        gridEnd = shiftDate(gridStart, 6);
      } else {
        gridStart = cursorDate;
        gridEnd = shiftDate(cursorDate, 1);
      }
      const { data, error } = await supabase
        .from("bookings")
        .select("*, service:services(*), staff:staff(*), customer:customers(*)")
        .eq("business_id", businessId)
        .gte("start_time", zonedTimeToIso(gridStart, "00:00", tz))
        .lt("start_time", zonedTimeToIso(gridEnd, "00:00", tz))
        .order("start_time");
      if (error) {
        console.error("Failed to load calendar:", error);
        setLoadError("Failed to load the calendar. Please try again.");
        setLoading(false);
        return;
      }
      setBookings((data || []) as unknown as Booking[]);
      setLoading(false);
    }
    load();
  }, [business, cursor, view, tz, reloadKey]);

  if (!business || !cursor) {
    return (
      <p className="text-center text-gray-400 py-20">Complete onboarding to see the calendar.</p>
    );
  }

  const monthKey = cursor.slice(0, 7);
  const todayBiz = isoToZonedParts(new Date().toISOString(), tz).date;

  const cells: string[] = (() => {
    if (view === "day") return [cursor];
    if (view === "week")
      return Array.from({ length: 7 }, (_, i) => shiftDate(cursor, i - dow(cursor)));
    const first = `${monthKey}-01`;
    const gridStart = shiftDate(first, -dow(first));
    return Array.from({ length: 42 }, (_, i) => shiftDate(gridStart, i));
  })();

  const bizDate = (b: Booking) => isoToZonedParts(b.start_time, tz).date;
  const bookingsForDay = (dayStr: string) => bookings.filter((b) => bizDate(b) === dayStr);

  const navigate = (dir: number) => {
    if (view === "month") setCursor(`${addMonthsKey(cursor, dir)}-01`);
    else setCursor(shiftDate(cursor, view === "week" ? dir * 7 : dir));
  };

  const title =
    view === "month"
      ? monthTitle(monthKey)
      : view === "week"
        ? `${shiftDate(cursor, -dow(cursor))} — ${shiftDate(cursor, 6 - dow(cursor))}`
        : cursor;

  const cancelledStyle = "bg-gray-100 dark:bg-gray-800 text-gray-400 line-through";

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("calendar")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-primary-600 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setCursor(todayBiz)} className="btn-secondary text-sm">
            {t("today")}
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2" aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-lg min-w-[180px] text-center">{title}</span>
          <button onClick={() => navigate(1)} className="btn-ghost p-2" aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : loadError ? (
          <div className="py-20 text-center">
            <AlertCircle className="mx-auto mb-3 text-error-600" size={32} />
            <p className="text-gray-600 dark:text-gray-300">{loadError}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="btn-secondary mt-3">
              Try again
            </button>
          </div>
        ) : view === "day" ? (
          <div className="p-4">
            {bookingsForDay(cursor).length === 0 ? (
              <p className="text-center text-gray-400 py-12">No bookings for this day</p>
            ) : (
              <div className="space-y-2">
                {bookingsForDay(cursor).map((b) => {
                  const time = isoToZonedParts(b.start_time, tz).time;
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="w-16 text-right">
                        <p className="text-sm font-medium">{time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{b.customer?.name}</p>
                        <p className="text-xs text-gray-500">
                          {b.service?.name} · {b.staff?.name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 hidden sm:inline">
                        {formatCurrency(Number(b.price || 0), business.currency || "USD")}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Cells (full 6-week month grid / 7-day week) */}
            <div className="grid grid-cols-7">
              {cells.map((dayStr) => {
                const dayBookings = bookingsForDay(dayStr);
                const inMonth = view === "month" ? dayStr.slice(0, 7) === monthKey : true;
                const isToday = dayStr === todayBiz;
                return (
                  <div
                    key={dayStr}
                    className={`min-h-[100px] border-r border-b border-gray-100 dark:border-gray-800 p-1.5 ${
                      !inMonth ? "bg-gray-50 dark:bg-gray-900/50" : ""
                    } ${isToday ? "bg-primary-50 dark:bg-primary-900/10" : ""}`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        isToday
                          ? "font-bold text-primary-600"
                          : inMonth
                            ? "text-gray-500"
                            : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      {dayStr.slice(8)}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((b) => {
                        const time = isoToZonedParts(b.start_time, tz).time;
                        const cancelled = b.status === "cancelled" || b.status === "no_show";
                        return (
                          <div
                            key={b.id}
                            className={`text-xs px-1.5 py-0.5 rounded truncate ${
                              cancelled ? cancelledStyle : ""
                            }`}
                            style={
                              cancelled
                                ? undefined
                                : {
                                    backgroundColor: (b.service?.color || "#3b82f6") + "20",
                                    color: b.service?.color || "#3b82f6",
                                  }
                            }
                            title={`${b.customer?.name} - ${b.service?.name}`}
                          >
                            {time} {b.customer?.name}
                          </div>
                        );
                      })}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-400 px-1.5">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
