import { useState, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { can } from "@/lib/permissions";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Calendar,
  CreditCard,
  FileText,
  Activity,
  Mail,
  Phone,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { formatCurrency, getAppointmentStats, getRevenueStats, getUpcomingAppointmentsForCustomer, getAppointmentHistoryForCustomer, getPaymentHistoryForCustomer, getOutstandingForCustomer, getLastVisitForCustomer } from "@/lib/booking";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Customers2() {
  const { customers, appointments, payments, updateCustomer, deleteCustomer, business } = useBusiness();
  const currentUserRole = "OWNER";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
    status: "active" as "active" | "archived",
    tags: "",
  });

  const canManage = can(currentUserRole, "customers.manage");
  const canViewPayments = can(currentUserRole, "payments.manage");
  const canViewAnalytics = can(currentUserRole, "analytics.view");

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      const matchesSearch =
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "created") return b.createdAt.localeCompare(a.createdAt);
      return 0;
    });

    return result;
  }, [customers, search, statusFilter, sortBy]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const customerAppointmentStats = selectedCustomer
    ? getAppointmentStats(appointments.filter((a) => a.customerId === selectedCustomer.id))
    : null;
  const customerPayments = selectedCustomer
    ? getPaymentHistoryForCustomer(payments, selectedCustomer.fullName)
    : [];
  const customerOutstanding = selectedCustomer ? getOutstandingForCustomer(appointments, payments, selectedCustomer.id) : 0;
  const customerTotalPayments = customerPayments.filter((p) => p.status === "recorded").reduce((sum, p) => sum + p.amount, 0);
  const lastVisit = selectedCustomer ? getLastVisitForCustomer(appointments, selectedCustomer.id) : null;
  const nextAppointment = selectedCustomer ? getUpcomingAppointmentsForCustomer(appointments, selectedCustomer.id)[0] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateCustomer(editingId, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        status: form.status as "active" | "archived",
      });
    } else if (canManage) {
      // In a real app, would call addCustomer
    }
    setForm({ fullName: "", phone: "", email: "", notes: "", status: "active", tags: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (customer: typeof customers[0]) => {
    if (!canManage) return;
    setEditingId(customer.id);
    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      status: customer.status,
      tags: "",
    });
    setShowForm(true);
  };

  const handleArchive = (id: string, currentStatus: string) => {
    if (!canManage) return;
    updateCustomer(id, { status: currentStatus === "active" ? "archived" : "active" });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "activity", label: "Activity", icon: ArrowUpDown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Management</h2>
          <p className="text-sm text-slate-500">Advanced CRM with segmentation and analytics</p>
        </div>
        {canManage && (
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ fullName: "", phone: "", email: "", notes: "", status: "active", tags: "" }); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "archived" })}>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP, new-client, preferred" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Add"} Customer</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredCustomers.length} customers</Badge>
      </div>

      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">{search ? "No customers match your search" : "No customers found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const stats = getAppointmentStats(appointments.filter((a) => a.customerId === customer.id));
            const outstanding = getOutstandingForCustomer(appointments, payments, customer.id);
            const isSelected = selectedCustomerId === customer.id;
            return (
              <Card
                key={customer.id}
                className={`cursor-pointer transition-all hover:-translate-y-1 ${isSelected ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100" : ""}`}
                onClick={() => setSelectedCustomerId(customer.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500">
                          {customer.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900">{customer.fullName}</h3>
                        {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Tag className="h-3 w-3 text-slate-400 mt-0.5" />
                    <Badge variant="outline" className="text-[10px]">General</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {stats.total} appointments
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {formatCurrency(outstanding, business?.currency || "PKR")} outstanding
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1">
                      {canManage && (
                        <>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}>
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleArchive(customer.id, customer.status); }}>
                            {customer.status === "active" ? <Archive className="h-3 w-3 mr-1" /> : <ArchiveRestore className="h-3 w-3 mr-1" />}
                            {customer.status === "active" ? "Archive" : "Restore"}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteCustomer(customer.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCustomer && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-lg">
                {selectedCustomer.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.fullName}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedCustomer.email}</span>}
                {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</span>}
                <Badge variant={selectedCustomer.status === "active" ? "default" : "secondary"}>{selectedCustomer.status}</Badge>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    <Icon className="h-3 w-3 mr-1 inline" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="mt-4 space-y-4">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Total Appointments</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{customerAppointmentStats?.total || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Upcoming</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{customerAppointmentStats?.scheduled || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Completed</p>
                      <p className="text-2xl font-bold text-teal-600 mt-1">{customerAppointmentStats?.completed || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Cancelled</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{customerAppointmentStats?.cancelled || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Total Payments</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(customerTotalPayments, business?.currency || "PKR")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Outstanding</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(customerOutstanding, business?.currency || "PKR")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Last Visit</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{lastVisit ? `${new Date(lastVisit.date).toLocaleDateString()} at ${lastVisit.startTime}` : "No visits"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">Next Appointment</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {nextAppointment ? `${nextAppointment.date} at ${nextAppointment.startTime}` : "None scheduled"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "appointments" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Appointment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const history = getAppointmentHistoryForCustomer(appointments, selectedCustomer.id);
                      if (history.length === 0) {
                        return <p className="text-sm text-slate-500 text-center py-8">No appointments found</p>;
                      }
                      return (
                        <div className="space-y-3">
                          {history.map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="font-medium text-slate-900">{apt.serviceName}</p>
                                <p className="text-sm text-slate-500">
                                  {apt.date} at {apt.startTime} - {apt.staffName}
                                </p>
                              </div>
                              <Badge variant={
                                apt.status === "completed" ? "default" :
                                apt.status === "cancelled" ? "destructive" :
                                apt.status === "no-show" ? "warning" : "info"
                              }>
                                {apt.status === "no-show" ? "No Show" : apt.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {activeTab === "payments" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerPayments.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">No payments recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {customerPayments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-900">{formatCurrency(payment.amount, business?.currency || "PKR")}</p>
                              <p className="text-sm text-slate-500">{payment.paymentDate} • {payment.paymentMethod}</p>
                            </div>
                            <Badge variant={payment.status === "recorded" ? "default" : "secondary"}>
                              {payment.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {customerOutstanding > 0 && canViewPayments && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 mb-1">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-semibold">Outstanding Balance</span>
                        </div>
                        <p className="text-lg font-bold text-amber-900">{formatCurrency(customerOutstanding, business?.currency || "PKR")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "notes" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCustomer.notes ? (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-8">No notes yet</p>
                    )}
                    {canManage && (
                      <div className="mt-4">
                        <Label htmlFor="customerNotes">Add Note</Label>
                        <Input
                          id="customerNotes"
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          placeholder="Add a note..."
                          className="mt-1"
                        />
                        <Button size="sm" className="mt-2" onClick={() => {
                          if (editingId) {
                            updateCustomer(editingId, { notes: form.notes });
                            setForm({ ...form, notes: form.notes });
                          }
                        }}>
                          Save Note
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "activity" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const customerApps = appointments.filter((a) => a.customerId === selectedCustomer.id);
                        const customerPayments = payments.filter((p) => p.customerName === selectedCustomer.fullName);
                        const allActivity = [
                          ...customerApps.map((a) => ({
                            date: a.createdAt,
                            action: `Appointment ${a.status}`,
                            type: "appointment" as const,
                          })),
                          ...customerPayments.map((p) => ({
                            date: p.createdAt,
                            action: `Payment ${p.status} - ${formatCurrency(p.amount, business?.currency || "PKR")}`,
                            type: "payment" as const,
                          })),
                        ].sort((a, b) => b.date.localeCompare(a.date));

                        if (allActivity.length === 0) {
                          return <p className="text-sm text-slate-500 text-center py-8">No activity</p>;
                        }
                        return allActivity.slice(0, 20).map((activity, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <div className={`h-2 w-2 rounded-full ${activity.type === "appointment" ? "bg-emerald-500" : "bg-blue-500"}`} />
                            <span className="text-slate-600">{activity.action}</span>
                            <span className="text-slate-400 ml-auto text-xs">{new Date(activity.date).toLocaleString()}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
