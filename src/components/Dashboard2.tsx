import React, { useState } from "react";
import { useBusiness } from "@/lib/store";
import { formatCurrency, getTodayAppointments, getUpcomingAppointments, getMonthlyRevenue, getStaffPerformance, getServicePopularity, getOutstandingBalance } from "@/lib/booking";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  Scissors,
  CalendarDays,
  DollarSign,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Plus,
  UserPlus,
  FileDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Shield,
  Zap,
  Star,
  MapPin,
  Phone,
  Mail,
  CalendarClock,
  BookOpen,
  Settings,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  BarChart2,
  X,
  RefreshCw,
  Headphones,
  Sparkles,
  Award,
  Briefcase,
} from "lucide-react";

type View = "dashboard" | "appointments" | "calendar" | "customers" | "services" | "staff" | "payments" | "analytics" | "settings";

export function Dashboard2({ onNewBooking }: { onNewBooking?: () => void }) {
  const { business, appointments, customers, services, staff, payments } = useBusiness();
  const [currentView, setCurrentView] = useState<View>("dashboard");

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [currentYear, currentMonthNum] = [
    parseInt(currentMonth.split("-")[0]),
    parseInt(currentMonth.split("-")[1]) - 1,
  ];
  const monthRevenue = getMonthlyRevenue(payments, currentYear, currentMonthNum);
  const totalRevenue = payments.filter((p) => p.status === "recorded").reduce((sum, p) => sum + p.amount, 0);
  const paymentsReceived = payments.filter((p) => p.status === "recorded").length;
  const todayAppointments = getTodayAppointments(appointments);
  const upcomingAppointments = getUpcomingAppointments(appointments);

  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const activeServices = services.filter((s) => s.active).length;

  const outstandingTotal = appointments
    .filter((a) => a.status === "scheduled" || a.status === "completed")
    .reduce((sum, a) => {
      const appPayments = payments.filter((p) => p.appointmentId === a.id);
      return sum + getOutstandingBalance(a.servicePrice, appPayments);
    }, 0);

  const staffPerf = getStaffPerformance(staff, appointments);
  const servicePop = getServicePopularity(services, appointments);

  const recentAppointments = appointments.slice(0, 5);
  const recentPayments = payments.slice(0, 5);

  const KPICards = [
    { label: "Active Customers", value: activeCustomers, icon: Users, color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
    { label: "Active Services", value: activeServices, icon: Scissors, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
    { label: "Today's Appointments", value: todayAppointments.length, icon: CalendarDays, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
    { label: "This Month Revenue", value: formatCurrency(monthRevenue, business?.currency || "USD"), icon: DollarSign, color: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/20" },
  ];

  const FinancialCards = [
    { label: "Payments Received", value: `${paymentsReceived} transactions`, sub: formatCurrency(totalRevenue, business?.currency || "USD"), icon: CreditCard, color: "from-emerald-500 to-teal-500" },
    { label: "Outstanding Balances", value: formatCurrency(outstandingTotal, business?.currency || "USD"), sub: `${appointments.filter((a) => a.status === "scheduled" || a.status === "completed").length} open`, icon: Wallet, color: "from-amber-500 to-orange-500" },
  ];

  const ScheduleCards = [
    { label: "Today's Schedule", count: todayAppointments.length, icon: Clock, items: todayAppointments.slice(0, 3), color: "from-blue-500 to-indigo-500" },
    { label: "Upcoming Appointments", count: upcomingAppointments.length, icon: CalendarClock, items: upcomingAppointments.slice(0, 3), color: "from-purple-500 to-violet-500" },
  ];

  const AnalyticsCards = [
    { label: "Revenue Trend", icon: TrendingUp, value: `${formatCurrency(monthRevenue, business?.currency || "USD")}`, sub: "This month", color: "from-emerald-500 to-teal-500" },
    { label: "Appointment Trend", icon: Activity, value: `${appointments.length} total`, sub: `${todayAppointments.length} today`, color: "from-blue-500 to-indigo-500" },
    { label: "Staff Performance", icon: Award, value: `${staffPerf.filter((s) => s.completedAppointments > 0).length} active`, sub: `${staff.length} members`, color: "from-amber-500 to-orange-500" },
    { label: "Popular Services", icon: Star, value: `${servicePop[0]?.name || "N/A"}`, sub: `${servicePop[0]?.count || 0} bookings`, color: "from-rose-500 to-pink-500" },
  ];

  const navItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    { id: "customers", label: "Customers", icon: Users },
    { id: "services", label: "Services", icon: Scissors },
    { id: "staff", label: "Staff", icon: Briefcase },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const statusVariants: Record<string, "success" | "info" | "warning" | "destructive" | "secondary"> = {
    confirmed: "success",
    scheduled: "info",
    completed: "success",
    cancelled: "destructive",
    "no-show": "warning",
    active: "success",
    inactive: "secondary",
  };

  const methodColors: Record<string, string> = {
    cash: "bg-emerald-100 text-emerald-700",
    card: "bg-blue-100 text-blue-700",
    mobile: "bg-purple-100 text-purple-700",
    bank: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-8 py-6 text-white shadow-xl shadow-emerald-600/20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold">
              Welcome back, {business?.name || "your business"}!
            </h2>
            <p className="mt-1 text-emerald-100 text-sm">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md md:flex">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPICards.map(({ label, value, icon: Icon, color, shadow }) => (
          <Card key={label} className="group hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg ${shadow} transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial + Schedule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Financial Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Financial Overview
          </h3>
          {FinancialCards.map(({ label, value, sub, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-lg font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-400">{sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Schedule Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Schedule Overview
          </h3>
          {ScheduleCards.map(({ label, count, icon: Icon, items, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                {items.length === 0 ? (
                  <div className="py-4 text-center text-sm text-slate-400">No items</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-xs">
                            {item.customerName?.charAt(0) || item.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.customerName || item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.serviceName || item.relevantInfo}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">{item.date || item.startTime}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analytics Mini-Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AnalyticsCards.map(({ label, icon: Icon, value, sub, color }) => (
          <Card key={label} className="group hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-md transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest appointments and payments</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Live</Badge>
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Appointments</p>
                  {recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 py-2">
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{apt.customerName}</p>
                        <p className="text-xs text-slate-500">{apt.serviceName} • {apt.staffName}</p>
                      </div>
                      <Badge variant={statusVariants[apt.status] || "secondary"}>{apt.status}</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Payments</p>
                  {recentPayments.map((pay) => (
                    <div key={pay.id} className="flex items-center gap-3 py-2">
                      <div className={`h-2 w-2 rounded-full ${pay.status === "recorded" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{pay.customerName}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(pay.amount, business?.currency || "USD")} • {pay.paymentMethod}</p>
                      </div>
                      <Badge variant={pay.status === "recorded" ? "success" : "destructive"}>{pay.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: CalendarDays, text: "New appointment booked", time: "2 min ago", color: "from-blue-500 to-indigo-500" },
                { icon: CreditCard, text: "Payment received", time: "15 min ago", color: "from-emerald-500 to-teal-500" },
                { icon: UserPlus, text: "New customer registered", time: "1 hr ago", color: "from-purple-500 to-violet-500" },
                { icon: AlertCircle, text: "Upcoming reminder", time: "2 hrs ago", color: "from-amber-500 to-orange-500" },
              ].map((notif, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${notif.color} shadow-sm`}>
                    <notif.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{notif.text}</p>
                    <p className="text-xs text-slate-400">{notif.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CalendarDays, label: "New Appointment", action: onNewBooking, color: "from-emerald-500 to-teal-500" },
              { icon: UserPlus, label: "Add Customer", action: () => setCurrentView("customers"), color: "from-blue-500 to-indigo-500" },
              { icon: Scissors, label: "Add Service", action: () => setCurrentView("services"), color: "from-purple-500 to-violet-500" },
              { icon: CreditCard, label: "Record Payment", action: () => setCurrentView("payments"), color: "from-amber-500 to-orange-500" },
            ].map(({ icon: Icon, label, action, color }) => (
              <button
                key={label}
                onClick={action}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-emerald-200 hover:bg-gradient-to-b hover:from-emerald-50/50 hover:to-teal-50/50 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
