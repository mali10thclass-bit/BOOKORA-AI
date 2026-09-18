import { useState, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { can } from "@/lib/permissions";
import { getServicePerformance, formatCurrency, getServicePopularity } from "@/lib/booking";
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
  TrendingUp,
  CheckCircle,
  Target,
  Star,
  Search,
  Filter,
  ArrowUpDown,
  UserCog,
  Scissors,
  Tag,
} from "lucide-react";

export function Services2() {
  const { services, appointments, payments, updateService, staff, business } = useBusiness();
  const currentUserRole = "OWNER";
  const canManage = can(currentUserRole, "services.manage");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    duration: 30,
    price: 0,
    active: true,
  });

  const servicePerformance = useMemo(() => {
    return getServicePerformance(services, appointments);
  }, [services, appointments]);

  const servicePopularity = useMemo(() => {
    return getServicePopularity(services, appointments);
  }, [services, appointments]);

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category).filter(Boolean));
    return Array.from(cats);
  }, [services]);

  const filteredServices = useMemo(() => {
    let result = services.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "duration") return a.duration - b.duration;
      if (sortBy === "revenue") return (servicePerformance.find((p) => p.id === b.id)?.revenue || 0) - (servicePerformance.find((p) => p.id === a.id)?.revenue || 0);
      return 0;
    });

    return result;
  }, [services, search, categoryFilter, sortBy, servicePerformance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateService(editingId, form);
    } else if (canManage) {
      // addService would be called here
    }
    setForm({ name: "", description: "", category: "", duration: 30, price: 0, active: true });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (service: typeof services[0]) => {
    if (!canManage) return;
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: service.price,
      active: service.active,
    });
    setShowForm(true);
  };

  const toggleActive = (service: typeof services[0]) => {
    updateService(service.id, { active: !service.active });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Services Management</h2>
          <p className="text-sm text-slate-500">Categories, durations, pricing, and performance analytics</p>
        </div>
        {canManage && (
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", description: "", category: "", duration: 30, price: 0, active: true }); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svcName">Service Name</Label>
                  <Input id="svcName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svcCategory">Category</Label>
                  <Input id="svcCategory" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Haircut" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svcDuration">Duration (minutes)</Label>
                  <Input id="svcDuration" type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svcPrice">Price</Label>
                  <Input id="svcPrice" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="svcDesc">Description</Label>
                  <Input id="svcDesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Add"} Service</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Services</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{services.length}</p>
              </div>
              <Scissors className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Services</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{services.filter((s) => s.active).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(servicePerformance.reduce((s, p) => s + p.revenue, 0), business?.currency || "PKR")}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{servicePerformance.reduce((s, p) => s + p.count, 0)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="duration">Duration</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const performance = servicePerformance.find((p) => p.id === service.id);
          const popularity = servicePopularity.find((p) => p.id === service.id);
          const assignedStaff = staff.filter((s) => s.id && service.category && s.fullName.includes(service.category) || service.id.includes(s.id) || false);

          return (
            <Card key={service.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm">
                      <Scissors className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      {service.category && <Badge variant="outline" className="text-[10px] mt-0.5">{service.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={service.active ? "default" : "secondary"}>
                      {service.active ? "Active" : "Inactive"}
                    </Badge>
                    {canManage && (
                      <button onClick={() => toggleActive(service)} className="ml-1">
                        {service.active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                      </button>
                    )}
                  </div>
                </div>

                {service.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{service.description}</p>
                )}

                <div className="flex items-center justify-between mb-3 text-sm">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" />
                    {service.duration} min
                  </div>
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(service.price, business?.currency || "PKR")}
                  </div>
                </div>

                {performance && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3 p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {performance.count} bookings
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatCurrency(performance.revenue, business?.currency || "PKR")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Avg {formatCurrency(performance.avgPerBooking, business?.currency || "PKR")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {popularity?.popularity || 0}% popularity
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <UserCog className="h-3 w-3" />
                    Staff assigned
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (canManage) updateService(service.id, { active: false }); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Scissors className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No services found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
