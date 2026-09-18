import { useState, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency, getCustomerSegments, getAppointmentStats, getRevenueStats } from "@/lib/booking";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  RefreshCw,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
  Filter,
  Search,
  ChevronDown,
} from "lucide-react";

export function CustomerSegments() {
  const { customers, appointments, payments, business } = useBusiness();
  const [activeSegment, setActiveSegment] = useState("all");
  const [search, setSearch] = useState("");

  const segments = useMemo(() => {
    return getCustomerSegments(customers, appointments, payments);
  }, [customers, appointments, payments]);

  const allCustomers = useMemo(() => {
    let customerList: typeof customers = [];
    const segmentData = getCustomerSegments(customers, appointments, payments);

    if (activeSegment === "all") {
      Object.values(segmentData).flat().forEach((s) => {
        if (!customerList.find((c) => c.id === s.customer.id)) {
          customerList.push(s.customer);
        }
      });
    } else {
      segmentData[activeSegment as keyof typeof segmentData]?.forEach((s) => {
        customerList.push(s.customer);
      });
    }

    if (search) {
      customerList = customerList.filter((c) =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    return customerList;
  }, [customers, appointments, payments, activeSegment, search]);

  const segmentLabels: Record<string, { label: string; color: string; icon: any }> = {
    "new": { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Users },
    "returning": { label: "Returning", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: RefreshCw },
    "inactive": { label: "Inactive", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 },
    "high-value": { label: "High-value", color: "bg-amber-100 text-amber-700 border-amber-200", icon: DollarSign },
    "outstanding-balances": { label: "Outstanding", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Calendar },
    "upcoming-appointments": { label: "Upcoming", color: "bg-purple-100 text-purple-700 border-purple-200", icon: TrendingUp },
  };

  const segmentCounts = useMemo(() => {
    const segData = getCustomerSegments(customers, appointments, payments);
    return {
      all: customers.length,
      new: segData.new.length,
      returning: segData.returning.length,
      inactive: segData.inactive.length,
      "high-value": segData["high-value"].length,
      "outstanding-balances": segData["outstanding-balances"].length,
      "upcoming-appointments": segData["upcoming-appointments"].length,
    };
  }, [customers, appointments, payments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Segmentation</h2>
          <p className="text-sm text-slate-500">Segments calculated from real customer data</p>
        </div>
        <Badge variant="secondary">{customers.length} total customers</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(segmentLabels).map(([key, { label, color, icon: Icon }]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all hover:-translate-y-1 ${activeSegment === key ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100" : ""}`}
            onClick={() => setActiveSegment(key === "all" ? "all" : key)}
          >
            <CardContent className="p-4 text-center">
              <Icon className="h-6 w-6 mx-auto mb-2 text-slate-400" />
              <p className="text-lg font-bold text-slate-900">{segmentCounts[key as keyof typeof segmentCounts] || 0}</p>
              <Badge variant="outline" className={`mt-1 ${color}`}>{label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={activeSegment} onValueChange={setActiveSegment}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            {Object.entries(segmentLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeSegment === "all" ? "All Customers" : `Segment: ${segmentLabels[activeSegment]?.label || activeSegment}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allCustomers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No customers in this segment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCustomers.map((customer) => {
                const segData = getCustomerSegments(customers, appointments, payments);
                const customerSegment = Object.entries(segData).find(([, items]) =>
                  items.find((s) => s.customer.id === customer.id)
                );
                const customerStats = getAppointmentStats(appointments.filter((a) => a.customerId === customer.id));
                const customerPayments = getRevenueStats(payments.filter((p) => p.customerName === customer.fullName));
                const outstanding = getCustomerSegments(customers, appointments, payments)[customerSegment?.[0] as keyof typeof segments] || [];
                const customerData = outstanding.find((s) => s.customer.id === customer.id);

                return (
                  <Card key={customer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-xs">
                              {customer.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{customer.fullName}</p>
                            <p className="text-xs text-slate-500">{customer.email || "No email"}</p>
                          </div>
                        </div>
                        {customerSegment && (
                          <Badge variant="outline" className={`text-[10px] ${segmentLabels[customerSegment[0]]?.color || "bg-slate-100"}`}>
                            {segmentLabels[customerSegment[0]]?.label}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {customerStats.total} appts
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(customerData?.totalSpent || customerPayments.totalRevenue, business?.currency || "PKR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {customerData?.visits || customerStats.total} visits
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {customerData?.outstanding > 0 ? formatCurrency(customerData.outstanding, business?.currency || "PKR") : "Paid"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
