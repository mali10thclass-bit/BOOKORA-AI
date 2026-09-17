import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTime } from "@/lib/utils";
import type { Booking } from "@/types";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  addDays,
  isSameDay,
} from "date-fns";

type ViewMode = "month" | "week" | "day";

export function CalendarPage() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!business) return;
    async function load() {
      const start =
        view === "month"
          ? startOfMonth(currentDate)
          : view === "week"
            ? startOfWeek(currentDate)
            : currentDate;
      const end =
        view === "month"
          ? endOfMonth(currentDate)
          : view === "week"
            ? endOfWeek(currentDate)
            : addDays(currentDate, 1);
      const { data } = await supabase
        .from("bookings")
        .select("*, service:services(*), staff:staff(*), customer:customers(*)")
        .eq("business_id", business!.id)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time");
      setBookings((data || []) as unknown as Booking[]);
      setLoading(false);
    }
    load();
  }, [business, currentDate, view]);

  const days =
    view === "day"
      ? [currentDate]
      : eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const bookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(new Date(b.start_time), day));

  const navigate = (dir: number) => {
    if (view === "month") setCurrentDate(addMonths(currentDate, dir));
    else if (view === "week") setCurrentDate(addDays(currentDate, dir * 7));
    else setCurrentDate(addDays(currentDate, dir));
  };

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
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-sm">
            {t("today")}
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-lg min-w-[180px] text-center">
            {view === "month"
              ? format(currentDate, "MMMM yyyy")
              : view === "week"
                ? `${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
                : format(currentDate, "EEEE, MMM d, yyyy")}
          </span>
          <button onClick={() => navigate(1)} className="btn-ghost p-2">
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
        ) : view === "day" ? (
          <div className="p-4">
            {bookingsForDay(currentDate).length === 0 ? (
              <p className="text-center text-gray-400 py-12">No bookings for this day</p>
            ) : (
              <div className="space-y-2">
                {bookingsForDay(currentDate).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-16 text-right">
                      <p className="text-sm font-medium">{formatTime(b.start_time)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.customer?.name}</p>
                      <p className="text-xs text-gray-500">
                        {b.service?.name} · {b.staff?.name}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {weekDays.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayBookings = bookingsForDay(day);
                const inMonth = view === "month" ? isSameMonth(day, currentDate) : true;
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] border-r border-b border-gray-100 dark:border-gray-800 p-1.5 ${
                      !inMonth ? "bg-gray-50 dark:bg-gray-900/50" : ""
                    } ${isToday(day) ? "bg-primary-50 dark:bg-primary-900/10" : ""}`}
                  >
                    <div
                      className={`text-xs mb-1 ${isToday(day) ? "font-bold text-primary-600" : "text-gray-500"}`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate"
                          style={{
                            backgroundColor: (b.service?.color || "#3b82f6") + "20",
                            color: b.service?.color || "#3b82f6",
                          }}
                          title={`${b.customer?.name} - ${b.service?.name}`}
                        >
                          {formatTime(b.start_time)} {b.customer?.name}
                        </div>
                      ))}
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
