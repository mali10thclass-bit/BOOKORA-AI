import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatCurrency } from "@/lib/utils";
import type { Service } from "@/types";
import { Sparkles, Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react";

export function ServicesPage() {
  const { business } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setServices(data || []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    load();
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
        <h1 className="text-2xl font-bold">{t("services")}</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> {t("add_service")}
        </button>
      </div>

      {services.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title="No services yet"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} /> {t("add_service")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className={`card p-4 ${!s.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-10 rounded-full"
                    style={{ backgroundColor: s.color || "#3b82f6" }}
                  />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.category && (
                      <span className="badge bg-gray-100 dark:bg-gray-800 text-xs">
                        {s.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setShowForm(true);
                    }}
                    className="btn-ghost p-1.5"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteService(s.id)}
                    className="btn-ghost p-1.5 text-error-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {s.description && <p className="text-sm text-gray-500 mt-2">{s.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock size={14} /> {s.duration_minutes} min
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <DollarSign size={14} />{" "}
                  {formatCurrency(Number(s.price), business?.currency || "USD")}
                </span>
              </div>
              <button
                onClick={() => toggleActive(s)}
                className="mt-3 text-xs text-primary-600 hover:underline"
              >
                {s.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <ServiceForm
          service={editing}
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
    </div>
  );
}

function ServiceForm({
  service,
  businessId,
  onClose,
  onSaved,
}: {
  service: Service | null;
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [duration, setDuration] = useState(service?.duration_minutes || 30);
  const [price, setPrice] = useState(service?.price || 0);
  const [color, setColor] = useState(service?.color || "#3b82f6");
  const [category, setCategory] = useState(service?.category || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      business_id: businessId,
      name,
      description: description || null,
      duration_minutes: duration,
      price,
      color,
      category: category || null,
    };
    if (service) {
      await supabase.from("services").update(payload).eq("id", service.id);
    } else {
      await supabase.from("services").insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={service ? "Edit Service" : "Add Service"} size="sm">
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
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Duration (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              className="input"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label">Price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              className="input h-10"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
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
