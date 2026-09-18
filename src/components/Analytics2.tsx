import React, { useState, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import {
  getRevenueStats,
  getMonthlyRevenue,
  getBookingTrends,
  getServicePerformance,
  getStaffPerformance,
  getCustomerRetentionRate,
  getCancellationRate,
  getNoShowRate,
  getCustomerSegments,
  getRevenueGrowthRate,
  getAppointmentGrowthRate,
  getCustomerGrowthRate,
  getAverageBookingValue,
  getPeakBookingHour,
  getSlowestBookingHour,
  getServicePopularity,
  getStaffComparison,
  getRevenuePerCustomer,
  getPaymentMethodBreakdown,
  getPeakBookingDays,
  getAverageAppointmentValue,
} from "@/lib/booking";
import {
  DollarSign,
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  CreditCard,
  BarChart3,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  Star,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/booking";

type TimeRange = "today" | "7d" | "30d" | "90d" | "custom";

const RANGE_DAYS: Record<Exclude<TimeRange, "custom">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BarChart({
  data,
  dataKey,
  color,
  height = 120,
  labels,
}: {
  data: { label: string; [dataKey]: number }[];
  dataKey: string;
  color: string;
  height?: number;
  labels?: boolean;
}) {
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const val = d[dataKey] || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-400 to-teal-500 transition-all hover:from-emerald-500 hover:to-teal-600" style={{ height: `${pct}%`, minHeight: val > 0 ? 4 : 2 }} />
            {labels && (
              <span className="text-[9px] text-slate-400">{d.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarChart({
  data,
  dataKey,
  color,
  labelKey,
}: {
  data: { [labelKey]: string; [dataKey]: number }[];
  dataKey: string;
  color: string;
  labelKey: string;
}) {
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const val = d[dataKey] || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={i}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600">{d[labelKey]}</span>
              <span className="font-medium text-slate-900">{val}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Analytics2() {
  const { customers, services, staff, appointments, payments, business } = useBusiness();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState("revenue");

  const validPayments = useMemo(() => payments.filter((p) => p.status === "recorded"), [payments]);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (timeRange === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      const end = new Date(customEnd);
      return appointments.filter((a) => {
        const d = new Date(a.date);
        return d >= start && d <= end;
      });
    } else if (timeRange !== "custom") {
      const days = RANGE_DAYS[timeRange as Exclude<TimeRange, "custom">];
      start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return appointments.filter((a) => {
        const d = new Date(a.date);
        return d >= start;
      });
    }
    return appointments;
  }, [appointments, timeRange, customStart, customEnd]);

  const filteredPayments = useMemo(() => {
    if (timeRange === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      return validPayments.filter((p) => {
        const d = new Date(p.paymentDate);
        return d >= start && d <= end;
      });
    }
    if (timeRange !== "custom") {
      const days = RANGE_DAYS[timeRange as Exclude<TimeRange, "custom">];
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return validPayments.filter((p) => new Date(p.paymentDate) >= start);
    }
    return validPayments;
  }, [validPayments, timeRange, customStart, customEnd]);

  const revenueStats = useMemo(() => getRevenueStats(filteredPayments), [filteredPayments]);
  const trends = useMemo(() => getBookingTrends(filteredAppointments, 6), [filteredAppointments]);
  const revenueTrends = useMemo(() => {
    return trends.map((t) => ({
      label: t.month,
      revenue: t.revenue,
      count: t.count,
    }));
  }, [trends]);
  const servicePerf = useMemo(() => getServicePerformance(services, filteredAppointments), [services, filteredAppointments]);
  const staffPerf = useMemo(() => getStaffPerformance(staff, filteredAppointments), [staff, filteredAppointments]);
  const staffComparison = useMemo(() => getStaffComparison(staff, filteredAppointments, filteredPayments), [staff, filteredAppointments, filteredPayments]);
  const popularity = useMemo(() => getServicePopularity(services, filteredAppointments), [services, filteredAppointments]);
  const retentionRate = useMemo(() => getCustomerRetentionRate(customers, filteredAppointments), [customers, filteredAppointments]);
  const cancellationRate = useMemo(() => getCancellationRate(filteredAppointments), [filteredAppointments]);
  const noShowRate = useMemo(() => getNoShowRate(filteredAppointments), [filteredAppointments]);
  const segments = useMemo(() => getCustomerSegments(customers, filteredAppointments, filteredPayments), [customers, filteredAppointments, filteredPayments]);
  const revenueGrowth = useMemo(() => getRevenueGrowthRate(filteredPayments), [filteredPayments]);
  const appointmentGrowth = useMemo(() => getAppointmentGrowthRate(filteredAppointments), [filteredAppointments]);
  const customerGrowth = useMemo(() => getCustomerGrowthRate(customers), [customers]);
  const avgBookingValue = useMemo(() => getAverageBookingValue(filteredAppointments), [filteredAppointments]);
  const avgAppointmentValue = useMemo(() => getAverageAppointmentValue(filteredAppointments), [filteredAppointments]);
  const paymentBreakdown = useMemo(() => getPaymentMethodBreakdown(filteredPayments), [filteredPayments]);
  const peakDays = useMemo(() => getPeakBookingDays(filteredAppointments), [filteredAppointments]);
  const revenuePerCustomer = useMemo(() => getRevenuePerCustomer(customers, filteredPayments), [customers, filteredPayments]);

  const completionRate = filteredAppointments.length > 0
    ? Math.round(filteredAppointments.filter((a) => a.status === "completed").length / filteredAppointments.length * 100)
    : 0;

  const totalRevenue = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const todayAppointments = filteredAppointments.filter((a) => a.date === new Date().toISOString().split("T")[0]).length;

  const isConfigured = true;

  const statsCards = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue, business?.currency || "USD"), icon: DollarSign, change: revenueGrowth, color: "from-emerald-500 to-teal-500" },
    { label: "Appointments", value: filteredAppointments.length, icon: CalendarDays, change: appointmentGrowth, color: "from-blue-500 to-indigo-500" },
    { label: "Customers", value: customers.length, icon: Users, change: customerGrowth, color: "from-pink-500 to-rose-500" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: Target, change: `${cancellationRate}% cancel`, color: "from-amber-500 to-orange-500" },
  ];

  const sectionFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
        {(["today", "7d", "30d", "90d"] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(range)}
            className={`rounded-lg px-3 text-xs ${timeRange === range ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            {range === "today" ? "Today" : range}
          </Button>
        ))}
        <Button
          variant={timeRange === "custom" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTimeRange("custom")}
          className={`rounded-lg px-3 text-xs ${timeRange === "custom" ? "bg-white shadow-sm" : "text-slate-500"}`}
        >
          Custom
        </Button>
      </div>
      {timeRange === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-9 w-36 text-xs"
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-9 w-36 text-xs"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Advanced Analytics</h2>
          <p className="text-sm text-slate-500">
            {isConfigured ? "Comprehensive business intelligence" : "AI insights require configuration"}
          </p>
        </div>
        {sectionFilters}
      </div>

      {!isConfigured && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Analytics Require Configuration</h3>
              <p className="text-sm text-amber-700">Connect analytics services to unlock advanced reporting.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isConfigured && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map(({ label, value, icon: Icon, change, color }) => (
              <Card key={label} className="group hover:-translate-y-1 transition-all duration-300">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                    <div className="flex items-center gap-1">
                      {change > 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      ) : change < 0 ? (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-slate-400" />
                      )}
                      <span className={`text-xs font-medium ${change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {change > 0 ? "+" : ""}{change}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {[
                { id: "revenue", label: "Revenue" },
                { id: "appointments", label: "Appointments" },
                { id: "customers", label: "Customers" },
                { id: "services", label: "Services" },
                { id: "staff", label: "Staff" },
                { id: "payments", label: "Payments" },
              ].map(({ id, label }) => (
                <TabsTrigger key={id} value={id}>{label}</TabsTrigger>
              ))}
            </TabsList>

            {activeTab === "revenue" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                      <CardDescription>Monthly revenue over the selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={revenueTrends} dataKey="revenue" color="emerald" height={160} labels />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointment Volume</CardTitle>
                      <CardDescription>Monthly booking counts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={revenueTrends} dataKey="count" color="blue" height={160} labels />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Revenue by Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {revenueTrends.slice(-6).reverse().map((t, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{t.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-slate-900">
                                {formatCurrency(t.revenue, business?.currency || "USD")}
                              </span>
                              <span className="text-xs text-slate-400">({t.count} bookings)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: "Avg Booking Value", value: formatCurrency(avgBookingValue, business?.currency || "USD"), icon: Clock },
                        { label: "Completion Rate", value: `${completionRate}%`, icon: Target },
                        { label: "Cancellation Rate", value: `${cancellationRate}%`, icon: TrendingDown },
                        { label: "No-Show Rate", value: `${noShowRate}%`, icon: Activity },
                        { label: "Retention Rate", value: `${retentionRate}%`, icon: Users },
                        { label: "Revenue Growth", value: `${revenueGrowth}%`, icon: TrendingUp },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{label}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointment Volume by Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={revenueTrends} dataKey="count" color="blue" height={200} labels />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Completion vs Cancellation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBarChart
                        data={[
                          { label: "Completed", count: filteredAppointments.filter((a) => a.status === "completed").length },
                          { label: "Scheduled", count: filteredAppointments.filter((a) => a.status === "scheduled").length },
                          { label: "Confirmed", count: filteredAppointments.filter((a) => a.status === "confirmed").length },
                          { label: "Cancelled", count: filteredAppointments.filter((a) => a.status === "cancelled").length },
                          { label: "No-Show", count: filteredAppointments.filter((a) => a.status === "no-show").length },
                        ]}
                        dataKey="count"
                        color="from-emerald-400 to-teal-500"
                        labelKey="label"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Peak Booking Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {peakDays.length > 0 ? (
                        <HorizontalBarChart
                          data={peakDays.slice(0, 5)}
                          dataKey="count"
                          color="from-violet-400 to-indigo-500"
                          labelKey="day"
                        />
                      ) : (
                        <p className="text-sm text-slate-500">No data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Peak & Slow Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-emerald-700">Peak Hour</p>
                          <p className="text-lg font-bold text-slate-900">{getPeakBookingHour(filteredAppointments) ? `${getPeakBookingHour(filteredAppointments)!.hour}:00` : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-red-700">Slowest Hour</p>
                          <p className="text-lg font-bold text-slate-900">{getSlowestBookingHour(filteredAppointments) ? `${getSlowestBookingHour(filteredAppointments)!.hour}:00` : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">Avg Appointment Duration</p>
                          <p className="text-lg font-bold text-slate-900">
                            {filteredAppointments.length > 0
                              ? Math.round(filteredAppointments.reduce((s, a) => {
                                  const start = parseInt(a.startTime.split(":")[0]);
                                  const end = parseInt(a.endTime.split(":")[0]);
                                  return s + (end - start);
                                }, 0) / filteredAppointments.length)
                              : 0} min
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "customers" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-slate-900">{customers.length}</p>
                          <p className="text-xs text-slate-500">Total Customers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-emerald-600">{customerGrowth}%</p>
                          <p className="text-xs text-slate-500">Growth Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-blue-600">{retentionRate}%</p>
                          <p className="text-xs text-slate-500">Retention</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-medium text-slate-700">Customer Segments</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "High-Value", count: segments["high-value"].length, color: "bg-emerald-100 text-emerald-700" },
                            { label: "Returning", count: segments.returning.length, color: "bg-blue-100 text-blue-700" },
                            { label: "Upcoming", count: segments["upcoming-appointments"].length, color: "bg-violet-100 text-violet-700" },
                            { label: "Inactive", count: segments.inactive.length, color: "bg-slate-100 text-slate-500" },
                            { label: "New", count: segments.new.length, color: "bg-amber-100 text-amber-700" },
                          ].map(({ label, count, color }) => (
                            <div key={label} className={`rounded-lg p-3 ${color}`}>
                              <p className="text-xl font-bold">{count}</p>
                              <p className="text-xs font-medium">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue per Customer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <p className="text-3xl font-bold text-slate-900">
                            {formatCurrency(revenuePerCustomer, business?.currency || "USD")}
                          </p>
                          <p className="text-sm text-slate-500">Average Revenue per Customer</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {customers.slice(0, 5).map((customer) => (
                          <div key={customer.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white">
                                {customer.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{customer.fullName}</p>
                                <p className="text-xs text-slate-500">{customer.email}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                              {formatCurrency(revenuePerCustomer / Math.max(customers.length, 1), business?.currency || "USD")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "services" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Popularity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {popularity.sort((a, b) => b.count - a.count).length > 0 ? (
                        <HorizontalBarChart
                          data={popularity.sort((a, b) => b.count - a.count).slice(0, 8)}
                          dataKey="count"
                          color="from-purple-400 to-violet-500"
                          labelKey="name"
                        />
                      ) : (
                        <p className="text-sm text-slate-500">No service data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Service Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {servicePerf.sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((service) => (
                          <div key={service.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{service.name}</p>
                              <p className="text-xs text-slate-500">{service.count} bookings</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(service.revenue, business?.currency || "USD")}
                              </p>
                              <p className="text-xs text-slate-500">
                                {service.avgPerBooking > 0 ? formatCurrency(service.avgPerBooking, business?.currency || "USD") + "/booking" : "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "staff" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff Performance Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {staffComparison.length > 0 ? (
                        <HorizontalBarChart
                          data={staffComparison.sort((a, b) => b.revenue - a.revenue).slice(0, 8)}
                          dataKey="revenue"
                          color="from-cyan-400 to-sky-500"
                          labelKey="fullName"
                        />
                      ) : (
                        <p className="text-sm text-slate-500">No staff data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Staff Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {staffPerf.sort((a, b) => b.completionRate - a.completionRate).map((member) => (
                          <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs font-bold text-white">
                                {member.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{member.fullName}</p>
                                <p className="text-xs text-slate-500">{member.totalAppointments} appointments</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900">{member.completionRate}%</p>
                              <p className="text-xs text-slate-500">completion</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Total Revenue", value: formatCurrency(totalRevenue, business?.currency || "USD"), color: "text-emerald-600" },
                          { label: "Total Payments", value: filteredPayments.length.toString(), color: "text-blue-600" },
                          { label: "Avg Payment", value: formatCurrency(revenueStats.averagePayment, business?.currency || "USD"), color: "text-purple-600" },
                          { label: "Total Voided", value: formatCurrency(revenueStats.totalVoided, business?.currency || "USD"), color: "text-red-600" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="rounded-xl border border-slate-100 p-4">
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Method Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(paymentBreakdown).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(paymentBreakdown).map(([method, data]) => (
                            <div key={method} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                              <span className="text-sm font-medium text-slate-900 capitalize">{method.replace("_", " ")}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">{data.count} payments</span>
                                <span className="text-sm font-bold text-slate-900">{formatCurrency(data.total, business?.currency || "USD")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No payment data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue & Volume Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart data={revenueTrends} dataKey="revenue" color="emerald" height={180} labels />
                  </CardContent>
                </Card>
              </div>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
