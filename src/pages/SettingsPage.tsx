import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { slugify } from "@/lib/utils";
import type { Location } from "@/types";
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
} from "lucide-react";

export function SettingsPage() {
  const { business, refreshBusiness } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<"profile" | "locations" | "branding">("profile");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocForm, setShowLocForm] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
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
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at");
    setLocations(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const saveProfile = async () => {
    if (!business) return;
    setSavingProfile(true);
    await supabase.from("businesses").update(profile).eq("id", business.id);
    await refreshBusiness();
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const deleteLocation = async (id: string) => {
    await supabase.from("locations").delete().eq("id", id);
    loadLocations();
  };

  const tabs = [
    { id: "profile" as const, label: t("business_profile"), icon: Building2 },
    { id: "locations" as const, label: t("locations"), icon: MapPin },
    { id: "branding" as const, label: "Branding", icon: Palette },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>

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
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Karachi">Karachi</option>
                <option value="Asia/Dubai">Dubai</option>
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

      {tab === "branding" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-700"
                defaultValue={business?.primary_color || "#2563eb"}
                onChange={async (e) => {
                  if (business)
                    await supabase
                      .from("businesses")
                      .update({ primary_color: e.target.value })
                      .eq("id", business.id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      business_id: businessId,
      name,
      address: address || null,
      phone: phone || null,
    };
    if (location) {
      await supabase.from("locations").update(payload).eq("id", location.id);
    } else {
      await supabase.from("locations").insert(payload);
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
