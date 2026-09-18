import React, { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Clock, User, Scissors, DollarSign, X } from "lucide-react";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ open, onClose }: BookingModalProps) {
  const { customers, services, staff, addAppointment } = useBusiness();
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedStaff = staff.find((s) => s.id === staffId);

  const handleSubmit = () => {
    if (!customerId || !serviceId || !staffId || !date || !startTime) return;

    const service = services.find((s) => s.id === serviceId);
    const customer = customers.find((c) => c.id === customerId);
    const staffMember = staff.find((s) => s.id === staffId);

    if (!service || !customer || !staffMember) return;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + service.duration * 60000);

    addAppointment({
      customerId: customer.id,
      customerName: customer.fullName,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      staffId: staffMember.id,
      staffName: staffMember.name,
      date,
      startTime,
      endTime: end.toTimeString().slice(0, 5),
      status: "scheduled",
      notes,
    });

    onClose();
    // Reset form
    setCustomerId("");
    setServiceId("");
    setStaffId("");
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("09:00");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for your customer
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Customer Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {customer.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {customer.fullName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <User className="h-4 w-4" />
                {selectedCustomer.email}
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        {service.name}
                      </span>
                      <span className="text-slate-500">
                        {service.duration}min • ${service.price}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedService.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${selectedService.price}
                </span>
              </div>
            )}
          </div>

          {/* Staff Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {member.name} - {member.role}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStaff && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {selectedStaff.workingHours.start} - {selectedStaff.workingHours.end}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date & Time</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {new Date(date).toLocaleDateString()} at {startTime}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3 md:col-span-2">
            <Label className="text-sm font-medium">Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or notes for this appointment"
              className="w-full"
            />
          </div>
        </div>

        {/* Summary */}
        {selectedService && selectedCustomer && selectedStaff && (
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {selectedCustomer.fullName} - {selectedService.name}
                </p>
                <p className="text-sm text-slate-600">
                  with {selectedStaff.name} on {new Date(date).toLocaleDateString()} at {startTime}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-700">
                  ${selectedService.price}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedService.duration} minutes
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={!customerId || !serviceId || !staffId}
          >
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}