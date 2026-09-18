export type Role = "OWNER" | "ADMIN" | "STAFF";
export type PlanType = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";
export type CustomerStatus = "active" | "inactive" | "lead";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
export type RefundStatus = "pending" | "approved" | "completed" | "rejected";
export type RefundType = "full" | "partial";
export type CreditStatus = "active" | "used" | "expired" | "cancelled";
export type AdjustmentType = "discount" | "fee" | "correction" | "penalty";
export type AdjustmentStatus = "pending" | "applied" | "cancelled";
export type ReceiptStatus = "generated" | "printed" | "email_sent" | "cancelled";
export type PaymentStatus = "recorded" | "voided" | "refunded" | "partially_refunded";

export interface Refund {
  id: string;
  paymentId: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  originalAmount: number;
  type: RefundType;
  status: RefundStatus;
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
  status: CreditStatus;
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
  type: AdjustmentType;
  amount: number;
  description: string;
  status: AdjustmentStatus;
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
  services: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  currency: string;
  paymentMethod?: string;
  status: ReceiptStatus;
  notes?: string;
  createdAt: string;
}

export interface ReceiptLineItem {
  serviceName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  reference?: string;
  notes?: string;
  refundIds?: string[];
  creditIds?: string[];
  createdAt: string;
  updatedAt: string;
}export type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partial'

export type PlanTier = 'free' | 'pro' | 'ultimate'

export interface Business {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  primary_color: string | null
  timezone: string | null
  currency: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  onboarding_completed: boolean | null
  plan: string | null
  plan_status: string | null
  created_at: string | null
  updated_at: string | null
}

export interface BusinessMember {
  id: string
  business_id: string
  user_id: string | null
  role: string | null
  invited_email: string | null
  invite_status: string | null
  created_at: string | null
  email: string | null
  full_name: string | null
}

export interface Location {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean | null
  created_at: string | null
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  color: string | null
  is_active: boolean | null
  category: string | null
  created_at: string | null
}

export interface Staff {
  id: string
  business_id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean | null
  created_at: string | null
}

export interface WorkingHour {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean | null
}

export interface Customer {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  tags: string[] | null
  total_visits: number | null
  total_spent: number | null
  last_visit_at: string | null
  created_at: string | null
}

export interface Booking {
  id: string
  business_id: string
  location_id: string | null
  service_id: string
  staff_id: string
  customer_id: string
  start_time: string
  end_time: string
  status: string | null
  notes: string | null
  price: number | null
  payment_status: string | null
  created_at: string | null
  updated_at: string | null
  service?: Service
  staff?: Staff
  customer?: Customer
  location?: Location
}

export interface Payment {
  id: string
  booking_id: string
  business_id: string
  amount: number | null
  method: string | null
  status: string | null
  reference: string | null
  notes: string | null
  processed_by: string | null
  created_at: string | null
}

export interface Notification {
  id: string
  business_id: string
  type: string
  channel: string | null
  recipient: string | null
  subject: string | null
  body: string | null
  sent_at: string | null
  status: string | null
  booking_id: string | null
  created_at: string | null
}

export interface SubscriptionPlan {
  tier: PlanTier
  name: string
  price_monthly: number
  price_yearly: number
  max_staff: number
  max_locations: number
  max_services: number
  features: string[]
}