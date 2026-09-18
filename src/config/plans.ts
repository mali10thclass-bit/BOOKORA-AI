import { PlanType } from "@/types";

export interface PlanLimits {
  maxCustomers: number;
  maxServices: number;
  maxStaff: number;
  maxAppointments: number;
  maxPayments: number;
}

export interface PlanFeatures {
  dashboard: boolean;
  customers: boolean;
  services: boolean;
  staff: boolean;
  appointments: boolean;
  calendar: boolean;
  payments: boolean;
  receipts: boolean;
  analytics: boolean;
  notifications: boolean;
  publicBooking: boolean;
  customerSelfService: boolean;
  aiAssistant: boolean;
  auditLog: boolean;
  advancedAnalytics: boolean;
  staffPermissions: boolean;
  multiLocation: boolean;
  advancedReports: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanType;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: PlanFeatures;
  color: string;
  icon: string;
}

export const PLANS: Record<PlanType, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    description: "For small businesses getting started",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxCustomers: 50,
      maxServices: 10,
      maxStaff: 2,
      maxAppointments: 100,
      maxPayments: 100,
    },
    features: {
      dashboard: true,
      customers: true,
      services: true,
      staff: true,
      appointments: true,
      calendar: true,
      payments: true,
      receipts: true,
      analytics: false,
      notifications: false,
      publicBooking: false,
      customerSelfService: false,
      aiAssistant: false,
      auditLog: false,
      advancedAnalytics: false,
      staffPermissions: false,
      multiLocation: false,
      advancedReports: false,
      prioritySupport: false,
    },
    color: "slate",
    icon: "Zap",
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    description: "For growing businesses",
    priceMonthly: 29,
    priceYearly: 290,
    limits: {
      maxCustomers: 500,
      maxServices: 50,
      maxStaff: 10,
      maxAppointments: 1000,
      maxPayments: 1000,
    },
    features: {
      dashboard: true,
      customers: true,
      services: true,
      staff: true,
      appointments: true,
      calendar: true,
      payments: true,
      receipts: true,
      analytics: true,
      notifications: true,
      publicBooking: true,
      customerSelfService: true,
      aiAssistant: false,
      auditLog: true,
      advancedAnalytics: true,
      staffPermissions: true,
      multiLocation: false,
      advancedReports: true,
      prioritySupport: false,
    },
    color: "indigo",
    icon: "Rocket",
  },
  ULTIMATE: {
    id: "ULTIMATE",
    name: "Ultimate",
    description: "For professional businesses",
    priceMonthly: 79,
    priceYearly: 790,
    limits: {
      maxCustomers: 5000,
      maxServices: 200,
      maxStaff: 50,
      maxAppointments: 10000,
      maxPayments: 10000,
    },
    features: {
      dashboard: true,
      customers: true,
      services: true,
      staff: true,
      appointments: true,
      calendar: true,
      payments: true,
      receipts: true,
      analytics: true,
      notifications: true,
      publicBooking: true,
      customerSelfService: true,
      aiAssistant: true,
      auditLog: true,
      advancedAnalytics: true,
      staffPermissions: true,
      multiLocation: true,
      advancedReports: true,
      prioritySupport: true,
    },
    color: "purple",
    icon: "Crown",
  },
};

export const DEFAULT_PLAN: PlanType = "FREE";