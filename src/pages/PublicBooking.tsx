import { useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { supabase } from "@/lib/supabase";
import { formatCurrency, zonedTimeToIso } from "@/lib/utils";
import type { Service, Staff, Business } from "@/types";
import { Check, ChevronRight, Clock, Loader2 } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";

interface Confirmation {
  service_name: string;
  staff_name: string;
  start_time: string;
  end_time: string;
  price: number | string;
  currency: string | null;
}

export function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  // Load business + its active services/staff (anon-scoped by RLS).
  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: biz, error: bizError } = await supabase
          .from("businesses")
          .select("*")
          .eq("slug", slug || "")
          .maybeSingle();
        if (bizError) {
          setLoadError("We couldn't load this booking page. Please try again in a moment.");
          return;
        }
        if (!biz) {
          return; // "Business not found" view
        }
        setBusiness(biz as Business);
        const [s, st] = await Promise.all([
          supabase.from("services").select("*").eq("business_id", biz.id).eq("is_active", true),
          supabase.from("staff").select("*").eq("business_id", biz.id).eq("is_active", true),
        ]);
        if (s.error || st.error) {
          setLoadError("We couldn't load the available services. Please try again.");
          return;
        }
        setServices((s.data as Service[]) || []);
        setStaffList((st.data as Staff[]) || []);
      } catch (err) {
        console.error("Public booking load error:", err);
        setLoadError("We couldn't load this booking page. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Fetch real availability for the selected service + staff + date.
  // Availability always comes from the database (working hours, buffer,
  // holidays, existing bookings) — never from a hardcoded slot list.
  useEffect(() => {
    if (step < 2 || !business || !selectedService || !selectedStaff) return;
    // Capture after the guard: hoisted function declarations reset
    // TypeScript's narrowing of the outer consts.
    const slug = business.slug;
    const staffId = selectedStaff.id;
    const serviceId = selectedService.id;
    let cancelled = false;
    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError(null);
      const { data, error: rpcError } = await supabase.rpc("get_available_slots", {
        p_business_slug: slug,
        p_staff_id: staffId,
        p_service_id: serviceId,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });
      if (cancelled) return;
      if (rpcError) {
        console.error("get_available_slots error:", rpcError);
        setSlots([]);
        setSlotsError("We couldn't load the available times. Please try another day.");
      } else {
        setSlots(Array.isArray(data) ? (data as string[]) : []);
      }
      setSlotsLoading(false);
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [business, selectedService, selectedStaff, selectedDate, step]);

  // Reset the time when the context changes.
  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate, selectedStaff, selectedService]);

  const handleConfirm = async () => {
    if (!business || !selectedService || !selectedStaff || !selectedTime) return;
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address (or leave it empty).");
      return;
    }
    setBooking(true);

    // Wall-clock time in the business timezone -> instant. The server
    // re-validates everything (working hours, conflicts, business rules).
    const startIso = zonedTimeToIso(
      format(selectedDate, "yyyy-MM-dd"),
      selectedTime,
      business.timezone || "UTC",
    );
    const endIso = new Date(
      new Date(startIso).getTime() + selectedService.duration_minutes * 60000,
    ).toISOString();

    const { data, error: rpcError } = await supabase.rpc("create_public_booking", {
      p_business_slug: business.slug,
      p_service_id: selectedService.id,
      p_staff_id: selectedStaff.id,
      p_location_id: null,
      p_start_time: startIso,
      p_end_time: endIso,
      p_customer_name: name.trim(),
      p_customer_email: email.trim() || null,
      p_customer_phone: phone.trim() || null,
    });

    setBooking(false);
    // The RPC is typed as returning generic Json; the server contract is
    // the shape below (validated on the database side).
    const result = data as unknown as
      (Confirmation & { success?: boolean; error?: string; booking_id?: string }) | undefined;
    if (rpcError) {
      console.error("create_public_booking transport error:", rpcError);
      setError("Your booking could not be submitted. Please try again.");
      return;
    }
    if (!result || result.success !== true || result.error) {
      // The server rejected the booking (slot taken, closed day, ...).
      setError(result?.error || "Your booking could not be made. Please pick a different time.");
      return;
    }
    setConfirmed({
      service_name: result.service_name,
      staff_name: result.staff_name,
      start_time: result.start_time,
      end_time: result.end_time,
      price: result.price,
      currency: result.currency,
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );

  if (loadError)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            Something went wrong
          </p>
          <p className="text-sm text-gray-500 mt-1">{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Try again
          </button>
        </div>
      </div>
    );

  if (!business)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Business not found</p>
          <p className="text-sm text-gray-400 mt-1">Check the booking link and try again.</p>
        </div>
      </div>
    );

  if (confirmed)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="card p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-accent-600" />
          </div>
          <h2 className="text-xl font-bold">Booking Requested!</h2>
          <p className="text-sm text-gray-500 mt-2">
            {confirmed.service_name} with {confirmed.staff_name} on{" "}
            {format(new Date(confirmed.start_time), "EEEE, MMMM d")} at{" "}
            {format(new Date(confirmed.start_time), "h:mm a")}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Your booking is pending and will be confirmed by {business.name}.
          </p>
        </div>
      </div>
    );

  const steps = ["Service", "Staff", "Time", "Details"];
  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: business.primary_color || "#2563eb" }}
          >
            {business.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-semibold">{business.name}</h1>
            <p className="text-xs text-gray-500">Book an appointment</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  i < step
                    ? "bg-accent-600 text-white"
                    : i === step
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i === step ? "font-medium" : "text-gray-400"}`}>
                {s}
              </span>
              {i < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${i < step ? "bg-accent-600" : "bg-gray-200 dark:bg-gray-800"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Service */}
        {step === 0 && (
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No services available</p>
            ) : (
              services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(1);
                  }}
                  className="card w-full p-4 flex items-center justify-between hover:border-primary-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-10 rounded-full"
                      style={{ backgroundColor: s.color || "#3b82f6" }}
                    />
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Clock size={12} /> {s.duration_minutes} min ·{" "}
                        {formatCurrency(Number(s.price), business.currency || "USD")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 1: Staff */}
        {step === 1 && (
          <div className="space-y-2">
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 mb-2">
              ← Back
            </button>
            {staffList.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No staff available</p>
            ) : (
              staffList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStaff(s);
                    setStep(2);
                  }}
                  className="card w-full p-4 flex items-center gap-3 hover:border-primary-300 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-medium">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.bio && <p className="text-xs text-gray-500">{s.bio}</p>}
                  </div>
                  <ChevronRight size={18} className="text-gray-400 ml-auto" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500">
              ← Back
            </button>
            <div className="card p-4">
              <h3 className="font-medium text-sm mb-3">Select a date</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {nextDays.map((d) => (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`shrink-0 w-16 py-2 rounded-lg text-center transition-colors ${
                      isSameDay(d, selectedDate)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    <p className="text-xs">{format(d, "EEE")}</p>
                    <p className="font-bold">{format(d, "d")}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-medium text-sm mb-3">
                Available times — {format(selectedDate, "MMM d")}
              </h3>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-primary-600" />
                </div>
              ) : slotsError ? (
                <p className="text-sm text-gray-500 py-4">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No available times on this day. Please try another day.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((time) => (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time);
                        setStep(3);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTime === time
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500">
              ← Back
            </button>
            <div className="card p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedService?.name}</p>
                <p className="text-gray-500">
                  {selectedStaff?.name} · {format(selectedDate, "MMM d, yyyy")} at {selectedTime}
                </p>
                <p className="font-medium mt-1">
                  {formatCurrency(Number(selectedService?.price || 0), business.currency || "USD")}
                </p>
              </div>
              <div>
                <label className="label" htmlFor="pb-name">
                  Your Name
                </label>
                <input
                  id="pb-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="pb-email">
                    Email
                  </label>
                  <input
                    id="pb-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pb-phone">
                    Phone
                  </label>
                  <input
                    id="pb-phone"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-error-600">{error}</p>}
              <button onClick={handleConfirm} disabled={booking} className="btn-primary w-full">
                {booking ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
