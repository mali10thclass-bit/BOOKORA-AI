import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Download } from "lucide-react";

export function Settings() {
  const { business, updateBusiness, exportData } = useBusiness();
  const [form, setForm] = useState({
    name: business?.name || "",
    tagline: business?.tagline || "",
    contact: business?.contact || "",
    address: business?.address || "",
    currency: business?.currency || "PKR",
    timezone: business?.timezone || "Asia/Karachi",
    reminderLead: business?.reminderLead || 24,
    cancellationPolicyHours: business?.cancellationPolicyHours || 24,
    bookingBufferMinutes: business?.bookingBufferMinutes || 15,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Configure your business profile</p>
        </div>
        <Button variant="outline" onClick={exportData}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  <option value="Asia/Karachi">Asia/Karachi</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Asia/Riyadh">Asia/Riyadh</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderLead">Reminder Lead (hours)</Label>
                <Input
                  id="reminderLead"
                  type="number"
                  min={1}
                  value={form.reminderLead}
                  onChange={(e) => setForm({ ...form, reminderLead: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancellationPolicy">Cancellation Policy (hours)</Label>
                <Input
                  id="cancellationPolicy"
                  type="number"
                  min={1}
                  value={form.cancellationPolicyHours}
                  onChange={(e) => setForm({ ...form, cancellationPolicyHours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer">Booking Buffer (minutes)</Label>
                <Input
                  id="buffer"
                  type="number"
                  min={0}
                  step={5}
                  value={form.bookingBufferMinutes}
                  onChange={(e) => setForm({ ...form, bookingBufferMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}