import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, calculateEndTime, hasConflict } from "@/lib/booking";

export function Appointments() {
  const { appointments, customers, services, staff, addAppointment, updateAppointment, deleteAppointment, business } = useBusiness();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    serviceId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === form.customerId);
    const service = services.find((s) => s.id === form.serviceId);
    const staffMember = staff.find((s) => s.id === form.staffId);

    if (!customer || !service || !staffMember) return;

    const endTime = calculateEndTime(form.startTime, service.duration);
    const appointmentData = {
      customerId: customer.id,
      serviceId: service.id,
      staffId: staffMember.id,
      date: form.date,
      startTime: form.startTime,
      endTime,
      status: "scheduled" as const,
      customerName: customer.fullName,
      serviceName: service.name,
      staffName: staffMember.fullName,
      servicePrice: service.price,
      notes: form.notes,
    };

    if (hasConflict(appointmentData, appointments, business?.bookingBufferMinutes || 0)) {
      alert("This time slot conflicts with an existing appointment");
      return;
    }

    if (editingId) {
      updateAppointment(editingId, appointmentData);
    } else {
      addAppointment(appointmentData);
    }
    setForm({ customerId: "", serviceId: "", staffId: "", date: new Date().toISOString().split("T")[0], startTime: "09:00", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (appointment: typeof appointments[0]) => {
    setEditingId(appointment.id);
    setForm({
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      date: appointment.date,
      startTime: appointment.startTime,
      notes: appointment.notes || "",
    });
    setShowForm(true);
  };

  const sortedAppointments = [...appointments].sort((a, b) => 
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
          <p className="text-sm text-slate-500">Schedule and manage appointments</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ customerId: "", serviceId: "", staffId: "", date: new Date().toISOString().split("T")[0], startTime: "09:00", notes: "" }); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <select
                    id="customer"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <select
                    id="service"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={form.serviceId}
                    onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                    required
                  >
                    <option value="">Select service</option>
                    {services.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price, business?.currency || "PKR")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff">Staff Member</Label>
                  <select
                    id="staff"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={form.staffId}
                    onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    required
                  >
                    <option value="">Select staff</option>
                    {staff.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Create"} Appointment</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sortedAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-900 mb-1">No appointments</h3>
            <p className="text-sm text-slate-500">Schedule your first appointment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{appointment.customerName}</h3>
                      <Badge variant={
                        appointment.status === "completed" ? "default" :
                        appointment.status === "cancelled" ? "secondary" :
                        appointment.status === "no-show" ? "destructive" : "outline"
                      }>
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {appointment.date} • {appointment.startTime} - {appointment.endTime}
                    </p>
                    <p className="text-sm text-slate-500">
                      {appointment.serviceName} • {appointment.staffName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(appointment.servicePrice, business?.currency || "PKR")}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(appointment)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteAppointment(appointment.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}