export type UserRole = "client" | "worker" | "admin" | "super_admin";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

/**
 * Account lifecycle. A client or worker is invisible to the rest of the
 * platform until an administrator approves the account. Admin accounts are
 * created pre-approved by the bootstrap process.
 */
export type AccountStatus = "pending" | "approved" | "suspended" | "rejected";

export type BookingStatus =
  | "pending_payment"
  | "confirmed_exclusive"
  | "in_progress"
  | "completed"
  | "cancelled";

export type EscrowStatus = "holding" | "released" | "refunded";

/** A provider-confirmed payment is required before a booking becomes exclusive. */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

export interface MpesaPayment {
  id: string;
  bookingId: string;
  clientId: string;
  amountKes: number;
  phoneNumber: string;
  status: PaymentStatus;
  merchantRequestId?: string;
  /** Paybill number the money was collected into (sandbox shortcode or 542542). */
  paybillNumber?: string;
  /** Account number / reference submitted with the payment. */
  accountReference?: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  resultCode?: number;
  resultDescription?: string;
  rawCallback?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export const KES_PER_USD = 130;
export const DAILY_HIRING_FEE_KES = 1000;
export const MONTHLY_HIRING_FEE_KES = 3000;
export const DAILY_HIRING_FEE_USD = DAILY_HIRING_FEE_KES / KES_PER_USD;
export const MONTHLY_HIRING_FEE_USD = MONTHLY_HIRING_FEE_KES / KES_PER_USD;
/** Legacy name retained for existing monthly bookings and callers. */
export const CONSTANT_HIRING_FEE_KES = MONTHLY_HIRING_FEE_KES;
export const CONSTANT_HIRING_FEE_USD = MONTHLY_HIRING_FEE_USD;

export function hiringFeeKES(engagementType: EngagementType): number {
  return engagementType === "daily"
    ? DAILY_HIRING_FEE_KES
    : MONTHLY_HIRING_FEE_KES;
}

export function hiringFeeUSD(engagementType: EngagementType): number {
  return hiringFeeKES(engagementType) / KES_PER_USD;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  location: string;
  householdSize?: string; // e.g. "2 Adults, 1 Toddler, 1 Cat"
  householdNotes?: string;
  idVerificationStatus: VerificationStatus;
  idType?: "national_id" | "passport" | "drivers_license";
  idNumber?: string;
  idDocumentUrl?: string; // Front
  idDocumentBackUrl?: string; // Back
  selfieUrl?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  submittedAt?: string;
  createdAt: string;
  /** Account approval lifecycle. New client/worker accounts start as "pending". */
  accountStatus?: AccountStatus;
  approvedAt?: string;
  approvedBy?: string;
  /** Reason shown to the user when an account is rejected or suspended. */
  accountStatusReason?: string;
  /** Soft-deleted accounts are hidden and cannot sign in; history is retained. */
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  lastLoginAt?: string;
  /** Stored only server-side. Never return this field from an API response. */
  password?: string;
}

/** Any administrator, whether the main (super) administrator or a promoted one. */
export function isAdminRole(role: UserRole | undefined | null): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * The main administrator account. It is the only account that may promote or
 * demote other administrators, and it can never be demoted, suspended, or have
 * its role changed by anyone else.
 */
export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === "super_admin";
}

export type EngagementType = "daily" | "monthly";

export interface WorkerProfile {
  id: string;
  userId: string;
  headline: string;
  bio: string;
  services: string[]; // Household services and repair specialties such as Plumbing or Appliance Repair
  hireFee: number; // Lowest applicable hiring fee, used by directory filters
  engagementTypes: EngagementType[]; // Which engagements the worker offers: daily (1–2 day jobs), monthly, or both
  expectedDailySalary: number; // Stated daily pay for daily/short-term jobs at end of day (in USD base)
  expectedMonthlySalary: number; // Stated monthly pay for monthly engagements (in USD base)
  location: string;
  serviceRadiusKm: number;
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  languages: string[];
  policeClearanceVerified: boolean;
  backgroundCheckVerified: boolean;
  referenceCount: number;
  liveInAvailable: boolean;
  availableDays: string[];
  skills: string[];
  featured?: boolean;
  /** A payment prompt is active for this worker's reserved dates. */
  bookingPending?: boolean;
}

export interface Booking {
  id: string;
  bookingRef: string; // e.g. "HLK-26-9042" (12-char M-Pesa reference limit)
  clientId: string;
  workerId: string;
  serviceName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  engagementType: EngagementType;
  platformBookingFee: number; // Hiring fee paid to Herlooku
  workerExpectedDailySalary: number;
  workerExpectedMonthlySalary?: number;
  totalAmount: number; // Amount collected by Herlooku at booking
  hireFee?: number; // Optional legacy field
  platformFee?: number; // Optional legacy field
  status: BookingStatus;
  escrowStatus: EscrowStatus;
  clientAddress: string;
  specialInstructions?: string;
  paymentMethod?: string;
  paymentTransactionRef?: string;
  paymentStatus?: PaymentStatus;
  /** True when an administrator confirmed the assignment without collecting payment. */
  manualAssignment?: boolean;
  paymentRequestId?: string;
  paymentFailureReason?: string;
  reservationExpiresAt?: string;
  paidAt?: string;
  createdAt: string;
}

export type EmergencyAlarmType =
  | "theft"
  | "security"
  | "abuse"
  | "neglect"
  | "misconduct";

export interface EmergencyAlarm {
  id: string;
  bookingId: string;
  bookingRef: string;
  raisedByUserId: string;
  raisedByName: string;
  raisedByUserRole: "client" | "worker";
  alarmType: EmergencyAlarmType;
  severity: "critical" | "urgent";
  details: string;
  location: string;
  status: "active" | "responding" | "resolved";
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  workerId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface IDVerificationSubmission {
  idType: "national_id" | "passport" | "drivers_license";
  idNumber: string;
  idDocumentUrl: string;
  idDocumentBackUrl?: string;
  selfieUrl: string;
}
