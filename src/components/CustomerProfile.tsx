import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/permissions";
import { formatCurrency, getAppointmentStats, getRevenueStats, getUpcomingAppointmentsForCustomer, getAppointmentHistoryForCustomer, getPaymentHistoryForCustomer, getOutstandingForCustomer, getLastVisitForCustomer, getFavoriteServiceForCustomer, getPreferredStaffForCustomer } from "@/lib/booking";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Activity,
  Star,
  Settings,
  Edit2,
  Save,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function CustomerProfile() {
  const { customers, appointments, payments, updateCustomer, business } = useBusiness();
  const currentUserRole = "OWNER";
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.id || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", email: "", notes: "" });
  const [activeTab, setActiveTab] = useState("profile");

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null;
  const canEdit = can(currentUserRole, "customers.manage");

  const stats = selectedCustomer ? getAppointmentStats(appointments.filter((a) => a.customerId === selectedCustomer.id)) : null;
  const paymentsHistory = selectedCustomer ? getPaymentHistoryForCustomer(payments, selectedCustomer.fullName) : [];
  const outstanding = selectedCustomer ? getOutstandingForCustomer(appointments, payments, selectedCustomer.id) : 0;
  const lastVisit = selectedCustomer ? getLastVisitForCustomer(appointments, selectedCustomer.id) : null;
  const favoriteService = selectedCustomer ? getFavoriteServiceForCustomer(appointments, selectedCustomer.id) : null;
  const preferredStaff = selectedCustomer ? getPreferredStaffForCustomer(appointments, selectedCustomer.id) : null;
  const totalSpent = paymentsHistory.filter((p) => p.status === "recorded").reduce((sum, p) => sum + p.amount, 0);

  const startEdit = () => {
    if (!selectedCustomer || !canEdit) return;
    setEditForm({
      fullName: selectedCustomer.fullName,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email || "",
      notes: selectedCustomer.notes || "",
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedCustomer || !canEdit) return;
    updateCustomer(selectedCustomer.id, editForm);
    setIsEditing(false);
  };

  if (!selectedCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Select a customer to view profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl">
                  {selectedCustomer.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-slate-900 mt-4">
                {isEditing ? (
                  <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="text-center text-lg font-bold" />
                ) : (
                  selectedCustomer.fullName
                )}
              </h2>
              <Badge variant={selectedCustomer.status === "active" ? "default" : "secondary"} className="mt-2">
                {selectedCustomer.status}
              </Badge>
              {isEditing && canEdit && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={saveEdit}><Save className="h-3 w-3 mr-1" /> Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {isEditing ? (
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="text-sm" />
                ) : (
                  selectedCustomer.email || "No email"
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {isEditing ? (
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="text-sm" />
                ) : (
                  selectedCustomer.phone || "No phone"
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{business?.address || "No address"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Member since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
              </div>
              {canEdit && !isEditing && (
                <Button variant="outline" className="w-full mt-2" onClick={startEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Details</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={selectedCustomer.status === "active" ? "default" : "secondary"}>{selectedCustomer.status}</Badge>
                {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                  <div className="flex gap-1">
                    {selectedCustomer.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="profile"><User className="h-3 w-3 mr-1" />Profile</TabsTrigger>
                <TabsTrigger value="summary"><Activity className="h-3 w-3 mr-1" />Summary</TabsTrigger>
                <TabsTrigger value="history"><Clock className="h-3 w-3 mr-1" />History</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                {activeTab === "profile" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Full Name</Label>
                      <p className="text-sm">{selectedCustomer.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Email</Label>
                      <p className="text-sm">{selectedCustomer.email || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Phone</Label>
                      <p className="text-sm">{selectedCustomer.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Total Visits</Label>
                      <p className="text-sm font-semibold">{stats?.total || 0}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Total Spent</Label>
                      <p className="text-sm font-semibold">{formatCurrency(totalSpent, business?.currency || "PKR")}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Outstanding</Label>
                      <p className="text-sm font-semibold text-amber-600">{formatCurrency(outstanding, business?.currency || "PKR")}</p>
                    </div>
                    {favoriteService && (
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Favorite Service</Label>
                        <p className="text-sm">{favoriteService}</p>
                      </div>
                    )}
                    {preferredStaff && (
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Preferred Staff</Label>
                        <p className="text-sm">{preferredStaff}</p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "summary" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
                      <p className="text-xs text-slate-500">Total Appointments</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-600">{stats?.scheduled || 0}</p>
                      <p className="text-xs text-slate-500">Upcoming</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-teal-600">{stats?.completed || 0}</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-red-600">{stats?.cancelled || 0}</p>
                      <p className="text-xs text-slate-500">Cancelled</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSpent, business?.currency || "PKR")}</p>
                      <p className="text-xs text-slate-500">Total Spent</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-600">{formatCurrency(outstanding, business?.currency || "PKR")}</p>
                      <p className="text-xs text-slate-500">Outstanding</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-600">{paymentsHistory.length}</p>
                      <p className="text-xs text-slate-500">Payments Recorded</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-indigo-600">
                        {stats?.total > 0 ? Math.round((stats?.completed / stats?.total) * 100) : 0}%
                      </p>
                      <p className="text-xs text-slate-500">Completion Rate</p>
                    </div>
                  </div>
                )}
                {activeTab === "history" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-slate-900">Appointment History</h4>
                    {(() => {
                      const history = getAppointmentHistoryForCustomer(appointments, selectedCustomer.id);
                      if (history.length === 0) return <p className="text-sm text-slate-500">No appointments</p>;
                      return history.slice(0, 10).map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{apt.serviceName}</p>
                            <p className="text-xs text-slate-500">{apt.date} at {apt.startTime}</p>
                          </div>
                          <Badge variant={apt.status === "completed" ? "default" : apt.status === "cancelled" ? "destructive" : apt.status === "no-show" ? "warning" : "info"}>
                            {apt.status === "no-show" ? "No Show" : apt.status}
                          </Badge>
                        </div>
                      ));
                    })()}
                    <h4 className="font-semibold text-sm text-slate-900 mt-6">Payment History</h4>
                    {paymentsHistory.length === 0 ? (
                      <p className="text-sm text-slate-500">No payments</p>
                    ) : (
                      paymentsHistory.slice(0, 10).map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(pay.amount, business?.currency || "PKR")}</p>
                            <p className="text-xs text-slate-500">{pay.paymentDate}</p>
                          </div>
                          <Badge variant={pay.status === "recorded" ? "default" : "secondary"}>{pay.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
