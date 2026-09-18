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
}