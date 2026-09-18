import { useBusiness } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getOutstandingBalance } from "@/lib/booking";
import { TrendingUp, Users, CalendarDays, CreditCard } from "lucide-react";

export function Analytics() {
  const { customers, services, staff, appointments, payments, business } = useBusiness();

  const validPayments = payments.filter((p) => p.status === "recorded");
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = appointments.reduce((sum, a) => {
    const appPayments = payments.filter((p) => p.appointmentId === a.id);
    return sum + getOutstandingBalance(a.servicePrice, appPayments);
  }, 0);

  const completedAppointments = appointments.filter((a) => a.status === "completed").length;
  const cancelledAppointments = appointments.filter((a) => a.status === "cancelled").length;
  const noShowAppointments = appointments.filter((a) => a.status === "no-show").length;
  const scheduledAppointments = appointments.filter((a) => a.status === "scheduled").length;

  const completionRate = appointments.length > 0 
    ? Math.round((completedAppointments / appointments.length) * 100) 
    : 0;

  const avgAppointmentValue = appointments.length > 0
    ? appointments.reduce((sum, a) => sum + a.servicePrice, 0) / appointments.length
    : 0;

  const topServices = services
    .map((service) => {
      const serviceAppointments = appointments.filter((a) => a.serviceId === service.id);
      const revenue = serviceAppointments.reduce((sum, a) => sum + a.servicePrice, 0);
      return { ...service, count: serviceAppointments.length, revenue };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCustomers = customers
    .map((customer) => {
      const customerAppointments = appointments.filter((a) => a.customerId === customer.id);
      const totalSpent = customerAppointments.reduce((sum, a) => sum + a.servicePrice, 0);
      return { ...customer, count: customerAppointments.length, totalSpent };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-sm text-slate-500">Business performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(totalRevenue, business?.currency || "PKR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Customers</p>
                <p className="text-xl font-bold text-slate-900">
                  {customers.filter((c) => c.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-xl font-bold text-slate-900">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(totalOutstanding, business?.currency || "PKR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Appointment Status</h3>
            <div className="space-y-3">
              {[
                { label: "Scheduled", count: scheduledAppointments, color: "bg-blue-500" },
                { label: "Completed", count: completedAppointments, color: "bg-emerald-500" },
                { label: "Cancelled", count: cancelledAppointments, color: "bg-amber-500" },
                { label: "No-Show", count: noShowAppointments, color: "bg-rose-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Top Services</h3>
            {topServices.length === 0 ? (
              <p className="text-sm text-slate-500">No service data available</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{service.name}</p>
                      <p className="text-sm text-slate-500">{service.count} bookings</p>
                    </div>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(service.revenue, business?.currency || "PKR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Top Customers</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">No customer data available</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{customer.fullName}</p>
                    <p className="text-sm text-slate-500">{customer.count} appointments</p>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(customer.totalSpent, business?.currency || "PKR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}