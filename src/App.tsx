import React, { useState } from "react";
import { StoreProvider, useBusiness } from "@/lib/store";
import { BookingModal } from "@/components/BookingModal";
import { Dashboard2 } from "@/components/Dashboard2";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Wallet,
  CalendarClock,
  UserPlus,
  Filter,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  BarChart2,
} from "lucide-react";

type View = "dashboard" | "appointments" | "calendar" | "customers" | "services" | "staff" | "payments" | "analytics" | "settings";

function AppContent() {
  const { auth, logout } = useBusiness();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 animate-pulse">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <AuthScreen />;
  }

  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard, color: "from-emerald-500 to-teal-500" },
    { id: "appointments" as View, label: "Appointments", icon: CalendarDays, color: "from-blue-500 to-indigo-500" },
    { id: "calendar" as View, label: "Calendar", icon: CalendarDays, color: "from-purple-500 to-violet-500" },
    { id: "customers" as View, label: "Customers", icon: Users, color: "from-pink-500 to-rose-500" },
    { id: "services" as View, label: "Services", icon: Scissors, color: "from-amber-500 to-orange-500" },
    { id: "staff" as View, label: "Staff", icon: UserCog, color: "from-cyan-500 to-sky-500" },
    { id: "payments" as View, label: "Payments", icon: CreditCard, color: "from-green-500 to-emerald-500" },
    { id: "analytics" as View, label: "Analytics", icon: BarChart3, color: "from-red-500 to-rose-500" },
    { id: "settings" as View, label: "Settings", icon: Settings, color: "from-slate-500 to-slate-600" },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800/50 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-white">Bookora</h1>
              <p className="text-xs text-slate-400">AI Booking Suite</p>
            </div>
            <button className="ml-auto text-slate-400 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                    )}
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md transition-transform group-hover:scale-110`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t border-slate-800/50 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={auth.user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500">
                  {auth.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{auth.user?.name}</p>
                <p className="truncate text-xs text-slate-400">{auth.user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl">
          <button className="text-slate-500 hover:text-slate-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {navItems.find((n) => n.id === currentView)?.label}
            </h2>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="w-64 pl-9" placeholder="Search..." />
              </div>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[10px] font-bold text-white">
                  3
                </span>
              </Button>
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30" onClick={() => setBookingOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === "dashboard" && <DashboardView onNewBooking={() => setBookingOpen(true)} />}
          {currentView === "appointments" && <AppointmentsView onNewBooking={() => setBookingOpen(true)} />}
          {currentView === "calendar" && <CalendarView />}
          {currentView === "customers" && <CustomersView />}
          {currentView === "services" && <ServicesView />}
          {currentView === "staff" && <StaffView />}
          {currentView === "payments" && <PaymentsView />}
          {currentView === "analytics" && <AnalyticsView />}
          {currentView === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Booking Modal */}
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}

function AuthScreen() {
  const { login, register } = useBusiness();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = isLogin
      ? await login(email, password)
      : await register(name, email, password);
    if (!success) {
      setError(isLogin ? "Invalid email or password" : "Email already registered");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-white">Bookora</span>
        </div>
        <div>
          <h1 className="font-serif text-5xl font-bold leading-tight text-white">
            Run your business
            <br />
            with AI-powered
            <br />
            booking intelligence
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Automate scheduling, payments, and customer engagement in one place.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: CalendarClock, text: "Smart scheduling & reminders", color: "from-emerald-400 to-teal-500" },
            { icon: Wallet, text: "Integrated payments & invoicing", color: "from-blue-400 to-indigo-500" },
            { icon: TrendingUp, text: "AI-driven business insights", color: "from-purple-400 to-violet-500" },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-center gap-3 text-slate-300">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-slate-900">Bookora</h1>
          </div>

          <Card className="border-slate-200/80 shadow-2xl shadow-slate-200/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {isLogin ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {isLogin ? "Sign in to your workspace" : "Start your 14-day free trial"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-3 text-sm text-red-600 border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <Button type="submit" size="lg" className="w-full">
                  {isLogin ? "Sign in" : "Create account"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ onNewBooking }: { onNewBooking: () => void }) {
  const { business, appointments, customers, payments, services } = useBusiness();

  const todayAppointments = appointments.filter(
    (a) => a.date === new Date().toISOString().split("T")[0]
  );
  const totalRevenue = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
  const upcomingAppointments = appointments
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const stats = [
    { label: "Today's Appointments", value: todayAppointments.length, icon: CalendarDays, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
    { label: "Total Customers", value: customers.length, icon: Users, color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
    { label: "Active Services", value: services.filter((s) => s.active).length, icon: Scissors, color: "from-purple-500 to-violet-500", shadow: "shadow-purple-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl shadow-emerald-600/20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold">
              Welcome back, {business?.name || "your business"}!
            </h2>
            <p className="mt-2 text-emerald-100">
              Here's what's happening with your business today.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md md:flex">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, shadow }) => (
          <Card key={label} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-lg ${shadow} transition-transform group-hover:scale-110`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Button variant="outline" size="sm" onClick={onNewBooking}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <CalendarDays className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500">No upcoming appointments</p>
                <Button className="mt-4" onClick={onNewBooking}>
                  <Plus className="mr-2 h-4 w-4" />
                  Book appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="group flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 transition-all duration-200 hover:border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100">
                      <CalendarDays className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{appointment.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {appointment.serviceName} • {appointment.staffName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(appointment.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-500">{appointment.startTime}</p>
                    </div>
                    <Badge variant={appointment.status === "confirmed" ? "success" : "info"}>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: UserPlus, label: "Add Customer", color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
              { icon: CalendarDays, label: "New Appointment", color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20", action: onNewBooking },
              { icon: Wallet, label: "Record Payment", color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
              { icon: Scissors, label: "Add Service", color: "from-purple-500 to-violet-500", shadow: "shadow-purple-500/20" },
            ].map(({ icon: Icon, label, color, shadow, action }) => (
              <button
                key={label}
                onClick={action}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-left transition-all duration-200 hover:border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg ${shadow} transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.slice(0, 5).map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                <p className="flex-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{appointment.customerName}</span>{" "}
                  booked {appointment.serviceName} with {appointment.staffName}
                </p>
                <span className="text-xs text-slate-400">
                  {new Date(appointment.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentsView({ onNewBooking }: { onNewBooking: () => void }) {
  const { appointments, updateAppointment, deleteAppointment } = useBusiness();
  const [filter, setFilter] = useState("all");

  const filteredAppointments = appointments.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  const statusColors: Record<string, string> = {
    scheduled: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200",
    confirmed: "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200",
    completed: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-200",
    cancelled: "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200",
    "no-show": "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={onNewBooking}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="group transition-colors hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500">
                            {appointment.customerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">{appointment.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{appointment.serviceName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{appointment.staffName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(appointment.date).toLocaleDateString()} at {appointment.startTime}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={statusColors[appointment.status]}>
                        {appointment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() =>
                            updateAppointment(appointment.id, {
                              status:
                                appointment.status === "scheduled"
                                  ? "confirmed"
                                  : appointment.status === "confirmed"
                                  ? "completed"
                                  : "scheduled",
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-50 hover:text-red-600"
                          onClick={() => deleteAppointment(appointment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarView() {
  const { appointments } = useBusiness();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthAppointments = appointments.filter((a) => {
    const date = new Date(a.date);
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  });

  const getAppointmentsForDay = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split("T")[0];
    return monthAppointments.filter((a) => a.date === dateStr);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day) => (
              <div key={day} className="py-2 text-center text-sm font-medium text-slate-500">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAppointments = getAppointmentsForDay(day);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-xl border p-2 transition-all duration-200 ${
                    isToday
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-500/10"
                      : "border-slate-200 hover:border-emerald-200 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50"
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? "text-emerald-700" : "text-slate-700"}`}>
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="truncate rounded-lg bg-gradient-to-r from-emerald-100 to-teal-100 px-1.5 py-0.5 text-xs text-emerald-700"
                      >
                        {appointment.startTime} {appointment.customerName}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-slate-400">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomersView() {
  const { customers, addCustomer, deleteCustomer } = useBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const handleAdd = () => {
    if (!newCustomer.fullName) return;
    addCustomer({
      ...newCustomer,
      status: "active",
    });
    setNewCustomer({ fullName: "", email: "", phone: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input className="w-64" placeholder="Search customers..." />
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {showAdd && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={newCustomer.fullName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>
                Add Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <Card key={customer.id} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-lg">
                      {customer.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-slate-900">{customer.fullName}</h3>
                    <p className="text-sm text-slate-500">{customer.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteCustomer(customer.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4" />
                  {customer.phone || "No phone"}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  {customer.email || "No email"}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge variant={customer.status === "active" ? "success" : "secondary"}>
                  {customer.status}
                </Badge>
                <span className="text-xs text-slate-400">
                  Added {new Date(customer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ServicesView() {
  const { services, addService, deleteService } = useBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    duration: 30,
    price: 0,
    description: "",
  });

  const handleAdd = () => {
    if (!newService.name) return;
    addService({
      ...newService,
      active: true,
    });
    setNewService({ name: "", duration: 30, price: 0, description: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Your Services</h3>
          <p className="text-sm text-slate-500">
            {services.length} services • {services.filter((s) => s.active).length} active
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {showAdd && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Service name</Label>
                <Input
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="Haircut & Style"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({ ...newService, duration: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="Brief description of the service"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>
                Add Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/20 transition-transform group-hover:scale-110">
                  <Scissors className="h-7 w-7 text-white" />
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteService(service.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{service.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{service.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    {service.duration} min
                  </span>
                  <span className="text-lg font-bold text-slate-900">${service.price}</span>
                </div>
                <Badge variant={service.active ? "success" : "secondary"}>
                  {service.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StaffView() {
  const { staff, addStaff, deleteStaff } = useBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "Staff",
    email: "",
    phone: "",
  });

  const handleAdd = () => {
    if (!newStaff.name) return;
    addStaff({
      ...newStaff,
      active: true,
      workingHours: { start: "09:00", end: "17:00" },
    });
    setNewStaff({ name: "", role: "Staff", email: "", phone: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
          <p className="text-sm text-slate-500">
            {staff.length} members • {staff.filter((s) => s.active).length} active
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {showAdd && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  placeholder="Stylist"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>
                Add Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <Card key={member.id} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-lg">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-slate-900">{member.name}</h3>
                    <p className="text-sm text-slate-500">{member.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteStaff(member.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  {member.workingHours.start} - {member.workingHours.end}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  {member.email || "No email"}
                </div>
              </div>
              <div className="mt-4">
                <Badge variant={member.active ? "success" : "secondary"}>
                  {member.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentsView() {
  const { payments, voidPayment } = useBusiness();

  const totalRevenue = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
  const voidedAmount = payments
    .filter((p) => p.status === "voided")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110">
                <Receipt className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/20 transition-transform group-hover:scale-110">
                <X className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Voided Amount</p>
                <p className="text-2xl font-bold text-slate-900">${voidedAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment History</CardTitle>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="group transition-colors hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30">
                    <td className="px-6 py-4 font-medium text-slate-900">{payment.customerName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${payment.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{payment.paymentMethod}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={payment.status === "recorded" ? "success" : "destructive"}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === "recorded" && (
                        <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600" onClick={() => voidPayment(payment.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsView() {
  const { appointments, payments, customers } = useBusiness();

  const totalRevenue = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
  const completedAppointments = appointments.filter((a) => a.status === "completed").length;
  const conversionRate = customers.length > 0 ? 68 : 0;

  const stats = [
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, change: "+12.5%", icon: DollarSign, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
    { label: "Appointments", value: appointments.length, change: "+8.2%", icon: CalendarDays, color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
    { label: "Completed", value: completedAppointments, change: "+15.3%", icon: CheckCircle2, color: "from-purple-500 to-violet-500", shadow: "shadow-purple-500/20" },
    { label: "Conversion Rate", value: `${conversionRate}%`, change: "+3.1%", icon: TrendingUp, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, change, icon: Icon, color, shadow }) => (
          <Card key={label} className="group hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-lg ${shadow} transition-transform group-hover:scale-110`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <Badge variant="success">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {change}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="text-center">
                <BarChart2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">Revenue chart will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{appointment.serviceName}</p>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${Math.random() * 80 + 20}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">${appointment.servicePrice}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsView() {
  const { business, updateBusiness, subscription, changePlan } = useBusiness();

  const plans = [
    { id: "FREE" as const, name: "Free", price: 0, features: ["Up to 10 appointments/mo", "Basic scheduling", "Email support"] },
    { id: "PRO" as const, name: "Pro", price: 29, features: ["Unlimited appointments", "AI insights", "Payment processing", "Priority support"] },
    { id: "BUSINESS" as const, name: "Business", price: 79, features: ["Everything in Pro", "Multi-location", "Advanced analytics", "Custom branding"] },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business name</Label>
              <Input
                value={business?.name || ""}
                onChange={(e) => updateBusiness({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={business?.email || ""}
                onChange={(e) => updateBusiness({ email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={business?.phone || ""}
                onChange={(e) => updateBusiness({ phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={business?.address || ""}
                onChange={(e) => updateBusiness({ address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={business?.currency || "USD"}
                onChange={(e) => updateBusiness({ currency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={business?.timezone || "UTC"}
                onChange={(e) => updateBusiness({ timezone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>
            Current plan: <span className="font-medium text-slate-900">{subscription.plan}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 transition-all duration-200 ${
                  subscription.plan === plan.id
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 shadow-lg shadow-emerald-500/10"
                    : "border-slate-200 hover:border-emerald-200 hover:shadow-md"
                }`}
              >
                <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  ${plan.price}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full ${
                    subscription.plan === plan.id
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/20"
                      : ""
                  }`}
                  variant={subscription.plan === plan.id ? "default" : "outline"}
                  onClick={() => changePlan(plan.id)}
                  disabled={subscription.plan === plan.id}
                >
                  {subscription.plan === plan.id ? "Current Plan" : "Upgrade"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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