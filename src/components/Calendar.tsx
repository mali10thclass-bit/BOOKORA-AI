import { useState } from "react";
import { useBusiness } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/booking";

export function Calendar() {
  const { appointments, business } = useBusiness();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAppointments = appointments.filter((a) => a.date.startsWith(monthKey));

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayAppointments = (day: number) => {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    return monthAppointments.filter((a) => a.date === dateKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
          <p className="text-sm text-slate-500">Monthly view of all appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-slate-900">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-24 rounded-lg" />;
              }
              const dayAppointments = getDayAppointments(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-lg p-2 border ${
                    isToday ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-700 mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="text-xs bg-white rounded p-1 border border-slate-100">
                        <div className="font-medium text-slate-800">{appointment.startTime}</div>
                        <div className="text-slate-500 truncate">{appointment.customerName}</div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-slate-500">+{dayAppointments.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {monthAppointments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Appointments This Month</h3>
            <div className="space-y-2">
              {monthAppointments
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{appointment.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {appointment.date} • {appointment.startTime} - {appointment.endTime} • {appointment.serviceName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-700">
                        {formatCurrency(appointment.servicePrice, business?.currency || "PKR")}
                      </p>
                      <Badge variant="outline">{appointment.status}</Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}