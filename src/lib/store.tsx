import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Notification } from "@/types";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  active: boolean;
  workingHours: {
    start: string;
    end: string;
  };
}

export interface Payment {
  id: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: "cash" | "card" | "bank" | "mobile";
  status: "recorded" | "voided";
  paymentDate: string;
}

export interface Subscription {
  plan: "FREE" | "PRO" | "BUSINESS";
  status: "active" | "past_due" | "cancelled";
  renewsAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

interface StoreContextType {
  // Auth
  auth: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Business
  business: Business | null;
  updateBusiness: (data: Partial<Business>) => void;

  // Appointments
  appointments: Appointment[];
  addAppointment: (data: Omit<Appointment, "id" | "createdAt">) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  // Customers
  customers: Customer[];
  addCustomer: (data: Omit<Customer, "id" | "createdAt">) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Services
  services: Service[];
  addService: (data: Omit<Service, "id">) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // Staff
  staff: Staff[];
  addStaff: (data: Omit<Staff, "id">) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  // Payments
  payments: Payment[];
  addPayment: (data: Omit<Payment, "id">) => void;
  voidPayment: (id: string) => void;

  // Subscription
  subscription: Subscription;
  changePlan: (plan: Subscription["plan"]) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Demo data
const demoUser: User = {
  id: "user-1",
  name: "Sarah Johnson",
  email: "sarah@bookora.com",
};

const demoBusiness: Business = {
  id: "biz-1",
  name: "Luxe Salon & Spa",
  email: "hello@luxesalon.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street, Suite 100, New York, NY 10001",
  currency: "USD",
  timezone: "America/New_York",
};

const demoCustomers: Customer[] = [
  { id: "cust-1", fullName: "Emma Wilson", email: "emma@example.com", phone: "+1 (555) 234-5678", status: "active", createdAt: "2024-01-15" },
  { id: "cust-2", fullName: "James Rodriguez", email: "james@example.com", phone: "+1 (555) 345-6789", status: "active", createdAt: "2024-02-01" },
  { id: "cust-3", fullName: "Olivia Chen", email: "olivia@example.com", phone: "+1 (555) 456-7890", status: "active", createdAt: "2024-02-15" },
  { id: "cust-4", fullName: "Michael Brown", email: "michael@example.com", phone: "+1 (555) 567-8901", status: "inactive", createdAt: "2024-03-01" },
  { id: "cust-5", fullName: "Sophia Davis", email: "sophia@example.com", phone: "+1 (555) 678-9012", status: "active", createdAt: "2024-03-15" },
];

const demoServices: Service[] = [
  { id: "svc-1", name: "Haircut & Style", duration: 60, price: 85, description: "Precision cut with wash and style", active: true },
  { id: "svc-2", name: "Color & Highlights", duration: 120, price: 150, description: "Full color with highlights", active: true },
  { id: "svc-3", name: "Manicure & Pedicure", duration: 90, price: 75, description: "Complete nail care treatment", active: true },
  { id: "svc-4", name: "Facial Treatment", duration: 60, price: 95, description: "Deep cleansing facial", active: true },
  { id: "svc-5", name: "Bridal Makeup", duration: 90, price: 200, description: "Professional bridal makeup", active: true },
];

const demoStaff: Staff[] = [
  { id: "staff-1", name: "Sarah Johnson", role: "Senior Stylist", email: "sarah@luxesalon.com", phone: "+1 (555) 111-2222", active: true, workingHours: { start: "09:00", end: "17:00" } },
  { id: "staff-2", name: "David Lee", role: "Color Specialist", email: "david@luxesalon.com", phone: "+1 (555) 222-3333", active: true, workingHours: { start: "10:00", end: "18:00" } },
  { id: "staff-3", name: "Maria Garcia", role: "Nail Technician", email: "maria@luxesalon.com", phone: "+1 (555) 333-4444", active: true, workingHours: { start: "09:00", end: "16:00" } },
];

const demoAppointments: Appointment[] = [
  {
    id: "apt-1",
    customerId: "cust-1",
    customerName: "Emma Wilson",
    serviceId: "svc-1",
    serviceName: "Haircut & Style",
    servicePrice: 85,
    staffId: "staff-1",
    staffName: "Sarah Johnson",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    status: "confirmed",
    createdAt: "2024-01-10",
  },
  {
    id: "apt-2",
    customerId: "cust-2",
    customerName: "James Rodriguez",
    serviceId: "svc-2",
    serviceName: "Color & Highlights",
    servicePrice: 150,
    staffId: "staff-2",
    staffName: "David Lee",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "12:00",
    status: "scheduled",
    createdAt: "2024-01-12",
  },
  {
    id: "apt-3",
    customerId: "cust-3",
    customerName: "Olivia Chen",
    serviceId: "svc-3",
    serviceName: "Manicure & Pedicure",
    servicePrice: 75,
    staffId: "staff-3",
    staffName: "Maria Garcia",
    date: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    endTime: "12:30",
    status: "confirmed",
    createdAt: "2024-01-14",
  },
  {
    id: "apt-4",
    customerId: "cust-4",
    customerName: "Michael Brown",
    serviceId: "svc-4",
    serviceName: "Facial Treatment",
    servicePrice: 95,
    staffId: "staff-1",
    staffName: "Sarah Johnson",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    startTime: "14:00",
    endTime: "15:00",
    status: "scheduled",
    createdAt: "2024-01-16",
  },
  {
    id: "apt-5",
    customerId: "cust-5",
    customerName: "Sophia Davis",
    serviceId: "svc-5",
    serviceName: "Bridal Makeup",
    servicePrice: 200,
    staffId: "staff-2",
    staffName: "David Lee",
    date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:30",
    status: "scheduled",
    createdAt: "2024-01-18",
  },
];

const demoPayments: Payment[] = [
  { id: "pay-1", appointmentId: "apt-1", customerId: "cust-1", customerName: "Emma Wilson", amount: 85, paymentMethod: "card", status: "recorded", paymentDate: "2024-01-15" },
  { id: "pay-2", appointmentId: "apt-2", customerId: "cust-2", customerName: "James Rodriguez", amount: 150, paymentMethod: "cash", status: "recorded", paymentDate: "2024-01-16" },
  { id: "pay-3", appointmentId: "apt-3", customerId: "cust-3", customerName: "Olivia Chen", amount: 75, paymentMethod: "mobile", status: "recorded", paymentDate: "2024-01-17" },
  { id: "pay-4", appointmentId: "apt-4", customerId: "cust-4", customerName: "Michael Brown", amount: 95, paymentMethod: "card", status: "voided", paymentDate: "2024-01-18" },
];

const demoSubscription: Subscription = {
  plan: "PRO",
  status: "active",
  renewsAt: "2024-12-31",
};

// Storage helpers
const STORAGE_KEYS = {
  auth: "bookora_auth",
  business: "bookora_business",
  appointments: "bookora_appointments",
  customers: "bookora_customers",
  services: "bookora_services",
  staff: "bookora_staff",
  payments: "bookora_payments",
  subscription: "bookora_subscription",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = loadFromStorage<AuthState | null>(STORAGE_KEYS.auth, null);
    return stored || { isAuthenticated: false, isLoading: false, user: null };
  });

