import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import type { Customer, Booking } from "@/types";
import { Users, Plus, Search, Download, Edit, Trash2, Mail, Phone, X } from "lucide-react";

export function Customers() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<{ customer: Customer; bookings: Booking[] } | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search),
  );

  const viewDetail = async (c: Customer) => {
    const { data } = await supabase
      .from("bookings")
      .select("*, service:services(*), staff:staff(*)")
      .eq("customer_id", c.id)
      .order("start_time", { ascending: false });
    setDetail({ customer: c, bookings: (data || []) as unknown as Booking[] });
  };

  const deleteCustomer = async (id: string) => {
    await supabase.from("customers").delete().eq("id", id);
    load();
  };

  const handleExport = () => {
    downloadCSV(
      "customers.csv",
      filtered.map((c) => ({
        name: c.name,
        email: c.email || "",
        phone: c.phone || "",
        visits: c.total_visits,
        spent: c.total_spent,
        joined: formatDate(c.created_at),
      })),
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("customers")}</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={16} /> {t("export")}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> {t("add_customer")}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} /> {t("add_customer")}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                    Visits
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                    Total Spent
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                    Joined
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => viewDetail(c)}
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {c.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{c.total_visits}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {formatCurrency(Number(c.total_spent), business?.currency || "USD")}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(c);
                            setShowForm(true);
                          }}
                          className="btn-ghost p-1.5"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteCustomer(c.id)}
                          className="btn-ghost p-1.5 text-error-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <CustomerForm
          customer={editing}
          businessId={business!.id}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {detail && (
        <Modal open onClose={() => setDetail(null)} title={detail.customer.name} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Email:</span> {detail.customer.email || "—"}
              </div>
              <div>
                <span className="text-gray-500">Phone:</span> {detail.customer.phone || "—"}
              </div>
              <div>
                <span className="text-gray-500">Visits:</span> {detail.customer.total_visits}
              </div>
              <div>
                <span className="text-gray-500">Spent:</span>{" "}
                {formatCurrency(Number(detail.customer.total_spent), business?.currency || "USD")}
              </div>
            </div>
            {detail.customer.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                {detail.customer.notes}
              </p>
            )}
            <div>
              <h4 className="font-medium text-sm mb-2">
                Booking History ({detail.bookings.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {detail.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                  >
                    <div>
                      <p className="font-medium">{b.service?.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(b.start_time)}</p>
                    </div>
                    <span className="badge bg-gray-200 dark:bg-gray-700 capitalize">
                      {b.status}
                    </span>
                  </div>
                ))}
                {detail.bookings.length === 0 && (
                  <p className="text-sm text-gray-400">No bookings yet</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CustomerForm({
  customer,
  businessId,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [notes, setNotes] = useState(customer?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      business_id: businessId,
      name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    };
    if (customer) {
      await supabase.from("customers").update(payload).eq("id", customer.id);
    } else {
      await supabase.from("customers").insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={customer ? "Edit Customer" : "Add Customer"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
