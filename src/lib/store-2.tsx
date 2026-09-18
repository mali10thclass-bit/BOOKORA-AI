import { createContext, useContext, useState, ReactNode } from "react";

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  status: "active" | "inactive";
  createdAt: string;
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
}

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  workingHours: {
    start: string;
    end: string;
  };
  active: boolean;
  createdAt: string;
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
  createdAt: string;
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
  notes?: string;
  createdAt: string;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  contact: string;
  address: string;
  currency: string;
  timezone: string;
  reminderLead: number;
  cancellationPolicyHours: number;
  bookingBufferMinutes: number;
}

interface StoreState {
  customers: Customer[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  payments: Payment[];
  business: BusinessSettings | null;
  addCustomer: (data: Omit<Customer, "id" | "createdAt">) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addService: (data: Omit<Service, "id" | "createdAt">) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addStaff: (data: Omit<Staff, "id" | "createdAt">) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  addAppointment: (data: Omit<Appointment, "id" | "createdAt">) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addPayment: (data: Omit<Payment, "id" | "createdAt">) => void;
  voidPayment: (id: string) => void;
  updateBusiness: (data: Partial<BusinessSettings>) => void;
  exportData: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

const STORAGE_KEY = "bookora-ai-storage";

interface PersistedState {
  customers: Customer[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  payments: Payment[];
  business: BusinessSettings | null;
}

function loadState(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load state:", error);
  }
  return {
    customers: [],
    services: [],
    staff: [],
    appointments: [],
    payments: [],
    business: null,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);

  const saveState = (newState: PersistedState) => {
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  };

  const value: StoreState = {
    ...state,
    addCustomer: (data) => {
      const customer: Customer = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveState({ ...state, customers: [...state.customers, customer] });
    },
    updateCustomer: (id, data) => {
      saveState({
        ...state,
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
      });
    },
    deleteCustomer: (id) => {
      saveState({ ...state, customers: state.customers.filter((c) => c.id !== id) });
    },
    addService: (data) => {
      const service: Service = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveState({ ...state, services: [...state.services, service] });
    },
    updateService: (id, data) => {
      saveState({
        ...state,
        services: state.services.map((s) => (s.id === id ? { ...s, ...data } : s)),
      });
    },
    deleteService: (id) => {
      saveState({ ...state, services: state.services.filter((s) => s.id !== id) });
    },
    addStaff: (data) => {
      const member: Staff = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveState({ ...state, staff: [...state.staff, member] });
    },
    updateStaff: (id, data) => {
      saveState({
        ...state,
        staff: state.staff.map((s) => (s.id === id ? { ...s, ...data } : s)),
      });
    },
    deleteStaff: (id) => {
      saveState({ ...state, staff: state.staff.filter((s) => s.id !== id) });
    },
    addAppointment: (data) => {
      const appointment: Appointment = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveState({ ...state, appointments: [...state.appointments, appointment] });
    },
    updateAppointment: (id, data) => {
      saveState({
        ...state,
        appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...data } : a)),
      });
    },
    deleteAppointment: (id) => {
      saveState({ ...state, appointments: state.appointments.filter((a) => a.id !== id) });
    },
    addPayment: (data) => {
      const payment: Payment = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      saveState({ ...state, payments: [...state.payments, payment] });
    },
    voidPayment: (id) => {
      saveState({
        ...state,
        payments: state.payments.map((p) => (p.id === id ? { ...p, status: "voided" } : p)),
      });
    },
    updateBusiness: (data) => {
      const business = { ...state.business, ...data } as BusinessSettings;
      saveState({ ...state, business });
    },
    exportData: () => {
      const data = {
        ...state,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookora-ai-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBusiness(): StoreState {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useBusiness must be used within StoreProvider");
  }
  return context;
}