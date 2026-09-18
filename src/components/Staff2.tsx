import { useState, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/permissions";
import { getStaffPerformance, formatCurrency } from "@/lib/booking";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  DollarSign,
  BarChart3,
  CheckCircle,
  Target,
  UserCog,
  Shield,
  Calendar,
  Mail,
  Phone,
  Activity,
  Star,
  Search,
  Filter,
  ArrowUpDown,
  Settings,
  Award,
  MapPin,
} from "lucide-react";

export function Staff2() {
  const { staff, appointments, payments, services, updateStaff, business } = useBusiness();
  const currentUserRole = "OWNER";
  const canManage = can(currentUserRole, "staff.manage");
  const canViewSensitive = can(currentUserRole, "analytics.view");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    workingHours: { start: "09:00", end: "17:00" },
    active: true,
    role: "Staff",
  });

  const staffPerformance = useMemo(() => {
    return getStaffPerformance(staff, appointments);
  }, [staff, appointments]);

  const filteredStaff = useMemo(() => {
    let result = staff.filter((s) => {
      const matchesSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
    result.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return result;
  }, [staff, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateStaff(editingId, form);
    } else if (canManage) {
      // addStaff would be called
    }
    setForm({ fullName: "", email: "", phone: "", workingHours: { start: "09:00", end: "17:00" }, active: true, role: "Staff" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (member: typeof staff[0]) => {
    if (!canManage) return;
    setEditingId(member.id);
    setForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      workingHours: member.workingHours,
      active: member.active,
      role: member.id ? "Staff" : "Staff",
    });
    setShowForm(true);
  };

  const toggleActive = (member: typeof staff[0]) => {
    updateStaff(member.id, { active: !member.active });
  };

  const totalRevenue = payments.filter((p) => p.status === "recorded").reduce((sum, p) => sum + p.amount, 0);
  const overallCompletionRate = appointments.length > 0 ? Math.round(appointments.filter((a) => a.status === "completed").length / appointments.length * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
          <p className="text-sm text-slate-500">Profile, schedule, performance, and role management</p>
        </div>
        {canManage && (
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ fullName: "", email: "", phone: "", workingHours: { start: "09:00", end: "17:00" }, active: true, role: "Staff" }); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staffName">Full Name</Label>
                  <Input id="staffName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffRole">Role</Label>
                  <select id="staffRole" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="Staff">Staff</option>
                    <option value="Senior">Senior</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffEmail">Email</Label>
                  <Input id="staffEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffPhone">Phone</Label>
                  <Input id="staffPhone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Working Hours</Label>
                  <div className="flex gap-2">
                    <Input type="time" value={form.workingHours.start} onChange={(e) => setForm({ ...form, workingHours: { ...form.workingHours, start: e.target.value } })} />
                    <Input type="time" value={form.workingHours.end} onChange={(e) => setForm({ ...form, workingHours: { ...form.workingHours, end: e.target.value } })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Add"} Staff</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Staff</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{staff.length}</p>
              </div>
              <UserCog className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{staff.filter((s) => s.active).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overall Completion</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{overallCompletionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue, business?.currency || "PKR")}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="secondary">{filteredStaff.length} members</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((member) => {
          const performance = staffPerformance.find((p) => p.id === member.id);

          return (
            <Card key={member.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500">
                        {member.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">{member.fullName}</h3>
                      <p className="text-xs text-slate-500">{form.role || "Staff"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={member.active ? "default" : "secondary"}>
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                    {canManage && (
                      <button onClick={() => toggleActive(member)}>
                        {member.active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {member.workingHours.start} - {member.workingHours.end}
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {member.email}
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {member.phone}
                    </div>
                  )}
                </div>

                {activeTab === "performance" && performance && canViewSensitive && (
                  <div className="space-y-2 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-slate-500">Appointments</p>
                        <p className="font-bold text-slate-900">{performance.totalAppointments}</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <p className="text-slate-500">Completed</p>
                        <p className="font-bold text-emerald-600">{performance.completedAppointments}</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <p className="text-slate-500">Revenue</p>
                        <p className="font-bold text-blue-600">{formatCurrency(performance.revenue, business?.currency || "PKR")}</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <p className="text-slate-500">Completion Rate</p>
                        <p className="font-bold text-purple-600">{performance.completionRate}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "schedule" && (
                  <div className="space-y-2 mb-3">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Working Hours</span>
                        <span className="font-medium">{member.workingHours.start} - {member.workingHours.end}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Daily Schedule</span>
                        <span className="font-medium">{member.active ? "Configured" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "roles" && (
                  <div className="space-y-2 mb-3">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Shield className="h-3 w-3" /> Role</span>
                        <span className="font-medium">Staff</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Permissions</span>
                        <span className="font-medium text-emerald-600">View Appointments</span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Settings className="h-3 w-3" /> Config</span>
                        <span className="font-medium">Standard Access</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (canManage) { /* deleteStaff(member.id) */ } }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {canViewSensitive && performance && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3 w-3" />
                      {performance.completionRate}% completion
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No staff members found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
