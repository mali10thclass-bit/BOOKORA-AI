import { useCallback, useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import {
  BriefcaseBusiness, CheckSquare, ChevronRight, CircleDollarSign, Headphones,
  Package, Plus, RefreshCw, Send, Sparkles, Users, X
} from "lucide-react";

type Tab = "crm" | "tasks" | "inventory" | "support" | "growth";
type Row = Record<string, unknown>;
type TableName = "crm_leads" | "business_tasks" | "inventory_products" | "support_tickets" | "marketing_campaigns";
type InsertPayload = { [K in TableName]: Database["public"]["Tables"][K]["Insert"] }[TableName];

const tabs: { id: Tab; label: string; icon: typeof Users; description: string }[] = [
  { id: "crm", label: "CRM", icon: Users, description: "Leads, deals and customer follow-up" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, description: "Priorities and operational work" },
  { id: "inventory", label: "Inventory", icon: Package, description: "Stock, reorder signals and movements" },
  { id: "support", label: "Inbox", icon: Headphones, description: "Customer conversations and tickets" },
  { id: "growth", label: "Growth", icon: Send, description: "Coupons, campaigns and retention" },
];

export function BusinessOS() {
  const { business } = useAuth();
  const [tab, setTab] = useState<Tab>("crm");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    setError(null);
    const table = tab === "crm" ? "crm_leads" : tab === "tasks" ? "business_tasks" :
      tab === "inventory" ? "inventory_products" : tab === "support" ? "support_tickets" : "marketing_campaigns";
    const { data, error: e } = await supabase.from(table).select("*").eq("business_id", business.id).order("created_at", { ascending: false }).limit(50);
    if (e) setError(e.message);
    setRows((data || []) as Row[]);
    setLoading(false);
  }, [business, tab]);

  useEffect(() => { void load(); }, [load]);

  if (!business) return null;

  return (
    <PlanGate minimumPlan="pro" featureName="Business OS">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 p-6 text-white shadow-xl dark:border-gray-800">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <Sparkles size={13} /> BUSINESS OS
              </div>
              <h1 className="text-3xl font-bold tracking-tight">One workspace for the whole business.</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/65">
                A unified operating layer for CRM, tasks, stock, support and growth—built into BOOKORA instead of scattered across tools.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/10 p-2.5 hover:bg-white/15" title="Refresh">
                <RefreshCw size={17} />
              </button>
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-2 md:grid-cols-5">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`group rounded-2xl border p-4 text-left transition-all ${active
                  ? "border-primary-300 bg-primary-50 shadow-sm dark:border-primary-800 dark:bg-primary-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"}`}>
                <div className="flex items-center justify-between">
                  <Icon size={19} className={active ? "text-primary-600" : "text-gray-500"} />
                  <ChevronRight size={15} className="text-gray-400 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              </button>
            );
          })}
        </div>

        {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900 dark:bg-error-950/30 dark:text-error-300">{error}</div>}

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold">{tabs.find((x) => x.id === tab)?.label}</h2>
              <p className="text-xs text-gray-500">{tabs.find((x) => x.id === tab)?.description}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{rows.length} records</span>
          </div>
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading workspace data…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><BriefcaseBusiness size={21} /></div>
              <p className="mt-3 font-medium">Nothing here yet</p>
              <p className="mt-1 text-sm text-gray-500">Create your first record to activate this workspace.</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-4"><Plus size={15} /> Add record</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => <RecordRow key={String(row.id)} row={row} tab={tab} />)}
            </div>
          )}
        </section>

        {showAdd && <AddModal tab={tab} businessId={business.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); void load(); }} />}
      </div>
    </PlanGate>
  );
}

function RecordRow({ row, tab }: { row: Row; tab: Tab }) {
  const title = String(row.name || row.title || row.subject || "Untitled");
  const secondary = tab === "inventory"
    ? `Stock ${Number(row.quantity ?? 0)} · Reorder at ${Number(row.reorder_level ?? 0)}`
    : tab === "crm"
      ? `${String(row.stage || "new")} · Score ${Number(row.score ?? 0)}`
      : tab === "tasks"
        ? `${String(row.status || "todo")} · ${String(row.priority || "normal")}`
        : tab === "support"
          ? `${String(row.status || "open")} · ${String(row.channel || "web")}`
          : `${String(row.status || "draft")} · ${String(row.channel || "email")}`;
  const Icon = tab === "inventory" ? Package : tab === "tasks" ? CheckSquare : tab === "support" ? Headphones : tab === "growth" ? Send : Users;
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"><Icon size={17} /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-gray-500">{secondary}</p></div>
      {tab === "inventory" && Number(row.quantity ?? 0) <= Number(row.reorder_level ?? 0) && <span className="rounded-full bg-warning-100 px-2 py-1 text-[11px] font-semibold text-warning-700 dark:bg-warning-950/30 dark:text-warning-300">Reorder</span>}
      {tab === "crm" && <CircleDollarSign size={16} className="text-gray-400" />}
    </div>
  );
}

function AddModal({ tab, businessId, onClose, onSaved }: { tab: Tab; businessId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const table: TableName = tab === "crm" ? "crm_leads" : tab === "tasks" ? "business_tasks" : tab === "inventory" ? "inventory_products" : tab === "support" ? "support_tickets" : "marketing_campaigns";
    const payload =
      tab === "crm" ? { business_id: businessId, name: title, source: extra || "manual" } :
      tab === "tasks" ? { business_id: businessId, title, priority: extra || "medium" } :
      tab === "inventory" ? { business_id: businessId, name: title, sku: extra || null } :
      tab === "support" ? { business_id: businessId, subject: title, channel: extra || "web" } :
      { business_id: businessId, name: title, channel: extra || "email" };
    const { error: e2 } = await supabase.from(table).insert(payload as never);
    if (e2) { setError(e2.message); setSaving(false); return; }
    onSaved();
  };

  const label = tab === "crm" ? "Lead name" : tab === "tasks" ? "Task title" : tab === "inventory" ? "Product name" : tab === "support" ? "Ticket subject" : "Campaign name";
  const extraLabel = tab === "crm" ? "Source" : tab === "tasks" ? "Priority" : tab === "inventory" ? "SKU" : tab === "support" ? "Channel" : "Channel";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Add {tabs.find((x) => x.id === tab)?.label} record</h3><button type="button" onClick={onClose} className="btn-ghost p-1.5"><X size={17} /></button></div>
        <div className="mt-5 space-y-4">
          <div><label className="label">{label}</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><label className="label">{extraLabel}</label><input className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={extraLabel} /></div>
          {error && <p className="text-sm text-error-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Create"}</button></div>
      </form>
    </div>
  );
}
