import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  workingHours: { start: string; end: string };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  customerName: string;
  serviceName: string;
  staffName: string;
  servicePrice: number;
  notes?: string;
  customerNotes?: string;
  staffNotes?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
  changedBy?: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "cash" | "card" | "online";
  status: "recorded" | "voided";
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentValue: number;
  receiptRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  tagline: string;
  contact: string;
  address: string;
  currency: string;
  timezone: string;
  reminderLead: number;
  cancellationPolicyHours: number;
  bookingBufferMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  originalAmount: number;
  type: "full" | "partial";
  status: "pending" | "approved" | "completed" | "rejected";
  reason: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  rejectedReason?: string;
  isRealProviderRefund: boolean;
  providerRefundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Credit {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  source: "refund" | "manual" | "adjustment";
  sourceId: string;
  status: "active" | "used" | "expired" | "cancelled";
  description: string;
  expiresAt?: string;
  usedAt?: string;
  usedForAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Adjustment {
  id: string;
  appointmentId?: string;
  customerId?: string;
  type: "discount" | "fee" | "correction" | "penalty";
  amount: number;
  description: string;
  status: "pending" | "applied" | "cancelled";
  appliedBy?: string;
  appliedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLogo?: string;
  services: { serviceName: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  currency: string;
  paymentMethod?: string;
  status: "generated" | "printed" | "email_sent" | "cancelled";
  notes?: string;
  createdAt: string;
}

interface StoreState {
  customers: Customer[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  payments: Payment[];
  refunds: Refund[];
  credits: Credit[];
  adjustments: Adjustment[];
  receipts: Receipt[];
  business: Business | null;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  addService: (service: Omit<Service, "id" | "createdAt" | "updatedAt">) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  addStaff: (staff: Omit<Staff, "id" | "createdAt" | "updatedAt">) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  addStatusHistoryEntry: (appointmentId: string, entry: Omit<StatusHistoryEntry, "id" | "timestamp">) => void;
  updateAppointmentNotes: (appointmentId: string, notes: string, notesType: "customer" | "staff") => void;
  addPayment: (payment: Omit<Payment, "id" | "createdAt" | "updatedAt">) => void;
  voidPayment: (id: string) => void;
  addRefund: (refund: Omit<Refund, "id" | "createdAt" | "updatedAt">) => void;
  updateRefund: (id: string, data: Partial<Refund>) => void;
  addCredit: (credit: Omit<Credit, "id" | "createdAt" | "updatedAt">) => void;
  updateCredit: (id: string, data: Partial<Credit>) => void;
  addAdjustment: (adjustment: Omit<Adjustment, "id" | "createdAt" | "updatedAt">) => void;
  updateAdjustment: (id: string, data: Partial<Adjustment>) => void;
  addReceipt: (receipt: Omit<Receipt, "id" | "createdAt">) => void;
  updateBusiness: (data: Partial<Business>) => void;
  loadBusiness: () => void;
}

export const useBusinessStore = create<StoreState>()(
  persist(
    (set, get) => ({
      customers: [],
      services: [],
      staff: [],
      appointments: [],
      payments: [],
      refunds: [],
      credits: [],
      adjustments: [],
      receipts: [],
      business: null,

      addCustomer: (data) => {
        const now = new Date().toISOString();
        const customer: Customer = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ customers: [...state.customers, customer] }));
      },

      updateCustomer: (id, data) => {
        set((state) => ({
          customers: state.customers.map((c) => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
        }));
      },

      addService: (data) => {
        const now = new Date().toISOString();
        const service: Service = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ services: [...state.services, service] }));
      },

      updateService: (id, data) => {
        set((state) => ({
          services: state.services.map((s) => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s),
        }));
      },

      addStaff: (data) => {
        const now = new Date().toISOString();
        const staff: Staff = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ staff: [...state.staff, staff] }));
      },

      updateStaff: (id, data) => {
        set((state) => ({
          staff: state.staff.map((s) => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s),
        }));
      },

      addAppointment: (data) => {
        const now = new Date().toISOString();
        const appointment: Appointment = {
          ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
          statusHistory: [{ id: crypto.randomUUID(), status: data.status, timestamp: now }],
        };
        set((state) => ({ appointments: [...state.appointments, appointment] }));
      },

      updateAppointment: (id, data) => {
        set((state) => ({
          appointments: state.appointments.map((a) => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a),
        }));
      },

      addStatusHistoryEntry: (appointmentId, entry) => {
        const now = new Date().toISOString();
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId ? { ...a, statusHistory: [...a.statusHistory, { ...entry, id: crypto.randomUUID(), timestamp: now }], updatedAt: now } : a
          ),
        }));
      },

      updateAppointmentNotes: (appointmentId, notes, notesType) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId ? { ...a, [notesType === "customer" ? "customerNotes" : "staffNotes"]: notes, updatedAt: new Date().toISOString() } : a
          ),
        }));
      },

      addPayment: (data) => {
        const now = new Date().toISOString();
        const payment: Payment = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ payments: [...state.payments, payment] }));
      },

      voidPayment: (id) => {
        set((state) => ({
          payments: state.payments.map((p) => p.id === id ? { ...p, status: "voided", updatedAt: new Date().toISOString() } : p),
        }));
      },

      addRefund: (data) => {
        const now = new Date().toISOString();
        const refund: Refund = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ refunds: [...state.refunds, refund] }));
      },

      updateRefund: (id, data) => {
        set((state) => ({
          refunds: state.refunds.map((r) => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
        }));
      },

      addCredit: (data) => {
        const now = new Date().toISOString();
        const credit: Credit = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ credits: [...state.credits, credit] }));
      },

      updateCredit: (id, data) => {
        set((state) => ({
          credits: state.credits.map((c) => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
        }));
      },

      addAdjustment: (data) => {
        const now = new Date().toISOString();
        const adjustment: Adjustment = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ adjustments: [...state.adjustments, adjustment] }));
      },

      updateAdjustment: (id, data) => {
        set((state) => ({
          adjustments: state.adjustments.map((a) => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a),
        }));
      },

      addReceipt: (data) => {
        const now = new Date().toISOString();
        const receipt: Receipt = { ...data, id: crypto.randomUUID(), createdAt: now };
        set((state) => ({ receipts: [...state.receipts, receipt] }));
      },

      updateBusiness: (data) => {
        set((state) => ({
          business: state.business
            ? { ...state.business, ...data, updatedAt: new Date().toISOString() }
            : { id: crypto.randomUUID(), name: "My Business", tagline: "", contact: "", address: "", currency: "USD", timezone: "UTC", reminderLead: 24, cancellationPolicyHours: 24, bookingBufferMinutes: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data },
        }));
      },

      loadBusiness: () => {
        if (!get().business) {
          set({ business: { id: crypto.randomUUID(), name: "My Business", tagline: "Book your appointment today", contact: "", address: "", currency: "USD", timezone: "UTC", reminderLead: 24, cancellationPolicyHours: 24, bookingBufferMinutes: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
        }
      },
    }),
    { name: "bookora-storage" }
  )
);

export const useBusiness = useBusinessStore;
