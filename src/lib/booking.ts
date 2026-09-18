import { Appointment, Payment, StatusHistoryEntry } from "@/lib/store";

export function getStatusHistory(appointment: Appointment): StatusHistoryEntry[] {
  return [...(appointment.statusHistory || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addStatusHistoryEntry(
  appointmentId: string,
  status: string,
  notes?: string,
  changedBy?: string
): Omit<StatusHistoryEntry, "id" | "timestamp"> {
  return {
    status,
    notes,
    changedBy,
  };
}

export function validateReschedule(
  appointment: Appointment,
  newDate: string,
  newStartTime: string,
  newStaffId: string,
  appointments: Appointment[],
  staff: { id: string; workingHours: { start: string; end: string } }[],
  serviceDuration: number,
  bufferMinutes: number
): { valid: boolean; conflicts: string[]; availableSlots: string[] } {
  const conflicts: string[] = [];
  const staffMember = staff.find((s) => s.id === newStaffId);

  if (!staffMember) {
    conflicts.push("Staff member not found");
    return { valid: false, conflicts, availableSlots: [] };
  }

  const { workingHours } = staffMember;
  const newEndTime = calculateEndTime(newStartTime, serviceDuration);

  const startMinutes = timeToMinutes(newStartTime);
  const endMinutes = timeToMinutes(workingHours.end);
  const workStart = timeToMinutes(workingHours.start);

  if (startMinutes < workStart) {
    conflicts.push(`Start time is before working hours (${workingHours.start})`);
  }
  if (timeToMinutes(newEndTime) > endMinutes) {
    conflicts.push(`End time is after working hours (${workingHours.end})`);
  }

  const newAppointment = {
    staffId: newStaffId,
    date: newDate,
    startTime: newStartTime,
    endTime: newEndTime,
  };

  if (hasConflict(newAppointment, appointments, bufferMinutes)) {
    const conflicting = appointments.filter((a) => {
      if (a.staffId !== newStaffId || a.date !== newDate) return false;
      if (a.status === "cancelled" || a.status === "no-show") return false;
      const existingStart = timeToMinutes(a.startTime);
      const existingEnd = timeToMinutes(a.endTime);
      const newStart = timeToMinutes(newStartTime);
      const newEnd = timeToMinutes(newEndTime);
      const bufferedStart = newStart - bufferMinutes;
      const bufferedEnd = newEnd + bufferMinutes;
      return bufferedStart < existingEnd && bufferedEnd > existingStart;
    });
    if (conflicting.length > 0) {
      conflicts.push(
        `Conflict with appointment: ${conflicting.map((a) => `${a.customerName} at ${a.startTime}`).join(", ")}`
      );
    }
  }

  const availableSlots = getAvailableTimeSlots(
    newStaffId,
    newDate,
    serviceDuration,
    appointments,
    workingHours,
    bufferMinutes
  );

  return {
    valid: conflicts.length === 0,
    conflicts,
    availableSlots,
  };
}

export function formatCurrency(amount: number, currency: string = "PKR"): string {
  const symbols: Record<string, string> = {
    PKR: "₨",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SAR: "﷼",
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayAppointments(appointments: Appointment[]): Appointment[] {
  const today = new Date().toISOString().split("T")[0];
  return appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getUpcomingAppointments(appointments: Appointment[]): Appointment[] {
  const today = new Date().toISOString().split("T")[0];
  return appointments
    .filter((a) => a.date >= today && a.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);
}

export function getOutstandingBalance(
  appointmentValue: number,
  payments: Payment[]
): number {
  const totalPaid = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, appointmentValue - totalPaid);
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function hasConflict(
  appointment: {
    staffId: string;
    date: string;
    startTime: string;
    endTime: string;
  },
  appointments: Appointment[],
  bufferMinutes: number = 0
): boolean {
  return appointments.some((existing) => {
    if (existing.staffId !== appointment.staffId || existing.date !== appointment.date) {
      return false;
    }
    if (existing.status === "cancelled" || existing.status === "no-show") {
      return false;
    }

    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);
    const newStart = timeToMinutes(appointment.startTime);
    const newEnd = timeToMinutes(appointment.endTime);

    const bufferedStart = newStart - bufferMinutes;
    const bufferedEnd = newEnd + bufferMinutes;

    return bufferedStart < existingEnd && bufferedEnd > existingStart;
  });
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getAvailableTimeSlots(
  staffId: string,
  date: string,
  serviceDuration: number,
  appointments: Appointment[],
  workingHours: { start: string; end: string },
  bufferMinutes: number = 0
): string[] {
  const startMinutes = timeToMinutes(workingHours.start);
  const endMinutes = timeToMinutes(workingHours.end);
  const slots: string[] = [];

  for (let time = startMinutes; time + serviceDuration <= endMinutes; time += 15) {
    const startTime = minutesToTime(time);
    const endTime = minutesToTime(time + serviceDuration);
    const hasConflict = hasConflict(
      { staffId, date, startTime, endTime },
      appointments,
      bufferMinutes
    );
    if (!hasConflict) {
      slots.push(startTime);
    }
  }

  return slots;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getAppointmentStats(appointments: Appointment[]) {
  const total = appointments.length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;
  const noShow = appointments.filter((a) => a.status === "no-show").length;
  const scheduled = appointments.filter((a) => a.status === "scheduled").length;

  return {
    total,
    completed,
    cancelled,
    noShow,
    scheduled,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function getRevenueStats(payments: Payment[]) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalVoided = payments
    .filter((p) => p.status === "voided")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalRevenue,
    totalVoided,
    paymentCount: validPayments.length,
    averagePayment: validPayments.length > 0 ? totalRevenue / validPayments.length : 0,
  };
}

export function getMonthlyRevenue(payments: Payment[], year: number, month: number) {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  return payments
    .filter((p) => p.status === "recorded" && p.paymentDate.startsWith(monthKey))
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getCustomerStats(
  customers: { id: string; status: string }[],
  appointments: Appointment[]
) {
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const totalAppointments = appointments.length;
  const uniqueCustomers = new Set(appointments.map((a) => a.customerId)).size;

  return {
    activeCustomers,
    totalAppointments,
    uniqueCustomers,
    avgAppointmentsPerCustomer: uniqueCustomers > 0 ? totalAppointments / uniqueCustomers : 0,
  };
}

export function getServicePerformance(
  services: { id: string; name: string; price: number }[],
  appointments: Appointment[]
) {
  return services.map((service) => {
    const serviceAppointments = appointments.filter((a) => a.serviceId === service.id);
    const revenue = serviceAppointments.reduce((sum, a) => sum + a.servicePrice, 0);
    return {
      ...service,
      count: serviceAppointments.length,
      revenue,
      avgPerBooking: serviceAppointments.length > 0 ? revenue / serviceAppointments.length : 0,
    };
  });
}

export function getStaffPerformance(
  staff: { id: string; fullName: string }[],
  appointments: Appointment[]
) {
  return staff.map((member) => {
    const staffAppointments = appointments.filter((a) => a.staffId === member.id);
    const completed = staffAppointments.filter((a) => a.status === "completed").length;
    const revenue = staffAppointments.reduce((sum, a) => sum + a.servicePrice, 0);
    return {
      ...member,
      totalAppointments: staffAppointments.length,
      completedAppointments: completed,
      revenue,
      completionRate: staffAppointments.length > 0 ? Math.round((completed / staffAppointments.length) * 100) : 0,
    };
  });
}

export function getUpcomingReminders(
  appointments: Appointment[],
  leadHours: number = 24
) {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + leadHours * 60 * 60 * 1000);

  return appointments
    .filter((a) => {
      if (a.status !== "scheduled") return false;
      const appointmentDate = new Date(`${a.date}T${a.startTime}`);
      return appointmentDate > now && appointmentDate <= reminderTime;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function getDateRangeAppointments(
  appointments: Appointment[],
  startDate: string,
  endDate: string
) {
  return appointments
    .filter((a) => a.date >= startDate && a.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function getPaymentMethodBreakdown(payments: Payment[]) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  const breakdown: Record<string, { count: number; total: number }> = {};

  validPayments.forEach((payment) => {
    if (!breakdown[payment.paymentMethod]) {
      breakdown[payment.paymentMethod] = { count: 0, total: 0 };
    }
    breakdown[payment.paymentMethod].count += 1;
    breakdown[payment.paymentMethod].total += payment.amount;
  });

  return breakdown;
}

export function getPeakHours(appointments: Appointment[]) {
  const hourCounts: Record<number, number> = {};

  appointments.forEach((appointment) => {
    const hour = parseInt(appointment.startTime.split(":")[0], 10);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => b.count - a.count);
}

export function getCustomerLifetimeValue(
  customers: { id: string; fullName: string }[],
  appointments: Appointment[],
  payments: Payment[]
) {
  return customers.map((customer) => {
    const customerAppointments = appointments.filter((a) => a.customerId === customer.id);
    const customerPayments = payments.filter((p) => {
      const appointment = customerAppointments.find((a) => a.id === p.appointmentId);
      return appointment && p.status === "recorded";
    });
    const totalSpent = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalValue = customerAppointments.reduce((sum, a) => sum + a.servicePrice, 0);

    return {
      ...customer,
      appointmentCount: customerAppointments.length,
      totalSpent,
      totalValue,
      outstanding: totalValue - totalSpent,
      avgPerVisit: customerAppointments.length > 0 ? totalSpent / customerAppointments.length : 0,
    };
  });
}

export function getBookingTrends(
  appointments: Appointment[],
  months: number = 6
) {
  const trends: { month: string; count: number; revenue: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthAppointments = appointments.filter((a) => a.date.startsWith(monthKey));
    const revenue = monthAppointments.reduce((sum, a) => sum + a.servicePrice, 0);

    trends.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      count: monthAppointments.length,
      revenue,
    });
  }

  return trends;
}

export function getNoShowRate(appointments: Appointment[]) {
  const total = appointments.length;
  const noShow = appointments.filter((a) => a.status === "no-show").length;
  return total > 0 ? Math.round((noShow / total) * 100) : 0;
}

export function getCancellationRate(appointments: Appointment[]) {
  const total = appointments.length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;
  return total > 0 ? Math.round((cancelled / total) * 100) : 0;
}

export function getRepeatCustomerRate(
  customers: { id: string }[],
  appointments: Appointment[]
) {
  const customerAppointmentCounts = new Map<string, number>();
  appointments.forEach((a) => {
    customerAppointmentCounts.set(
      a.customerId,
      (customerAppointmentCounts.get(a.customerId) || 0) + 1
    );
  });

  const repeatCustomers = Array.from(customerAppointmentCounts.values()).filter(
    (count) => count > 1
  ).length;
  const totalCustomers = customers.length;

  return totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
}

export function getUtilizationRate(
  staff: { id: string; workingHours: { start: string; end: string } }[],
  appointments: Appointment[],
  date: string
) {
  const dayAppointments = appointments.filter((a) => a.date === date);

  return staff.map((member) => {
    const memberAppointments = dayAppointments.filter((a) => a.staffId === member.id);
    const totalMinutes = timeToMinutes(member.workingHours.end) - timeToMinutes(member.workingHours.start);
    const bookedMinutes = memberAppointments.reduce((sum, a) => {
      return sum + (timeToMinutes(a.endTime) - timeToMinutes(a.startTime));
    }, 0);

    return {
      ...member,
      appointmentCount: memberAppointments.length,
      utilizationRate: totalMinutes > 0 ? Math.round((bookedMinutes / totalMinutes) * 100) : 0,
    };
  });
}

export function getRevenueByServiceCategory(
  services: { id: string; category: string; price: number }[],
  appointments: Appointment[]
) {
  const categoryMap = new Map<string, { count: number; revenue: number }>();

  services.forEach((service) => {
    const category = service.category || "Uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { count: 0, revenue: 0 });
    }
  });

  appointments.forEach((appointment) => {
    const service = services.find((s) => s.id === appointment.serviceId);
    if (service) {
      const category = service.category || "Uncategorized";
      const current = categoryMap.get(category) || { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += appointment.servicePrice;
      categoryMap.set(category, current);
    }
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));
}

export function getAverageBookingValue(appointments: Appointment[]) {
  if (appointments.length === 0) return 0;
  return appointments.reduce((sum, a) => sum + a.servicePrice, 0) / appointments.length;
}

export function getConversionRate(
  totalVisitors: number,
  bookings: number
) {
  return totalVisitors > 0 ? Math.round((bookings / totalVisitors) * 100) : 0;
}

export function getStaffAvailability(
  staff: { id: string; fullName: string; workingHours: { start: string; end: string } }[],
  appointments: Appointment[],
  date: string
) {
  return staff.map((member) => {
    const memberAppointments = appointments.filter(
      (a) => a.staffId === member.id && a.date === date && a.status === "scheduled"
    );
    const availableSlots = getAvailableTimeSlots(
      member.id,
      date,
      30,
      appointments,
      member.workingHours,
      0
    );

    return {
      ...member,
      bookedCount: memberAppointments.length,
      availableSlots: availableSlots.length,
      isAvailable: availableSlots.length > 0,
    };
  });
}

export function getUpcomingAppointmentsForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  const today = new Date().toISOString().split("T")[0];
  return appointments
    .filter((a) => a.customerId === customerId && a.date >= today && a.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function getAppointmentHistoryForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  return appointments
    .filter((a) => a.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
}

export function getPaymentHistoryForCustomer(
  payments: Payment[],
  customerName: string
) {
  return payments
    .filter((p) => p.customerName === customerName)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function getOutstandingForCustomer(
  appointments: Appointment[],
  payments: Payment[],
  customerId: string
) {
  const customerAppointments = appointments.filter((a) => a.customerId === customerId);
  return customerAppointments.reduce((sum, a) => {
    const appPayments = payments.filter((p) => p.appointmentId === a.id);
    return sum + getOutstandingBalance(a.servicePrice, appPayments);
  }, 0);
}

export function getTotalSpentForCustomer(
  payments: Payment[],
  customerName: string
) {
  return payments
    .filter((p) => p.customerName === customerName && p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getVisitCountForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  return appointments.filter((a) => a.customerId === customerId).length;
}

export function getLastVisitForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  const customerAppointments = appointments
    .filter((a) => a.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return customerAppointments[0] || null;
}

export function getFavoriteServiceForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  const serviceCounts = new Map<string, number>();
  appointments
    .filter((a) => a.customerId === customerId)
    .forEach((a) => {
      serviceCounts.set(a.serviceName, (serviceCounts.get(a.serviceName) || 0) + 1);
    });

  let favoriteService = null;
  let maxCount = 0;
  serviceCounts.forEach((count, service) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteService = service;
    }
  });

  return favoriteService;
}

export function getPreferredStaffForCustomer(
  appointments: Appointment[],
  customerId: string
) {
  const staffCounts = new Map<string, number>();
  appointments
    .filter((a) => a.customerId === customerId)
    .forEach((a) => {
      staffCounts.set(a.staffName, (staffCounts.get(a.staffName) || 0) + 1);
    });

  let preferredStaff = null;
  let maxCount = 0;
  staffCounts.forEach((count, staff) => {
    if (count > maxCount) {
      maxCount = count;
      preferredStaff = staff;
    }
  });

  return preferredStaff;
}

export function getCustomerSegments(
  customers: { id: string; fullName: string; email?: string; phone?: string; status: string }[],
  appointments: Appointment[],
  payments: Payment[]
) {
  const today = new Date().toISOString().split("T")[0];
  const segments = {
    new: [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
    returning: [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
    inactive: [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
    "high-value": [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
    "outstanding-balances": [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
    "upcoming-appointments": [] as { customer: typeof customers[0]; visits: number; totalSpent: number; outstanding: number; upcomingCount: number }[],
  };

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  customers.forEach((customer) => {
    const customerAppointments = appointments.filter((a) => a.customerId === customer.id);
    const customerPayments = payments.filter((p) => {
      const appointment = customerAppointments.find((a) => a.id === p.appointmentId);
      return appointment && p.status === "recorded";
    });
    const totalSpent = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const visits = customerAppointments.length;
    const outstanding = customerAppointments.reduce((sum, a) => {
      const appPayments = payments.filter((p) => p.appointmentId === a.id);
      const totalPaid = appPayments.filter((p) => p.status === "recorded").reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, a.servicePrice - totalPaid);
    }, 0);

    const upcomingAppointments = customerAppointments.filter(
      (a) => a.date >= today && a.status === "scheduled"
    ).length;

    const lastVisit = customerAppointments
      .filter((a) => a.status === "completed" || a.status === "no-show")
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const isInactive = lastVisit && new Date(`${lastVisit.date}T${lastVisit.startTime}`) < threeMonthsAgo;
    const data = { customer, visits, totalSpent, outstanding, upcomingCount: upcomingAppointments };

    if (visits === 0) {
      segments.new.push(data);
    } else if (isInactive) {
      segments.inactive.push(data);
    } else if (totalSpent > 50000 && visits >= 5) {
      segments["high-value"].push(data);
    } else if (outstanding > 0) {
      segments["outstanding-balances"].push(data);
    } else if (upcomingAppointments > 0) {
      segments["upcoming-appointments"].push(data);
    } else {
      segments.returning.push(data);
    }
  });

  return segments;
}

export function getRevenueForecast(
  appointments: Appointment[],
  payments: Payment[],
  months: number = 3
) {
  const now = new Date();
  const forecast: { month: string; projected: number; actual: number }[] = [];

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthAppointments = appointments.filter((a) => a.date.startsWith(monthKey));
    const monthPayments = payments.filter(
      (p) => p.status === "recorded" && p.paymentDate.startsWith(monthKey)
    );

    const actual = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const projected = monthAppointments.reduce((sum, a) => sum + a.servicePrice, 0);

    forecast.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      projected,
      actual,
    });
  }

  return forecast;
}

export function getStaffComparison(
  staff: { id: string; fullName: string }[],
  appointments: Appointment[],
  payments: Payment[]
) {
  return staff.map((member) => {
    const memberAppointments = appointments.filter((a) => a.staffId === member.id);
    const memberPaymentIds = new Set(memberAppointments.map((a) => a.id));
    const memberPayments = payments.filter(
      (p) => memberPaymentIds.has(p.appointmentId) && p.status === "recorded"
    );
    const revenue = memberPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...member,
      appointmentCount: memberAppointments.length,
      completedCount: memberAppointments.filter((a) => a.status === "completed").length,
      revenue,
      avgPerAppointment: memberAppointments.length > 0 ? revenue / memberAppointments.length : 0,
    };
  });
}

export function getServicePopularity(
  services: { id: string; name: string }[],
  appointments: Appointment[]
) {
  return services.map((service) => {
    const serviceAppointments = appointments.filter((a) => a.serviceId === service.id);
    const totalAppointments = appointments.length;
    const popularity = totalAppointments > 0 ? (serviceAppointments.length / totalAppointments) * 100 : 0;

    return {
      ...service,
      count: serviceAppointments.length,
      popularity: Math.round(popularity),
    };
  });
}

export function getPeakBookingDays(appointments: Appointment[]) {
  const dayCounts = new Map<string, number>();
  appointments.forEach((a) => {
    const date = new Date(a.date);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  });

  return Array.from(dayCounts.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAverageAppointmentDuration(appointments: Appointment[]) {
  if (appointments.length === 0) return 0;
  const totalMinutes = appointments.reduce((sum, a) => {
    return sum + (timeToMinutes(a.endTime) - timeToMinutes(a.startTime));
  }, 0);
  return Math.round(totalMinutes / appointments.length);
}

export function getBookingLeadTime(appointments: Appointment[]) {
  if (appointments.length === 0) return 0;
  const leadTimes = appointments.map((a) => {
    const created = new Date(a.createdAt);
    const appointmentDate = new Date(`${a.date}T${a.startTime}`);
    return (appointmentDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  return Math.round(leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length);
}

export function getCustomerRetentionRate(
  customers: { id: string; createdAt: string }[],
  appointments: Appointment[],
  months: number = 6
) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const activeCustomers = customers.filter((c) => {
    const createdAt = new Date(c.createdAt);
    return createdAt <= cutoffDate;
  });

  const returningCustomers = activeCustomers.filter((customer) => {
    const customerAppointments = appointments.filter((a) => a.customerId === customer.id);
    return customerAppointments.length > 1;
  });

  return activeCustomers.length > 0
    ? Math.round((returningCustomers.length / activeCustomers.length) * 100)
    : 0;
}

export function getRevenuePerCustomer(
  customers: { id: string }[],
  payments: Payment[]
) {
  const totalRevenue = payments
    .filter((p) => p.status === "recorded")
    .reduce((sum, p) => sum + p.amount, 0);
  return customers.length > 0 ? totalRevenue / customers.length : 0;
}

export function getAppointmentValueDistribution(appointments: Appointment[]) {
  const ranges = [
    { label: "0 - 1,000", min: 0, max: 1000 },
    { label: "1,001 - 5,000", min: 1001, max: 5000 },
    { label: "5,001 - 10,000", min: 5001, max: 10000 },
    { label: "10,001+", min: 10001, max: Infinity },
  ];

  return ranges.map((range) => ({
    ...range,
    count: appointments.filter(
      (a) => a.servicePrice >= range.min && a.servicePrice <= range.max
    ).length,
  }));
}

export function getStaffWorkloadBalance(
  staff: { id: string; fullName: string }[],
  appointments: Appointment[],
  date: string
) {
  const dayAppointments = appointments.filter((a) => a.date === date);
  const totalAppointments = dayAppointments.length;

  return staff.map((member) => {
    const memberCount = dayAppointments.filter((a) => a.staffId === member.id).length;
    return {
      ...member,
      count: memberCount,
      percentage: totalAppointments > 0 ? Math.round((memberCount / totalAppointments) * 100) : 0,
    };
  });
}

export function getUpcomingAppointmentsByStatus(
  appointments: Appointment[],
  status: string
) {
  const today = new Date().toISOString().split("T")[0];
  return appointments
    .filter((a) => a.date >= today && a.status === status)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function getAppointmentsByDateRange(
  appointments: Appointment[],
  startDate: string,
  endDate: string
) {
  return appointments.filter((a) => a.date >= startDate && a.date <= endDate);
}

export function getPaymentSummaryByDate(
  payments: Payment[],
  date: string
) {
  const dayPayments = payments.filter(
    (p) => p.paymentDate === date && p.status === "recorded"
  );
  return {
    count: dayPayments.length,
    total: dayPayments.reduce((sum, p) => sum + p.amount, 0),
  };
}

export function getServiceDurationRange(services: { duration: number }[]) {
  if (services.length === 0) return { min: 0, max: 0 };
  const durations = services.map((s) => s.duration);
  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

export function getStaffWithMostAppointments(
  staff: { id: string; fullName: string }[],
  appointments: Appointment[]
) {
  const staffCounts = staff.map((member) => ({
    ...member,
    count: appointments.filter((a) => a.staffId === member.id).length,
  }));
  return staffCounts.sort((a, b) => b.count - a.count)[0] || null;
}

export function getMostBookedService(
  services: { id: string; name: string }[],
  appointments: Appointment[]
) {
  const serviceCounts = services.map((service) => ({
    ...service,
    count: appointments.filter((a) => a.serviceId === service.id).length,
  }));
  return serviceCounts.sort((a, b) => b.count - a.count)[0] || null;
}

export function getCustomerWithMostAppointments(
  customers: { id: string; fullName: string }[],
  appointments: Appointment[]
) {
  const customerCounts = customers.map((customer) => ({
    ...customer,
    count: appointments.filter((a) => a.customerId === customer.id).length,
  }));
  return customerCounts.sort((a, b) => b.count - a.count)[0] || null;
}

export function getHighestPayingCustomer(
  customers: { id: string; fullName: string }[],
  payments: Payment[]
) {
  const customerPayments = customers.map((customer) => ({
    ...customer,
    total: payments
      .filter((p) => p.customerName === customer.fullName && p.status === "recorded")
      .reduce((sum, p) => sum + p.amount, 0),
  }));
  return customerPayments.sort((a, b) => b.total - a.total)[0] || null;
}

export function getMostProfitableService(
  services: { id: string; name: string; price: number }[],
  appointments: Appointment[]
) {
  const serviceRevenue = services.map((service) => ({
    ...service,
    revenue: appointments
      .filter((a) => a.serviceId === service.id)
      .reduce((sum, a) => sum + a.servicePrice, 0),
  }));
  return serviceRevenue.sort((a, b) => b.revenue - a.revenue)[0] || null;
}

export function getBusiestDay(
  appointments: Appointment[]
) {
  const dayCounts = new Map<string, number>();
  appointments.forEach((a) => {
    dayCounts.set(a.date, (dayCounts.get(a.date) || 0) + 1);
  });

  let busiestDay = null;
  let maxCount = 0;
  dayCounts.forEach((count, date) => {
    if (count > maxCount) {
      maxCount = count;
      busiestDay = date;
    }
  });

  return busiestDay ? { date: busiestDay, count: maxCount } : null;
}

export function getSlowestDay(
  appointments: Appointment[]
) {
  const dayCounts = new Map<string, number>();
  appointments.forEach((a) => {
    dayCounts.set(a.date, (dayCounts.get(a.date) || 0) + 1);
  });

  let slowestDay = null;
  let minCount = Infinity;
  dayCounts.forEach((count, date) => {
    if (count < minCount) {
      minCount = count;
      slowestDay = date;
    }
  });

  return slowestDay ? { date: slowestDay, count: minCount } : null;
}

export function getAverageCustomersPerDay(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  const uniqueDates = new Set(appointments.map((a) => a.date)).size;
  return Math.round(appointments.length / uniqueDates);
}

export function getPeakBookingHour(
  appointments: Appointment[]
) {
  const hourCounts = new Map<number, number>();
  appointments.forEach((a) => {
    const hour = parseInt(a.startTime.split(":")[0], 10);
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  let peakHour = null;
  let maxCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });

  return peakHour !== null ? { hour: peakHour, count: maxCount } : null;
}

export function getSlowestBookingHour(
  appointments: Appointment[]
) {
  const hourCounts = new Map<number, number>();
  appointments.forEach((a) => {
    const hour = parseInt(a.startTime.split(":")[0], 10);
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  let slowestHour = null;
  let minCount = Infinity;
  hourCounts.forEach((count, hour) => {
    if (count < minCount) {
      minCount = count;
      slowestHour = hour;
    }
  });

  return slowestHour !== null ? { hour: slowestHour, count: minCount } : null;
}

export function getAverageAppointmentsPerDay(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  const uniqueDates = new Set(appointments.map((a) => a.date)).size;
  return Math.round(appointments.length / uniqueDates);
}

export function getAverageRevenuePerDay(
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (validPayments.length === 0) return 0;
  const uniqueDates = new Set(validPayments.map((p) => p.paymentDate)).size;
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(totalRevenue / uniqueDates);
}

export function getAverageRevenuePerAppointment(
  appointments: Appointment[],
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (appointments.length === 0) return 0;
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(totalRevenue / appointments.length);
}

export function getAverageCustomersPerMonth(
  customers: { createdAt: string }[]
) {
  if (customers.length === 0) return 0;
  const months = new Set(customers.map((c) => c.createdAt.slice(0, 7))).size;
  return Math.round(customers.length / months);
}

export function getAverageRevenuePerMonth(
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (validPayments.length === 0) return 0;
  const months = new Set(validPayments.map((p) => p.paymentDate.slice(0, 7))).size;
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(totalRevenue / months);
}

export function getAverageAppointmentsPerMonth(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  const months = new Set(appointments.map((a) => a.date.slice(0, 7))).size;
  return Math.round(appointments.length / months);
}

export function getAverageCustomersPerWeek(
  customers: { createdAt: string }[]
) {
  if (customers.length === 0) return 0;
  const weeks = new Set(customers.map((c) => {
    const date = new Date(c.createdAt);
    const week = Math.ceil((date.getDate() + 1) / 7);
    return `${date.getFullYear()}-${date.getMonth()}-${week}`;
  })).size;
  return Math.round(customers.length / weeks);
}

export function getAverageAppointmentsPerWeek(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  const weeks = new Set(appointments.map((a) => {
    const date = new Date(a.date);
    const week = Math.ceil((date.getDate() + 1) / 7);
    return `${date.getFullYear()}-${date.getMonth()}-${week}`;
  })).size;
  return Math.round(appointments.length / weeks);
}

export function getAverageRevenuePerWeek(
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (validPayments.length === 0) return 0;
  const weeks = new Set(validPayments.map((p) => {
    const date = new Date(p.paymentDate);
    const week = Math.ceil((date.getDate() + 1) / 7);
    return `${date.getFullYear()}-${date.getMonth()}-${week}`;
  })).size;
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(totalRevenue / weeks);
}

export function getAverageCustomersPerYear(
  customers: { createdAt: string }[]
) {
  if (customers.length === 0) return 0;
  const years = new Set(customers.map((c) => c.createdAt.slice(0, 4))).size;
  return Math.round(customers.length / years);
}

export function getAverageAppointmentsPerYear(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  const years = new Set(appointments.map((a) => a.date.slice(0, 4))).size;
  return Math.round(appointments.length / years);
}

export function getAverageRevenuePerYear(
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (validPayments.length === 0) return 0;
  const years = new Set(validPayments.map((p) => p.paymentDate.slice(0, 4))).size;
  const totalRevenue = validPayments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round(totalRevenue / years);
}

export function getCustomerGrowthRate(
  customers: { createdAt: string }[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentCount = customers.filter((c) => c.createdAt.startsWith(currentMonth)).length;
  const previousCount = customers.filter((c) => c.createdAt.startsWith(previousMonth)).length;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

export function getRevenueGrowthRate(
  payments: Payment[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentRevenue = payments
    .filter((p) => p.status === "recorded" && p.paymentDate.startsWith(currentMonth))
    .reduce((sum, p) => sum + p.amount, 0);
  const previousRevenue = payments
    .filter((p) => p.status === "recorded" && p.paymentDate.startsWith(previousMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  return previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0;
}

export function getAppointmentGrowthRate(
  appointments: Appointment[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentCount = appointments.filter((a) => a.date.startsWith(currentMonth)).length;
  const previousCount = appointments.filter((a) => a.date.startsWith(previousMonth)).length;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

export function getStaffGrowthRate(
  staff: { createdAt: string }[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentCount = staff.filter((s) => s.createdAt.startsWith(currentMonth)).length;
  const previousCount = staff.filter((s) => s.createdAt.startsWith(previousMonth)).length;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

export function getServiceGrowthRate(
  services: { createdAt: string }[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentCount = services.filter((s) => s.createdAt.startsWith(currentMonth)).length;
  const previousCount = services.filter((s) => s.createdAt.startsWith(previousMonth)).length;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

export function getPaymentGrowthRate(
  payments: Payment[],
  months: number = 6
) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const currentCount = payments.filter((p) => p.status === "recorded" && p.paymentDate.startsWith(currentMonth)).length;
  const previousCount = payments.filter((p) => p.status === "recorded" && p.paymentDate.startsWith(previousMonth)).length;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

export function getAveragePaymentValue(
  payments: Payment[]
) {
  const validPayments = payments.filter((p) => p.status === "recorded");
  if (validPayments.length === 0) return 0;
  return Math.round(validPayments.reduce((sum, p) => sum + p.amount, 0) / validPayments.length);
}

export function getAverageAppointmentValue(
  appointments: Appointment[]
) {
  if (appointments.length === 0) return 0;
  return Math.round(appointments.reduce((sum, a) => sum + a.servicePrice, 0) / appointments.length);
}

export function getAverageServiceDuration(
  services: { duration: number }[]
) {
  if (services.length === 0) return 0;
  return Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length);
}

export function getAverageStaffWorkingHours(
  staff: { workingHours: { start: string; end: string } }[]
) {
  if (staff.length === 0) return 0;
  const totalHours = staff.reduce((sum, s) => {
    return sum + (timeToMinutes(s.workingHours.end) - timeToMinutes(s.workingHours.start));
  }, 0);
  return Math.round(totalHours / staff.length / 60);
}

export function getAverageBookingBuffer(
  business: { bookingBufferMinutes: number } | null
) {
  return business?.bookingBufferMinutes || 0;
}

export function getAverageReminderLead(
  business: { reminderLead: number } | null
) {
  return business?.reminderLead || 0;
}

export function getAverageCancellationPolicy(
  business: { cancellationPolicyHours: number } | null
) {
  return business?.cancellationPolicyHours || 0;
}

export function getAverageCurrency(
  business: { currency: string } | null
) {
  return business?.currency || "PKR";
}

export function getAverageTimezone(
  business: { timezone: string } | null
) {
  return business?.timezone || "Asia/Karachi";
}

export function getAverageBusinessName(
  business: { name: string } | null
) {
  return business?.name || "My Business";
}

export function getAverageBusinessTagline(
  business: { tagline: string } | null
) {
  return business?.tagline || "";
}

export function getAverageBusinessContact(
  business: { contact: string } | null
) {
  return business?.contact || "";
}

export function getAverageBusinessAddress(
  business: { address: string } | null
) {
  return business?.address || "";
}

export function getAverageBusinessSettings(
  business: { name: string; tagline: string; contact: string; address: string; currency: string; timezone: string; reminderLead: number; cancellationPolicyHours: number; bookingBufferMinutes: number } | null
) {
  return {
    name: getAverageBusinessName(business),
    tagline: getAverageBusinessTagline(business),
    contact: getAverageBusinessContact(business),
    address: getAverageBusinessAddress(business),
    currency: getAverageCurrency(business),
    timezone: getAverageTimezone(business),
    reminderLead: getAverageReminderLead(business),
    cancellationPolicyHours: getAverageCancellationPolicy(business),
    bookingBufferMinutes: getAverageBookingBuffer(business),
  };
}

export function getMonthKey(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getAverageAllMetrics(
  customers: { createdAt: string }[],
  services: { createdAt: string; duration: number }[],
  staff: { createdAt: string; workingHours: { start: string; end: string } }[],
  appointments: Appointment[],
  payments: Payment[],
  business: { name: string; tagline: string; contact: string; address: string; currency: string; timezone: string; reminderLead: number; cancellationPolicyHours: number; bookingBufferMinutes: number } | null
) {
  return {
    customers: {
      total: customers.length,
      growthRate: getCustomerGrowthRate(customers),
      avgPerMonth: getAverageCustomersPerMonth(customers),
      avgPerWeek: getAverageCustomersPerWeek(customers),
      avgPerYear: getAverageCustomersPerYear(customers),
    },
    services: {
      total: services.length,
      growthRate: getServiceGrowthRate(services),
      avgDuration: getAverageServiceDuration(services),
    },
    staff: {
      total: staff.length,
      growthRate: getStaffGrowthRate(staff),
      avgWorkingHours: getAverageStaffWorkingHours(staff),
    },
    appointments: {
      total: appointments.length,
      growthRate: getAppointmentGrowthRate(appointments),
      avgPerMonth: getAverageAppointmentsPerMonth(appointments),
      avgPerWeek: getAverageAppointmentsPerWeek(appointments),
      avgPerYear: getAverageAppointmentsPerYear(appointments),
      avgValue: getAverageAppointmentValue(appointments),
      avgDuration: getAverageAppointmentDuration(appointments),
    },
    payments: {
      total: payments.length,
      growthRate: getPaymentGrowthRate(payments),
      avgValue: getAveragePaymentValue(payments),
      avgPerMonth: getAverageRevenuePerMonth(payments),
      avgPerWeek: getAverageRevenuePerWeek(payments),
      avgPerYear: getAverageRevenuePerYear(payments),
    },
    business: getAverageBusinessSettings(business),
  };
}