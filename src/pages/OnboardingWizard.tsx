import { useState, useRef } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { slugify } from "@/lib/utils";
import { Check, ChevronRight, Building2, Sparkles, UserCog, Calendar } from "lucide-react";

export function OnboardingWizard() {
  const { business, membership, user, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bizData, setBizData] = useState({
    name: business?.name || "",
    description: "",
    phone: "",
    email: membership?.email || user?.email || "",
    address: "",
    currency: business?.currency || "USD",
    timezone: business?.timezone || "UTC",
  });

  const [serviceData, setServiceData] = useState({ name: "", duration: 30, price: 0 });
  const [staffData, setStaffData] = useState({ name: "", email: "", phone: "" });

  const steps = [
    { icon: Building2, title: "Business Details", desc: "Tell us about your business" },
    { icon: Sparkles, title: "First Service", desc: "Create your first bookable service" },
    { icon: UserCog, title: "Add Staff", desc: "Add your first team member" },
    { icon: Calendar, title: "Ready", desc: "You are all set!" },
  ];

  // Retry safety: remember which optional steps already succeeded so a
  // re-run after a partial failure does not duplicate them.
  const done = useRef({
    service: false,
    staff: false,
    hours: false,
    businessId: null as string | null,
    staffId: null as string | null,
  });

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: bizData.name,
      description: bizData.description || null,
      phone: bizData.phone || null,
      email: bizData.email || null,
      address: bizData.address || null,
      currency: bizData.currency,
      timezone: bizData.timezone,
      onboarding_completed: true,
    };

    let businessId = business?.id ?? done.current.businessId;

    if (businessId) {
      const { error: updError } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId);
      if (updError) {
        console.error("Onboarding: failed to update business:", updError);
        setError(`Could not save your business details: ${updError.message}`);
        setSaving(false);
        return;
      }
    } else {
      // First run: create the business, then link the signed-in user as its owner.
      const slug = `${slugify(bizData.name || "business")}-${Math.random().toString(36).slice(2, 7)}`;
      const { data: created, error: createError } = await supabase
        .from("businesses")
        .insert({ ...payload, slug })
        .select()
        .single();

      if (createError || !created) {
        console.error("Onboarding: failed to create business:", createError);
        setError(createError?.message || "Could not create your business. Please try again.");
        setSaving(false);
        return;
      }
      businessId = created.id;
      done.current.businessId = businessId;

      // Linking the owner is mandatory: without it the user would not be
      // able to see the business on the next load.
      const { error: memberError } = await supabase.from("business_members").insert({
        business_id: businessId,
        user_id: user.id,
        email: user.email ?? bizData.email ?? "",
        full_name: (user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
        role: "owner",
        invite_status: "accepted",
      });
      if (memberError) {
        console.error("Onboarding: failed to link owner:", memberError);
        setError(
          `Your business was created, but we could not link it to your account (${memberError.message}). Try again, or contact support if this persists.`,
        );
        setSaving(false);
        return;
      }
    }

    // Create service (optional step, but a failure must not be silent).
    if (serviceData.name && !done.current.service) {
      const { error: svcError } = await supabase.from("services").insert({
        business_id: businessId,
        name: serviceData.name,
        duration_minutes: serviceData.duration,
        price: serviceData.price,
      });
      if (svcError) {
        console.error("Onboarding: failed to create service:", svcError);
        setError(
          `Your business was saved, but the service could not be added: ${svcError.message}`,
        );
        setSaving(false);
        return;
      }
      done.current.service = true;
    }

    // Create staff (optional step).
    if (staffData.name && !done.current.staff) {
      const { data: newStaff, error: staffError } = await supabase
        .from("staff")
        .insert({
          business_id: businessId,
          name: staffData.name,
          email: staffData.email || null,
          phone: staffData.phone || null,
          role: "staff",
        })
        .select()
        .single();

      if (staffError || !newStaff) {
        console.error("Onboarding: failed to create staff:", staffError);
        setError(
          `Your business was saved, but the staff member could not be added: ${staffError?.message || "unknown error"}`,
        );
        setSaving(false);
        return;
      }
      done.current.staff = true;
      done.current.staffId = newStaff.id;
    }

    // Default Mon–Fri hours for the new staff (separate step so a retry
    // after a failure re-attempts the hours without recreating the staff).
    if (done.current.staffId && !done.current.hours) {
      const staffId = done.current.staffId;
      const days = [1, 2, 3, 4, 5];
      const { error: hoursError } = await supabase.from("working_hours").insert(
        days.map((d) => ({
          staff_id: staffId,
          day_of_week: d,
          start_time: "09:00",
          end_time: "17:00",
          is_working: true,
        })),
      );
      if (hoursError) {
        console.error("Onboarding: failed to create working hours:", hoursError);
        setError(
          "The staff member was added, but default working hours could not be saved. Try again, or set the hours later on the Staff page.",
        );
        setSaving(false);
        return;
      }
      done.current.hours = true;
    }

    await refreshBusiness();
    setSaving(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  i < step
                    ? "bg-accent-600 text-white"
                    : i === step
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                }`}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${i < step ? "bg-accent-600" : "bg-gray-200 dark:bg-gray-800"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const Icon = steps[step].icon;
              return <Icon size={20} className="text-primary-600" />;
            })()}
            <h2 className="text-lg font-semibold">{steps[step].title}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">{steps[step].desc}</p>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Business Name</label>
                <input
                  className="input"
                  value={bizData.name}
                  onChange={(e) => setBizData({ ...bizData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={bizData.description}
                  onChange={(e) => setBizData({ ...bizData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    value={bizData.phone}
                    onChange={(e) => setBizData({ ...bizData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={bizData.email}
                    onChange={(e) => setBizData({ ...bizData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  className="input"
                  value={bizData.address}
                  onChange={(e) => setBizData({ ...bizData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Currency</label>
                  <select
                    className="input"
                    value={bizData.currency}
                    onChange={(e) => setBizData({ ...bizData, currency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select
                    className="input"
                    value={bizData.timezone}
                    onChange={(e) => setBizData({ ...bizData, timezone: e.target.value })}
                  >
                    {(() => {
                      try {
                        return Intl.supportedValuesOf("timeZone").map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ));
                      } catch {
                        return <option value="Asia/Karachi">Asia/Karachi</option>;
                      }
                    })()}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Service Name</label>
                <input
                  className="input"
                  value={serviceData.name}
                  onChange={(e) => setServiceData({ ...serviceData, name: e.target.value })}
                  placeholder="e.g. Haircut, Consultation, Massage"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className="input"
                    value={serviceData.duration}
                    onChange={(e) =>
                      setServiceData({ ...serviceData, duration: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input"
                    value={serviceData.price}
                    onChange={(e) =>
                      setServiceData({ ...serviceData, price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                You can add more services later from the Services page.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">Staff Name</label>
                <input
                  className="input"
                  value={staffData.name}
                  onChange={(e) => setStaffData({ ...staffData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={staffData.email}
                    onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    value={staffData.phone}
                    onChange={(e) => setStaffData({ ...staffData, phone: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Default working hours (Mon-Fri, 9am-5pm) will be set automatically.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-accent-600" />
              </div>
              <h3 className="text-lg font-semibold">You're all set!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your business is ready to accept bookings.
              </p>
            </div>
          )}

          {step === 3 && error && (
            <div className="rounded-lg border border-error-300 bg-error-50 dark:bg-error-900/20 dark:border-error-800 px-4 py-3 text-sm text-error-700 dark:text-error-300 mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className="btn-secondary"
              disabled={step === 0}
            >
              Back
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving} className="btn-primary">
                {saving ? "Setting up..." : "Get Started"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
