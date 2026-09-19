import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import type { Location, Holiday } from "@/types";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Building2,
  Globe,
  Palette,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

export function SettingsPage() {
  const { business, refreshBusiness } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<"profile" | "locations" | "booking" | "branding">("profile");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocForm, setShowLocForm] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [bookingSettings, setBookingSettings] = useState({
    booking_buffer_minutes: 0,
    cancellation_notice_hours: 24,
    reminder_lead_minutes: 1440,
  });
  const [savingBooking, setSavingBooking] = useState(false);
  const [profile, setProfile] = useState({
    name: business?.name || "",
    description: business?.description || "",
    phone: business?.phone || "",
    email: business?.email || "",
    address: business?.address || "",
    website: business?.website || "",
    timezone: business?.timezone || "UTC",
    currency: business?.currency || "USD",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const loadLocations = useCallback(async () => {
    if (!business) return;
    const businessId = business.id;
    const [locRes, holRes] = await Promise.all([
      supabase.from("locations").select("*").eq("business_id", businessId).order("created_at"),
      supabase.from("holidays").select("*").eq("business_id", businessId).order("holiday_date"),
    ]);
    if (locRes.error || holRes.error) {
      console.error("Failed to load settings:", locRes.error || holRes.error);
      setLoadError("Failed to load settings. Please try again.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setLocations(locRes.data || []);
    setHolidays((holRes.data || []) as unknown as Holiday[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Seed booking settings from the stored business (DB defaults exist,
  // but the form needs concrete numbers).
  useEffect(() => {
    if (!business) return;
    setBookingSettings({
      booking_buffer_minutes: business.booking_buffer_minutes ?? 0,
      cancellation_notice_hours: business.cancellation_notice_hours ?? 24,
      reminder_lead_minutes: business.reminder_lead_minutes ?? 1440,
    });
  }, [business]);

  const [profileError, setProfileError] = useState<string | null>(null);

  const saveProfile = async () => {
    if (!business) return;
    setSavingProfile(true);
    setProfileError(null);
    const { error: saveError } = await supabase
      .from("businesses")
      .update(profile)
      .eq("id", business.id);
    if (saveError) {
      console.error("Failed to save business profile:", saveError);
      setProfileError(saveError.message);
      setSavingProfile(false);
      return;
    }
    await refreshBusiness();
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const deleteLocation = async (id: string) => {
    const { error: delError } = await supabase.from("locations").delete().eq("id", id);
    if (delError) {
      console.error("Failed to delete location:", delError);
      setProfileError(`Could not delete the location: ${delError.message}`);
      return;
    }
    loadLocations();
  };

  const saveBookingSettings = async () => {
    if (!business) return;
    setSavingBooking(true);
    setProfileError(null);
    const { error: saveError } = await supabase
      .from("businesses")
      .update({
        booking_buffer_minutes: bookingSettings.booking_buffer_minutes,
        cancellation_notice_hours: bookingSettings.cancellation_notice_hours,
        reminder_lead_minutes: bookingSettings.reminder_lead_minutes,
      })
      .eq("id", business.id);
    if (saveError) {
      console.error("Failed to save booking settings:", saveError);
      setProfileError(saveError.message);
      setSavingBooking(false);
      return;
    }
    await refreshBusiness();
    setSavingBooking(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const addHoliday = async () => {
    if (!business || !newHoliday.date || !newHoliday.name.trim()) return;
    const { error: insError } = await supabase.from("holidays").insert({
      business_id: business.id,
      holiday_date: newHoliday.date,
      name: newHoliday.name.trim(),
    });
    if (insError) {
      console.error("Failed to add holiday:", insError);
      setProfileError(insError.message);
      return;
    }
    setNewHoliday({ date: "", name: "" });
    loadLocations();
  };

  const deleteHoliday = async (id: string) => {
    const { error: delError } = await supabase.from("holidays").delete().eq("id", id);
    if (delError) {
      console.error("Failed to delete holiday:", delError);
      setProfileError(`Could not delete the holiday: ${delError.message}`);
      return;
    }
    loadLocations();
  };

  const tabs = [
    { id: "profile" as const, label: t("business_profile"), icon: Building2 },
    { id: "locations" as const, label: t("locations"), icon: MapPin },
    { id: "booking" as const, label: "Booking", icon: CalendarDays },
    { id: "branding" as const, label: "Branding", icon: Palette },
  ];

  // Full IANA timezone list (no hardcoded zone list — every zone is
  // selectable, e.g. Asia/Karachi, without guessing which the user needs).
  const timeZones: string[] = (() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "Asia/Karachi", "Asia/Dubai", "America/New_York", "Europe/London"];
    }
  })();

  if (!business) {
    return (
      <EmptyState
        icon={Settings}
        title="No business found"
        description="Complete the onboarding setup to configure your business."
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
          <button onClick={loadLocations} className="btn-secondary mt-3">
            Try again
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>

      {profileError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-error-300 bg-error-50 dark:bg-error-900/20 dark:border-error-800 px-4 py-3 text-sm text-error-700 dark:text-error-300">
          <span>{profileError}</span>
          <button
            onClick={() => setProfileError(null)}
            className="text-error-500"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tb.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <tb.icon size={16} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Business Name</label>
              <input
                className="input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PKR">PKR (Rs)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SAR">SAR (﷼)</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                className="input"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                className="input"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveProfile} disabled={savingProfile} className="btn-primary">
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
            {profileSaved && <span className="text-sm text-accent-600">Saved!</span>}
          </div>
        </div>
      )}

      {tab === "locations" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingLoc(null);
                setShowLocForm(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Add Location
            </button>
          </div>
          {locations.length === 0 ? (
            <div className="card">
              <EmptyState icon={MapPin} title="No locations yet" />
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <div key={loc.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      {loc.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {loc.address}
                        </span>
                      )}
                      {loc.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {loc.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingLoc(loc);
                        setShowLocForm(true);
                      }}
                      className="btn-ghost p-1.5"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteLocation(loc.id)}
                      className="btn-ghost p-1.5 text-error-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "booking" && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">Booking Rules</h3>
            <p className="text-xs text-gray-500">
              These apply to both public and staff-created bookings, enforced by the database.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Buffer between bookings (min)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  className="input"
                  value={bookingSettings.booking_buffer_minutes}
                  onChange={(e) =>
                    setBookingSettings((s) => ({
                      ...s,
                      booking_buffer_minutes: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minimum free time to leave after each appointment.
                </p>
              </div>
              <div>
                <label className="label">Cancellation notice (hours)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input"
                  value={bookingSettings.cancellation_notice_hours}
                  onChange={(e) =>
                    setBookingSettings((s) => ({
                      ...s,
                      cancellation_notice_hours: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minimum hours a customer should give before cancelling.
                </p>
              </div>
              <div>
                <label className="label">Reminder lead time (min)</label>
                <input
                  type="number"
                  min={0}
                  step={30}
                  className="input"
                  value={bookingSettings.reminder_lead_minutes}
                  onChange={(e) =>
                    setBookingSettings((s) => ({
                      ...s,
                      reminder_lead_minutes: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  How far before the appointment a reminder is queued.
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={saveBookingSettings}
                disabled={savingBooking}
                className="btn-primary"
              >
                {savingBooking ? "Saving..." : "Save Booking Settings"}
              </button>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold">Holidays & Closures</h3>
            <p className="text-xs text-gray-500">
              No bookings can be made on these dates (business-local calendar).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday((h) => ({ ...h, date: e.target.value }))}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="label">Name</label>
                <input
                  className="input"
                  placeholder="e.g. Eid al-Fitr"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday((h) => ({ ...h, name: e.target.value }))}
                />
              </div>
              <button onClick={addHoliday} className="btn-secondary">
                <Plus size={16} /> Add
              </button>
            </div>
            {holidays.length === 0 ? (
              <p className="text-sm text-gray-400">No holidays set.</p>
            ) : (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.holiday_date}</p>
                    </div>
                    <button
                      onClick={() => deleteHoliday(h.id)}
                      className="btn-ghost p-1.5 text-error-600"
                      aria-label={`Delete ${h.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "branding" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-700"
                defaultValue={business.primary_color || "#2563eb"}
                onChange={async (e) => {
                  const { error: colorError } = await supabase
                    .from("businesses")
                    .update({ primary_color: e.target.value })
                    .eq("id", business.id);
                  if (colorError) {
                    console.error("Failed to save primary color:", colorError);
                    setProfileError(`Could not save the color: ${colorError.message}`);
                  } else {
                    setProfileError(null);
                  }
                }}
              />
              <span className="text-sm text-gray-500">
                Used on public booking page and notifications
              </span>
            </div>
          </div>
          <div>
            <label className="label">Public Booking URL</label>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-400" />
              <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg flex-1 truncate">
                /book/{business?.slug || "your-business"}
              </code>
            </div>
          </div>
        </div>
      )}

      {(showLocForm || editingLoc) && (
        <LocationForm
          location={editingLoc}
          businessId={business!.id}
          onClose={() => {
            setShowLocForm(false);
            setEditingLoc(null);
          }}
          onSaved={() => {
            setShowLocForm(false);
            setEditingLoc(null);
            loadLocations();
          }}
        />
      )}
    </div>
  );
}

function LocationForm({
  location,
  businessId,
  onClose,
  onSaved,
}: {
  location: Location | null;
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [phone, setPhone] = useState(location?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      business_id: businessId,
      name,
      address: address || null,
      phone: phone || null,
    };
    const { error: saveError } = location
      ? await supabase.from("locations").update(payload).eq("id", location.id)
      : await supabase.from("locations").insert(payload);
    if (saveError) {
      console.error("Failed to save location:", saveError);
      setError(saveError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={location ? "Edit Location" : "Add Location"} size="sm">
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
          <label className="label">Address</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
