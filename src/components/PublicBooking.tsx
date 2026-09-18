import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, calculateEndTime, hasConflict } from "@/lib/booking";
import { CalendarPlus, CheckCircle2 } from "lucide-react";

export function PublicBooking() {
  const { services, staff, appointments, addAppointment, business } = useBusiness();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    serviceId: "",
    staffId: "",
    date: "",
    startTime: "",
  });
  const [bookingComplete, setBookingComplete] = useState(false);

  const activeServices = services.filter((s) => s.active);
  const activeStaff = staff.filter((s) => s.active);
  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedStaff = staff.find((s) => s.id === form.staffId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedStaff) return;

    const endTime = calculateEndTime(form.startTime, selectedService.duration);
    const appointmentData = {
      customerId: "",
      serviceId: selectedService.id,
      staffId: selectedStaff.id,
      date: form.date,
      startTime: form.startTime,
      endTime,
      status: "scheduled" as const,
      customerName: form.customerName,
      serviceName: selectedService.name,
      staffName: selectedStaff.fullName,
      servicePrice: selectedService.price,
      notes: `Booked online by ${form.customerName}`,
    };

    if (hasConflict(appointmentData, appointments, business?.bookingBufferMinutes || 0)) {
      alert("This time slot is no longer available. Please choose another time.");
      return;
    }

    addAppointment(appointmentData);
    setBookingComplete(true);
  };

  if (bookingComplete) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
            <p className="text-slate-600 mb-6">
              Thank you, {form.customerName}! Your appointment has been booked successfully.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <p className="font-semibold text-slate-900">{selectedService?.name}</p>
              <p className="text-sm text-slate-600">with {selectedStaff?.fullName}</p>
              <p className="text-sm text-slate-600">{form.date} at {form.startTime}</p>
              <p className="font-semibold text-slate-900 mt-2">
                {formatCurrency(selectedService?.price || 0, business?.currency || "PKR")}
              </p>
            </div>
            <Button onClick={() => { setStep(1); setBookingComplete(false); setForm({ customerName: "", phone: "", email: "", serviceId: "", staffId: "", date: "", startTime: "" }); }}>
              Book Another Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full mb-4">
          <CalendarPlus className="h-4 w-4" />
          <span className="text-sm font-medium">Online Booking</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{business?.name || "Book an Appointment"}</h2>
        <p className="text-slate-600">{business?.tagline || "Schedule your appointment online"}</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-indigo-600" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Select a Service</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeServices.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => setForm({ ...form, serviceId: service.id })}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        form.serviceId === service.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{service.name}</span>
                        <span className="font-bold text-indigo-600">
                          {formatCurrency(service.price, business?.currency || "PKR")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{service.duration} minutes</p>
                      {service.description && (
                        <p className="text-sm text-slate-600 mt-2">{service.description}</p>
                      )}
                    </button>
                  ))}
                </div>
                {activeServices.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No services available for booking</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Select Staff & Time</h3>
                <div className="space-y-2">
                  <Label>Staff Member</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeStaff.map((member) => (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => setForm({ ...form, staffId: member.id })}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          form.staffId === member.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="font-semibold text-slate-900">{member.fullName}</span>
                        <p className="text-sm text-slate-500">
                          {member.workingHours.start} - {member.workingHours.end}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Your Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full Name</Label>
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                {selectedService && selectedStaff && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-semibold text-slate-900">{selectedService.name}</p>
                    <p className="text-sm text-slate-600">with {selectedStaff.fullName}</p>
                    <p className="text-sm text-slate-600">{form.date} at {form.startTime}</p>
                    <p className="font-bold text-slate-900 mt-2">
                      {formatCurrency(selectedService.price, business?.currency || "PKR")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !form.serviceId : !form.staffId || !form.date || !form.startTime}
                >
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={!form.customerName || !form.phone}>
                  Confirm Booking
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}