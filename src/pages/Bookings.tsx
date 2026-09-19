import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatCurrency, downloadCSV, zonedTimeToIso, isoToZonedParts } from "@/lib/utils";
import type { Booking, Service, Staff, Customer, BookingStatus } from "@/types";
import {
  CalendarDays,
  Plus,
  Search,
  Download,
  Check,
  Clock,
  XCircle,
  Trash2,
  Edit,
  AlertCircle,
  DollarSign,
} from "lucide-react";

export function Bookings() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);

  const loadData = useCallback(async () => {
    if (!business) return;
    const businessId = business.id;
    const [b, s, st, c] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, service:services(*), staff:staff(*), customer:customers(*)")
        .eq("business_id", businessId)
        .order("start_time", { ascending: false }),
      supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true),
      supabase.from("staff").select("*").eq("business_id", businessId).eq("is_active", true),
      supabase.from("customers").select("*").eq("business_id", businessId),
    ]);
    const firstError = b.error || s.error || st.error || c.error;
    if (firstError) {
      console.error("Failed to load bookings:", firstError);
      setLoadError("Failed to load bookings. Please try again.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setBookings((b.data || []) as unknown as Booking[]);
    setServices(s.data || []);
    setStaffList(st.data || []);
    setCustomers(c.data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.service?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.staff?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    // Export in the business timezone so rows match what the business sees.
    const tz = business?.timezone || "UTC";
    downloadCSV(
      "bookings.csv",
      filtered.map((b) => {
        const parts = isoToZonedParts(b.start_time, tz);
        return {
          customer: b.customer?.name || "",
          service: b.service?.name || "",
          staff: b.staff?.name || "",
          date: parts.date,
          time: parts.time,
          status: b.status,
          payment: b.payment_status,
          price: b.price,
        };
      }),
    );
  };

  const updateStatus = async (id: string, status: BookingStatus) => {
    const { error: updError } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (updError) {
      console.error("Failed to update booking status:", updError);
      setActionError(`Could not update the booking: ${updError.message}`);
      return;
    }
    setActionError(null);
    loadData();
  };

  const deleteBooking = async (id: string) => {
    const { error: delError } = await supabase.from("bookings").delete().eq("id", id);
    if (delError) {
      console.error("Failed to delete booking:", delError);
      setActionError(`Could not delete the booking: ${delError.message}`);
      return;
    }
    setActionError(null);
    loadData();
  };

  if (!business) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No business found"
        description="Complete the onboarding setup to manage bookings."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (loadError) {
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
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-error-300 bg-error-50 dark:bg-error-900/20 dark:border-error-800 px-4 py-3 text-sm text-error-700 dark:text-error-300">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-error-500 hover:text-error-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("bookings")}</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={16} /> {t("export")}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> {t("new_booking")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("no_bookings")}
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={16} /> {t("new_booking")}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">{t("customer")}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t("service")}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                    {t("staff")}
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t("date")}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t("status")}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                    {t("price")}
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((b) => (
                  <tr key={b.id} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{b.customer?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {b.service?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {b.staff?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const parts = isoToZonedParts(b.start_time, business?.timezone || "UTC");
                        return (
                          <>
                            <div>{parts.date}</div>
                            <div className="text-xs text-gray-400">{parts.time}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {formatCurrency(Number(b.price), business?.currency || "USD")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "pending" && (
                          <button
                            onClick={() => updateStatus(b.id, "confirmed")}
                            className="btn-ghost p-1.5 text-accent-600"
                            title="Confirm"
                            aria-label="Confirm booking"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(b.id, "completed")}
                            className="btn-ghost p-1.5 text-primary-600"
                            title="Complete"
                            aria-label="Mark booking complete"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        {b.status !== "cancelled" && b.status !== "completed" && (
                          <button
                            onClick={() => updateStatus(b.id, "cancelled")}
                            className="btn-ghost p-1.5 text-error-600"
                            title="Cancel"
                            aria-label="Cancel booking"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {(b.payment_status === "unpaid" || b.payment_status === "partial") && (
                          <button
                            onClick={() => setPaying(b)}
                            className="btn-ghost p-1.5 text-accent-600"
                            title="Record payment"
                            aria-label="Record payment"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(b)}
                          className="btn-ghost p-1.5"
                          title={t("edit")}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteBooking(b.id)}
                          className="btn-ghost p-1.5 text-error-600"
                          title={t("delete")}
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

      {(showCreate || editing) && (
        <BookingForm
          booking={editing}
          services={services}
          staffList={staffList}
          customers={customers}
          businessId={business!.id}
          timezone={business?.timezone || "UTC"}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditing(null);
            loadData();
          }}
        />
      )}

      {paying && (
        <PaymentModal
          booking={paying}
          businessId={business!.id}
          currency={business?.currency || "USD"}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  booking,
  businessId,
  currency,
  onClose,
  onSaved,
}: {
  booking: Booking;
  businessId: string;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paid, setPaid] = useState<number | null>(null);
  const [loadingPaid, setLoadingPaid] = useState(true);
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "online">("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Number(booking.price || 0);

  // Sum of recorded payments for this booking (to show the remaining
  // balance and prefill the field).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPaid(true);
      const { data, error: pError } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("booking_id", booking.id);
      if (cancelled) return;
      if (pError) {
        console.error("Failed to load payments:", pError);
        setPaid(0);
      } else {
        setPaid(
          (data || []).reduce(
            (s: number, p: { amount: number | null; status: string | null }) =>
              p.status !== "refunded" ? s + Number(p.amount || 0) : s,
            0,
          ),
        );
      }
      setLoadingPaid(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [booking.id]);

  const remaining = Math.max(0, total - (paid || 0));

  const handleSave = async () => {
    setError(null);
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (paid !== null && amt > remaining + 0.0001) {
      setError(
        `This would overpay the booking. Remaining balance is ${formatCurrency(remaining, currency)}.`,
      );
      return;
    }
    setSaving(true);
    // The database rejects negative amounts and overpayments; we surface
    // those messages here.
    const { error: payError } = await supabase.from("payments").insert({
      business_id: businessId,
      booking_id: booking.id,
      amount: amt,
      method,
      reference: reference || null,
      status: "paid",
    });
    if (payError) {
      console.error("Failed to record payment:", payError);
      setError(payError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium">{booking.customer?.name || "—"}</p>
          <p className="text-gray-500">{booking.service?.name || "—"}</p>
          {loadingPaid ? (
            <p className="text-gray-400">Loading payment history…</p>
          ) : (
            <>
              <p>
                Total: <span className="font-medium">{formatCurrency(total, currency)}</span>
              </p>
              <p>
                Paid: <span className="font-medium">{formatCurrency(paid || 0, currency)}</span>
              </p>
              <p>
                Remaining:{" "}
                <span className="font-medium text-accent-600">
                  {formatCurrency(remaining, currency)}
                </span>
              </p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={remaining > 0 ? String(remaining) : "0"}
              required
            />
          </div>
          <div>
            <label className="label">Method</label>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as "cash" | "card" | "transfer" | "online")}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Bank transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Reference (optional)</label>
          <input
            className="input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. receipt or transaction id"
          />
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingPaid}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BookingForm({
  booking,
  services,
  staffList,
  customers,
  businessId,
  timezone,
  onClose,
  onSaved,
}: {
  booking: Booking | null;
  services: Service[];
  staffList: Staff[];
  customers: Customer[];
  businessId: string;
  timezone: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serviceId, setServiceId] = useState(booking?.service_id || "");
  const [staffId, setStaffId] = useState(booking?.staff_id || "");
  const [customerId, setCustomerId] = useState(booking?.customer_id || "");
  // Date/time are always edited in the business timezone; the wall-clock
  // values are converted to a UTC instant at submit time.
  const [date, setDate] = useState(() =>
    booking
      ? isoToZonedParts(booking.start_time, timezone).date
      : isoToZonedParts(new Date().toISOString(), timezone).date,
  );
  const [time, setTime] = useState(() =>
    booking ? isoToZonedParts(booking.start_time, timezone).time : "09:00",
  );
  const [notes, setNotes] = useState(booking?.notes || "");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      setError("Select a service");
      setSaving(false);
      return;
    }
    if (!staffId) {
      setError("Select a staff member");
      setSaving(false);
      return;
    }

    let startIso: string;
    let endIso: string;
    try {
      startIso = zonedTimeToIso(date, time, timezone);
      endIso = new Date(
        new Date(startIso).getTime() + service.duration_minutes * 60000,
      ).toISOString();
    } catch {
      setError("Enter a valid date and time");
      setSaving(false);
      return;
    }

    let custId = customerId;
    if (!custId && newCustomerName) {
      const { data: newCust, error: custError } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          name: newCustomerName,
        })
        .select()
        .single();
      if (custError) {
        console.error("Failed to create customer:", custError);
        setError(`Could not create the customer: ${custError.message}`);
        setSaving(false);
        return;
      }
      custId = newCust?.id ?? "";
    }
    if (!custId) {
      setError("Select or create a customer");
      setSaving(false);
      return;
    }

    const payload = {
      business_id: businessId,
      service_id: serviceId,
      staff_id: staffId,
      customer_id: custId,
      start_time: startIso,
      end_time: endIso,
      price: service.price,
      notes,
      status: booking?.status || "pending",
      payment_status: booking?.payment_status || "unpaid",
    };

    const { error: saveError } = booking
      ? await supabase.from("bookings").update(payload).eq("id", booking.id)
      : await supabase.from("bookings").insert(payload);
    if (saveError) {
      // Includes database-level conflict detection messages
      // ("overlaps with an existing appointment"), cross-tenant guards,
      // and working-hours validation.
      console.error("Failed to save booking:", saveError);
      setError(saveError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={booking ? "Edit Booking" : "New Booking"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{"Service"}</label>
            <select
              className="input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
            >
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(Number(s.price))} ({s.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{"Staff"}</label>
            <select
              className="input"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
            >
              <option value="">Select staff...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{"Customer"}</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">New customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!customerId && (
            <div>
              <label className="label">{"New Customer Name"}</label>
              <input
                className="input"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
          )}
          <div>
            <label className="label">{"Date"}</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">{"Time"}</label>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">{"Notes"}</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
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
