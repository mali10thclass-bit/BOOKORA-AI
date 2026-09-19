import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { EmptyState } from "@/components/EmptyState";
import { formatDate, formatTime } from "@/lib/utils";
import type { Notification } from "@/types";
import {
  Bell,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

export function NotificationsPage() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showSend, setShowSend] = useState(false);

  const load = useCallback(async () => {
    if (!business) return;
    const businessId = business.id;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Failed to load notifications:", error);
      setLoadError("Failed to load notifications. Please try again.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setNotifications(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  const channelIcon = (ch: string | null) =>
    ch === "email" ? Mail : ch === "sms" ? MessageSquare : Smartphone;
  const statusIcon = (st: string | null) => (st === "sent" ? Check : st === "failed" ? X : Clock);
  const statusColor = (st: string | null) =>
    st === "sent" ? "text-accent-600" : st === "failed" ? "text-error-600" : "text-warning-600";

  if (!business) {
    return (
      <EmptyState
        icon={Bell}
        title="No business found"
        description="Complete the onboarding setup to view notifications."
      />
    );
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
          <button onClick={load} className="btn-secondary mt-3">
            Try again
          </button>
        </div>
      </div>
    );

  const templates = [
    {
      name: "Booking Confirmation",
      type: "booking_confirmation",
      body: "Hi {customer_name}, your booking for {service_name} on {date} at {time} is confirmed. Thank you!",
    },
    {
      name: "Booking Reminder",
      type: "booking_reminder",
      body: "Reminder: You have a booking for {service_name} tomorrow at {time}. See you there!",
    },
    {
      name: "Booking Cancelled",
      type: "booking_cancelled",
      body: "Your booking for {service_name} on {date} has been cancelled. Please contact us to reschedule.",
    },
    {
      name: "Payment Received",
      type: "payment_received",
      body: "Payment of {amount} received for {service_name}. Thank you for your business!",
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("notifications")}</h1>
        <button onClick={() => setShowSend(true)} className="btn-primary">
          <Send size={16} /> {t("send_reminder")}
        </button>
      </div>

      {/* Automation Templates */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold">{t("reminder_templates")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Template messages.{" "}
            <span className="text-warning-600">
              Automated delivery is not yet wired to an email/SMS provider — these are not sent
              automatically.
            </span>
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {templates.map((tpl) => (
            <div key={tpl.type} className="px-5 py-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{tpl.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tpl.body}</p>
              </div>
              <span className="badge bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                Template
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Log */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold">Recent Notifications</h3>
        </div>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications sent yet" />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((n) => {
              const ChIcon = channelIcon(n.channel);
              const StIcon = statusIcon(n.status);
              return (
                <div key={n.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <ChIcon size={14} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {n.subject || n.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {n.recipient || "—"} · {formatDate(n.created_at)}, {formatTime(n.created_at)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${statusColor(n.status)}`}>
                    <StIcon size={12} /> {n.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSend && (
        <SendNotificationModal
          businessId={business!.id}
          onClose={() => setShowSend(false)}
          onSent={() => {
            setShowSend(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function SendNotificationModal({
  businessId,
  onClose,
  onSent,
}: {
  businessId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms" | "push">("email");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insError } = await supabase.from("notifications").insert({
      business_id: businessId,
      type: "booking_reminder",
      channel,
      recipient,
      subject,
      body,
      status: "pending",
    });
    if (insError) {
      console.error("Failed to queue notification:", insError);
      setError(`Could not save the notification: ${insError.message}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSent();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold">Send Notification</h3>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Channel</label>
            <select
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value as "email" | "sms" | "push")}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </div>
          <div>
            <label className="label">Recipient</label>
            <input
              className="input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder="email or phone"
            />
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            This records the notification in your log as{" "}
            <span className="font-medium">pending</span>. It is not delivered until a delivery
            provider is connected.
          </p>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Queueing..." : "Queue Notification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
