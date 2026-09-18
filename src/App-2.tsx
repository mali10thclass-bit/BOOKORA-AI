import { useState } from "react";
import { StoreProvider, useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getTodayAppointments, getUpcomingAppointments, getOutstandingBalance } from "@/lib/booking";
import { Customers } from "@/components/Customers";
import { Services } from "@/components/Services";
import { Staff } from "@/components/Staff";
import { Appointments } from "@/components/Appointments";
import { Calendar } from "@/components/Calendar";
import { Payments } from "@/components/Payments";
import { Analytics } from "@/components/Analytics";
import { Settings } from "@/components/Settings";
import { PublicBooking } from "@/components/PublicBooking";
import {
  LayoutDashboard,
  Users,
  Scissors,
  UserCog,
  CalendarDays,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  CalendarPlus,
  BookOpen,
  LogOut,
} from "lucide-react";

type Page = "dashboard" | "customers" | "services" | "staff" | "appointments" | "calendar" | "payments" | "analytics" | "settings" | "public-booking";

function Dashboard() {
  const { customers, services, appointments, payments, business } = useBusiness();

  const todayAppointments = getTodayAppointments(appointments);
  const upcomingAppointments = getUpcomingAppointments(appointments);
  const validPayments = payments.filter((p) => p.status === "recorded");

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthPayments = validPayments.filter((p) => p.paymentDate.startsWith(thisMonth));
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalOutstanding = appointments.reduce((sum, a) => {
    const appPayments = payments.filter((p) => p.appointmentId === a.id);
    return sum + getOutstandingBalance(a.servicePrice, appPayments);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">
          {business?.name || "My Business"} • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Scissors className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Services</p>
                <p className="text-xl font-bold text-slate-900">
                  {services.filter((s) => s.active).length}
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
                <p className="text-sm text-slate-500">Today's Appointments</p>
                <p className="text-xl font-bold text-slate-900">{todayAppointments.length}</p>
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
                <p className="text-sm text-slate-500">This Month Revenue</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(thisMonthRevenue, business?.currency || "PKR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Today's Schedule</h3>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{appointment.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {appointment.startTime} - {appointment.endTime} • {appointment.serviceName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(appointment.servicePrice, business?.currency || "PKR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Upcoming Appointments</h3>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{appointment.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {appointment.date} • {appointment.startTime} • {appointment.serviceName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(appointment.servicePrice, business?.currency || "PKR")}
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Financial Summary</h3>
              <p className="text-sm text-slate-500">Real payment data only</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Outstanding Balance</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(totalOutstanding, business?.currency || "PKR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>("dashboard");
  const { business } = useBusiness();

  const navigation = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "customers" as Page, label: "Customers", icon: Users },
    { id: "services" as Page, label: "Services", icon: Scissors },
    { id: "staff" as Page, label: "Staff", icon: UserCog },
    { id: "appointments" as Page, label: "Appointments", icon: CalendarDays },
    { id: "calendar" as Page, label: "Calendar", icon: CalendarDays },
    { id: "payments" as Page, label: "Payments", icon: CreditCard },
    { id: "analytics" as Page, label: "Analytics", icon: BarChart3 },
    { id: "settings" as Page, label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">BOOKORA AI</h1>
                <p className="text-xs text-slate-400">{business?.name || "Business Management"}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  page === item.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={() => setPage("public-booking")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <CalendarPlus className="h-4 w-4" />
              Public Booking
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mt-1">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {page === "dashboard" && <Dashboard />}
          {page === "customers" && <Customers />}
          {page === "services" && <Services />}
          {page === "staff" && <Staff />}
          {page === "appointments" && <Appointments />}
          {page === "calendar" && <Calendar />}
          {page === "payments" && <Payments />}
          {page === "analytics" && <Analytics />}
          {page === "settings" && <Settings />}
          {page === "public-booking" && <PublicBooking />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}