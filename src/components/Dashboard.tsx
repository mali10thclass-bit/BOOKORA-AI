import { useBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Scissors, CalendarDays, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency, getOutstandingBalance, getMonthKey } from "@/lib/booking";

export function Dashboard() {
  const { customers, services, appointments, payments, business } = useBusiness();

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((a) => a.date === today);
  const currentMonth = getMonthKey(new Date());

  const totalRevenue = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);

  const monthRevenue = payments
    .filter((p) => p.status === "recorded" && getMonthKey(new Date(p.paymentDate)) === currentMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingTotal = appointments
    .filter((a) => a.status === "scheduled" || a.status === "completed")
    .reduce((sum, a) => {
      const appPayments = payments.filter((p) => p.appointmentId === a.id);
      return sum + getOutstandingBalance(a.servicePrice, appPayments);
    }, 0);

  const stats = [
    {
      title: "Active Customers",
      value: customers.filter((c) => c.status === "active").length,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Active Services",
      value: services.filter((s) => s.active).length,
      icon: Scissors,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Today's Appointments",
      value: todayAppointments.length,
      icon: CalendarDays,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Month Revenue",
      value: formatCurrency(monthRevenue, business?.currency || "PKR"),
      icon: TrendingUp,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const upcomingAppointments = [...appointments]
    .filter((a) => a.status === "scheduled" && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{appointment.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {appointment.date} • {appointment.startTime} - {appointment.endTime}
                      </p>
                      <p className="text-xs text-slate-400">{appointment.serviceName} • {appointment.staffName}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(appointment.servicePrice, business?.currency || "PKR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(totalRevenue, business?.currency || "PKR")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Outstanding Balance</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(outstandingTotal, business?.currency || "PKR")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">This Month</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(monthRevenue, business?.currency || "PKR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}