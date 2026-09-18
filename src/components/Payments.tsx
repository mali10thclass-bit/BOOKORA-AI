import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Ban } from "lucide-react";
import { formatCurrency, getOutstandingBalance } from "@/lib/booking";

export function Payments() {
  const { payments, appointments, addPayment, voidPayment, business } = useBusiness();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    appointmentId: "",
    amount: 0,
    paymentMethod: "cash" as "cash" | "card" | "online",
    notes: "",
  });

  const validPayments = payments.filter((p) => p.status === "recorded");
  const totalCollected = validPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const appointment = appointments.find((a) => a.id === form.appointmentId);
    if (!appointment) return;

    const receiptRef = `RCP-${Date.now().toString().slice(-6)}`;
    addPayment({
      appointmentId: appointment.id,
      amount: form.amount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: form.paymentMethod,
      status: "recorded",
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      appointmentDate: appointment.date,
      appointmentValue: appointment.servicePrice,
      receiptRef,
      notes: form.notes,
    });
    setForm({ appointmentId: "", amount: 0, paymentMethod: "cash", notes: "" });
    setShowForm(false);
  };

  const sortedPayments = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-500">Track all payment transactions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Collected</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalCollected, business?.currency || "PKR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Payments</p>
            <p className="text-2xl font-bold text-slate-900">{validPayments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Voided Payments</p>
            <p className="text-2xl font-bold text-amber-600">
              {payments.filter((p) => p.status === "voided").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment">Appointment</Label>
                  <select
                    id="appointment"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={form.appointmentId}
                    onChange={(e) => {
                      const appointment = appointments.find((a) => a.id === e.target.value);
                      const outstanding = appointment ? getOutstandingBalance(appointment.servicePrice, payments.filter((p) => p.appointmentId === appointment.id)) : 0;
                      setForm({ ...form, appointmentId: e.target.value, amount: outstanding });
                    }}
                    required
                  >
                    <option value="">Select appointment</option>
                    {appointments
                      .filter((a) => a.status === "scheduled" || a.status === "completed")
                      .map((a) => {
                        const outstanding = getOutstandingBalance(a.servicePrice, payments.filter((p) => p.appointmentId === a.id));
                        return (
                          <option key={a.id} value={a.id}>
                            {a.customerName} - {a.serviceName} (Outstanding: {formatCurrency(outstanding, business?.currency || "PKR")})
                          </option>
                        );
                      })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as "cash" | "card" | "online" })}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
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
                <Button type="submit">Record Payment</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sortedPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-900 mb-1">No payments recorded</h3>
            <p className="text-sm text-slate-500">Record your first payment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{payment.customerName}</h3>
                      <Badge variant={payment.status === "recorded" ? "default" : "secondary"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {payment.serviceName} • {payment.appointmentDate}
                    </p>
                    <p className="text-sm text-slate-500">
                      {payment.paymentMethod} • Ref: {payment.receiptRef}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(payment.amount, business?.currency || "PKR")}
                    </p>
                    {payment.status === "recorded" && (
                      <Button variant="outline" size="sm" onClick={() => voidPayment(payment.id)}>
                        <Ban className="h-3 w-3 mr-1" />
                        Void
                      </Button>
                    )}
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