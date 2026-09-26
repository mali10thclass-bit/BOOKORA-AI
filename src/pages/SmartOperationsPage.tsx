import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Sparkles, Users, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Booking = { id: string; start_time: string; end_time: string; status: string; service_id: string | null; staff_id: string | null };
type WaitlistEntry = { id: string; status: string; priority: number; created_at: string; service_id: string | null };
type Resource = { id: string; name: string; type: string; capacity: number; is_active: boolean };

function minutesBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

export function SmartOperationsPage() {
  const { business } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const start = new Date(`${selectedDate}T00:00:00`).toISOString();
    const end = new Date(`${selectedDate}T23:59:59.999`).toISOString();
    const [b, w, r] = await Promise.all([
      supabase.from("bookings").select("id,start_time,end_time,status,service_id,staff_id").eq("business_id", business.id).gte("start_time", start).lte("start_time", end).neq("status", "cancelled").order("start_time"),
      supabase.from("waitlist_entries").select("id,status,priority,created_at,service_id").eq("business_id", business.id).eq("status", "waiting").order("priority", { ascending: false }).order("created_at"),
      supabase.from("resources").select("id,name,type,capacity,is_active").eq("business_id", business.id).eq("is_active", true).order("name"),
    ]);
    if (!b.error) setBookings((b.data ?? []) as Booking[]);
    if (!w.error) setWaitlist((w.data ?? []) as WaitlistEntry[]);
    if (!r.error) setResources((r.data ?? []) as Resource[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [business, selectedDate]);

  const insights = useMemo(() => {
    const gaps: number[] = [];
    const byStaff = new Map<string, Booking[]>();
    for (const booking of bookings) {
      if (!booking.staff_id) continue;
      const list = byStaff.get(booking.staff_id) ?? [];
      list.push(booking);
      byStaff.set(booking.staff_id, list);
    }
    for (const list of byStaff.values()) {
      list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      for (let i = 1; i < list.length; i++) gaps.push(minutesBetween(list[i - 1].end_time, list[i].start_time));
    }
    const usefulGaps = gaps.filter((gap) => gap >= 15);
    const largestGap = usefulGaps.length ? Math.max(...usefulGaps) : 0;
    const utilization = bookings.length ? Math.round((bookings.reduce((sum, b) => sum + minutesBetween(b.start_time, b.end_time), 0) / Math.max(1, 8 * 60 * Math.max(1, byStaff.size))) * 100) : 0;
    return { largestGap, gapCount: usefulGaps.length, utilization: Math.min(100, utilization), waiters: waitlist.length };
  }, [bookings, waitlist]);

  return (
    <PlanGate minimumPlan="pro" featureName="Smart Operations">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl bg-gray-950 p-6 text-white">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-600/25 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary-200"><Sparkles size={14}/> AI-READY OPERATIONS</div>
              <h1 className="text-2xl font-bold sm:text-3xl">Smart Operations</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">Turn booking data into practical schedule insights: empty gaps, utilization, waitlist demand and operational actions.</p>
            </div>
            <label className="text-sm text-gray-300">Schedule date<input className="input mt-1 block bg-white text-gray-900" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}/></label>
          </div>
        </section>

        {loading ? <div className="card p-10 text-center text-sm text-gray-500">Analysing schedule data…</div> : <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Bookings", value: bookings.length, icon: CalendarClock, note: "scheduled today" },
              { label: "Open gaps", value: insights.gapCount, icon: Clock3, note: insights.largestGap ? `largest ${insights.largestGap} min` : "none detected" },
              { label: "Utilization", value: `${insights.utilization}%`, icon: Zap, note: "estimated from staffed hours" },
              { label: "Waitlist demand", value: insights.waiters, icon: Users, note: "customers waiting" },
            ].map((item) => <div key={item.label} className="card p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p><p className="mt-1 text-2xl font-bold">{item.value}</p><p className="mt-1 text-xs text-gray-400">{item.note}</p></div><div className="rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><item.icon size={18}/></div></div></div>)}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="card overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold">Schedule opportunities</h2><p className="mt-1 text-xs text-gray-500">Rules inspired by modern scheduling platforms, applied to your own BOOKORA data.</p></div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="flex gap-3 p-5"><div className="mt-0.5 rounded-full bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><CheckCircle2 size={16}/></div><div><p className="font-medium">Gap-aware scheduling</p><p className="mt-1 text-sm text-gray-500">{insights.gapCount ? `There are ${insights.gapCount} staff gaps of at least 15 minutes. Consider offering those windows to waiting customers.` : "No 15+ minute staff gaps were detected for this date."}</p></div></div>
                <div className="flex gap-3 p-5"><div className="mt-0.5 rounded-full bg-warning-50 p-2 text-warning-600 dark:bg-warning-900/20"><AlertTriangle size={16}/></div><div><p className="font-medium">Waitlist opportunity</p><p className="mt-1 text-sm text-gray-500">{waitlist.length ? `${waitlist.length} waiting customer${waitlist.length === 1 ? "" : "s"} can be considered when a matching slot opens.` : "Your waitlist is currently clear."}</p></div></div>
                <div className="flex gap-3 p-5"><div className="mt-0.5 rounded-full bg-accent-50 p-2 text-accent-600 dark:bg-accent-900/20"><Zap size={16}/></div><div><p className="font-medium">Resource readiness</p><p className="mt-1 text-sm text-gray-500">{resources.length ? `${resources.length} active resources are configured for future resource-aware booking rules.` : "Add rooms or equipment in Resources to prepare resource-aware availability."}</p></div></div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-semibold">Next product actions</h2>
              <p className="mt-1 text-sm text-gray-500">The dashboard is intentionally read-only for now; actions should go through authorized booking workflows.</p>
              <div className="mt-5 space-y-3">
                <a className="btn-secondary w-full justify-start" href="/waitlist"><Users size={15}/> Review waitlist</a>
                <a className="btn-secondary w-full justify-start" href="/resources"><CalendarClock size={15}/> Configure resources</a>
                <a className="btn-primary w-full justify-start" href="/calendar"><Zap size={15}/> Open calendar</a>
              </div>
            </section>
          </div>
        </>}
      </div>
    </PlanGate>
  );
}