  const [business, setBusiness] = useState<Business | null>(() =>
    loadFromStorage<Business | null>(STORAGE_KEYS.business, demoBusiness)
  );

  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    loadFromStorage<Appointment[]>(STORAGE_KEYS.appointments, demoAppointments)
  );

  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage<Customer[]>(STORAGE_KEYS.customers, demoCustomers)
  );

  const [services, setServices] = useState<Service[]>(() =>
    loadFromStorage<Service[]>(STORAGE_KEYS.services, demoServices)
  );

  const [staff, setStaff] = useState<Staff[]>(() =>
    loadFromStorage<Staff[]>(STORAGE_KEYS.staff, demoStaff)
  );

  const [payments, setPayments] = useState<Payment[]>(() =>
    loadFromStorage<Payment[]>(STORAGE_KEYS.payments, demoPayments)
  );

  const [subscription, setSubscription] = useState<Subscription>(() =>
    loadFromStorage<Subscription>(STORAGE_KEYS.subscription, demoSubscription)
  );

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.auth, auth);
  }, [auth]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.business, business);
  }, [business]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.appointments, appointments);
  }, [appointments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.customers, customers);
  }, [customers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.services, services);
  }, [services]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.staff, staff);
  }, [staff]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.payments, payments);
  }, [payments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.subscription, subscription);
  }, [subscription]);

  // Auth methods
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuth((prev) => ({ ...prev, isLoading: true }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (email && password.length >= 6) {
      const user: User = {
        id: "user-1",
        name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
      };
      setAuth({ isAuthenticated: true, isLoading: false, user });
      return true;
    }

    setAuth((prev) => ({ ...prev, isLoading: false }));
    return false;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setAuth((prev) => ({ ...prev, isLoading: true }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (name && email && password.length >= 6) {
      const user: User = {
        id: `user-${Date.now()}`,
        name,
        email,
      };
      setAuth({ isAuthenticated: true, isLoading: false, user });
      return true;
    }

    setAuth((prev) => ({ ...prev, isLoading: false }));
    return false;
  };

  const logout = () => {
    setAuth({ isAuthenticated: false, isLoading: false, user: null });
  };

  // Business methods
  const updateBusiness = (data: Partial<Business>) => {
    setBusiness((prev) => (prev ? { ...prev, ...data } : prev));
  };

  // Appointment methods
  const addAppointment = (data: Omit<Appointment, "id" | "createdAt">) => {
    const newAppointment: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppointments((prev) => [...prev, newAppointment]);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === id ? { ...appointment, ...data } : appointment
      )
    );
  };

  const deleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
  };

  // Customer methods
  const addCustomer = (data: Omit<Customer, "id" | "createdAt">) => {
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === id ? { ...customer, ...data } : customer
      )
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
  };

  // Service methods
  const addService = (data: Omit<Service, "id">) => {
    const newService: Service = {
      ...data,
      id: `svc-${Date.now()}`,
    };
    setServices((prev) => [...prev, newService]);
  };

  const updateService = (id: string, data: Partial<Service>) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, ...data } : service
      )
    );
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((service) => service.id !== id));
  };

  // Staff methods
  const addStaff = (data: Omit<Staff, "id">) => {
    const newStaff: Staff = {
      ...data,
      id: `staff-${Date.now()}`,
    };
    setStaff((prev) => [...prev, newStaff]);
  };

  const updateStaff = (id: string, data: Partial<Staff>) => {
    setStaff((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...data } : member
      )
    );
  };

  const deleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((member) => member.id !== id));
  };

  // Payment methods
  const addPayment = (data: Omit<Payment, "id">) => {
    const newPayment: Payment = {
      ...data,
      id: `pay-${Date.now()}`,
    };
    setPayments((prev) => [...prev, newPayment]);
  };

  const voidPayment = (id: string) => {
    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === id ? { ...payment, status: "voided" as const } : payment
      )
    );
  };

  // Subscription methods
  const changePlan = (plan: Subscription["plan"]) => {
    setSubscription((prev) => ({
      ...prev,
      plan,
      status: "active",
      renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    }));
  };

  const value: StoreContextType = {
    auth,
    login,
    register,
    logout,
    business,
    updateBusiness,
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    services,
    addService,
    updateService,
    deleteService,
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    payments,
    addPayment,
    voidPayment,
    subscription,
    changePlan,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBusiness() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a StoreProvider");
  }
  return context;
}