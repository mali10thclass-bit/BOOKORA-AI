import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Pencil, Trash2 } from "lucide-react";

export function Staff() {
  const { staff, addStaff, updateStaff, deleteStaff } = useBusiness();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    workingHours: { start: "09:00", end: "17:00" },
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateStaff(editingId, form);
    } else {
      addStaff(form);
    }
    setForm({ fullName: "", email: "", phone: "", workingHours: { start: "09:00", end: "17:00" }, active: true });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (member: typeof staff[0]) => {
    setEditingId(member.id);
    setForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      workingHours: member.workingHours,
      active: member.active,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500">Manage your team members</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ fullName: "", email: "", phone: "", workingHours: { start: "09:00", end: "17:00" }, active: true }); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Working Hours</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={form.workingHours.start}
                      onChange={(e) => setForm({ ...form, workingHours: { ...form.workingHours, start: e.target.value } })}
                    />
                    <Input
                      type="time"
                      value={form.workingHours.end}
                      onChange={(e) => setForm({ ...form, workingHours: { ...form.workingHours, end: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Add"} Staff</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {staff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-900 mb-1">No staff members</h3>
            <p className="text-sm text-slate-500">Add your team to start scheduling</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{member.fullName}</h3>
                    {member.email && <p className="text-sm text-slate-500">{member.email}</p>}
                    {member.phone && <p className="text-sm text-slate-500">{member.phone}</p>}
                  </div>
                  <Badge variant={member.active ? "default" : "secondary"}>
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  Working Hours: {member.workingHours.start} - {member.workingHours.end}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteStaff(member.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}