import "server-only";

import {
  User,
  WorkerProfile,
  Booking,
  Review,
  AccountStatus,
  VerificationStatus,
  EmergencyAlarm,
  EmergencyAlarmType,
  MpesaPayment,
  UserRole,
  hiringFeeUSD,
} from "@/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProfile } from "@/lib/auth";

/**
 * Supabase-backed data access layer.
 *
 * Every method here runs through the caller's session client, so Row Level
 * Security is the real gatekeeper. Methods that must act outside RLS (the
 * M-Pesa callback, admin approval) use the service-role client explicitly and
 * are marked as such.
 */

type ProfileRow = Parameters<typeof mapProfile>[0];

// ── Row mappers ─────────────────────────────────────────────────────────────

function mapWorkerProfile(row: any): WorkerProfile {
  const engagementTypes = row.engagement_types ?? [];
  return {
    id: row.id,
    userId: row.user_id,
    headline: row.headline,
    bio: row.bio,
    services: row.services ?? [],
    hireFee: hiringFeeUSD(
      engagementTypes.includes("daily") || engagementTypes.length === 0
        ? "daily"
        : "monthly",
    ),
    engagementTypes,
    expectedDailySalary: Number(row.expected_daily_salary ?? 0),
    expectedMonthlySalary: Number(row.expected_monthly_salary ?? 0),
    location: row.location,
    serviceRadiusKm: row.service_radius_km,
    yearsExperience: row.years_experience,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count,
    languages: row.languages ?? [],
    policeClearanceVerified: row.police_clearance_verified,
    backgroundCheckVerified: row.background_check_verified,
    referenceCount: row.reference_count,
    liveInAvailable: row.live_in_available,
    availableDays: row.available_days ?? [],
    skills: row.skills ?? [],
    featured: row.featured,
  };
}

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    bookingRef: row.booking_ref,
    clientId: row.client_id,
    workerId: row.worker_id,
    serviceName: row.service_name,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: row.total_days,
    engagementType: row.engagement_type ?? "monthly",
    platformBookingFee: Number(row.platform_booking_fee),
    workerExpectedDailySalary: Number(row.worker_expected_daily_salary),
    workerExpectedMonthlySalary: Number(row.worker_expected_monthly_salary ?? 0),
    totalAmount: Number(row.total_amount),
    status: row.status,
    escrowStatus: row.escrow_status,
    clientAddress: row.client_address,
    specialInstructions: row.special_instructions ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    paymentTransactionRef: row.payment_transaction_ref ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    paymentRequestId: row.payment_request_id ?? undefined,
    paymentFailureReason: row.payment_failure_reason ?? undefined,
    reservationExpiresAt: row.reservation_expires_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPayment(row: any): MpesaPayment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    clientId: row.client_id,
    amountKes: row.amount_kes,
    phoneNumber: row.phone_number,
    status: row.status,
    merchantRequestId: row.merchant_request_id ?? undefined,
    checkoutRequestId: row.checkout_request_id ?? undefined,
    mpesaReceiptNumber: row.mpesa_receipt_number ?? undefined,
    paybillNumber: row.paybill_number ?? undefined,
    accountReference: row.account_reference ?? undefined,
    resultCode: row.result_code ?? undefined,
    resultDescription: row.result_description ?? undefined,
    rawCallback: row.raw_callback ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? undefined,
  };
}

function mapReview(row: any): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientAvatar: row.client_avatar,
    workerId: row.worker_id,
    rating: row.rating,
    comment: row.comment,
    date: String(row.created_at).slice(0, 10),
  };
}

function mapAlarm(row: any): EmergencyAlarm {
  return {
    id: row.id,
    bookingId: row.booking_id ?? "general",
    bookingRef: row.booking_ref,
    raisedByUserId: row.raised_by_user_id,
    raisedByName: row.raised_by_name,
    raisedByUserRole: row.raised_by_user_role,
    alarmType: row.alarm_type,
    severity: row.severity,
    details: row.details,
    location: row.location,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

// ── Repository ──────────────────────────────────────────────────────────────

class Database {
  private async sb() {
    return createServerSupabase();
  }

  // ── Users / profiles ─────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    const { data, error } = await (await this.sb()).from("profiles").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapProfile(row as ProfileRow));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await (await this.sb())
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapProfile(data as ProfileRow);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await (await this.sb())
      .from("profiles")
      .select("*")
      .ilike("email", email.trim())
      .maybeSingle();
    if (error || !data) return undefined;
    return mapProfile(data as ProfileRow);
  }

  async countUsers(): Promise<number> {
    const { count } = await (await this.sb())
      .from("profiles")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  }

  async countAdmins(): Promise<number> {
    const { count } = await (await this.sb())
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    return count ?? 0;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.avatar !== undefined) patch.avatar = updates.avatar;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.location !== undefined) patch.location = updates.location;
    if (updates.householdSize !== undefined)
      patch.household_size = updates.householdSize;
    if (updates.householdNotes !== undefined)
      patch.household_notes = updates.householdNotes;

    if (Object.keys(patch).length === 0) {
      return (await this.getUserById(id)) ?? null;
    }

    const { data, error } = await (await this.sb())
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  // ── Worker profiles ──────────────────────────────────────────────────────

  /**
   * Public directory. RLS already hides unapproved/unverified workers; the
   * explicit filter here documents the rule and keeps local behaviour identical.
   */
  async getWorkerProfiles(
    onlyPublic = true,
  ): Promise<(WorkerProfile & { user: User })[]> {
    const { data, error } = await (await this.sb())
      .from("worker_profiles")
      .select("*, profiles:user_id (*)");

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row: any) => {
        const profile = row.profiles;
        if (!profile) return null;
        const user = mapProfile(profile as ProfileRow);
        if (onlyPublic) {
          if (
            user.idVerificationStatus !== "verified" ||
            user.accountStatus !== "approved"
          ) {
            return null;
          }
        }
        return { ...mapWorkerProfile(row), user };
      })
      .filter((row): row is WorkerProfile & { user: User } => Boolean(row));
  }

  async getWorkerProfileByUserId(
    userId: string,
  ): Promise<(WorkerProfile & { user: User }) | null> {
    const { data, error } = await (await this.sb())
      .from("worker_profiles")
      .select("*, profiles:user_id (*)")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    const row: any = data;
    if (!row.profiles) return null;
    return {
      ...mapWorkerProfile(row),
      user: mapProfile(row.profiles as ProfileRow),
    };
  }

  async updateWorkerProfile(
    userId: string,
    updates: Partial<WorkerProfile>,
  ): Promise<WorkerProfile | null> {
    const patch: Record<string, unknown> = {};
    if (updates.headline !== undefined) patch.headline = updates.headline;
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.services !== undefined) patch.services = updates.services;
    if (updates.expectedDailySalary !== undefined)
      patch.expected_daily_salary = updates.expectedDailySalary;
    if (updates.expectedMonthlySalary !== undefined)
      patch.expected_monthly_salary = updates.expectedMonthlySalary;
    if (updates.engagementTypes !== undefined)
      patch.engagement_types = updates.engagementTypes;
    if (updates.location !== undefined) patch.location = updates.location;
    if (updates.serviceRadiusKm !== undefined)
      patch.service_radius_km = updates.serviceRadiusKm;
    if (updates.yearsExperience !== undefined)
      patch.years_experience = updates.yearsExperience;
    if (updates.languages !== undefined) patch.languages = updates.languages;
    if (updates.skills !== undefined) patch.skills = updates.skills;
    if (updates.liveInAvailable !== undefined)
      patch.live_in_available = updates.liveInAvailable;
    if (updates.availableDays !== undefined)
      patch.available_days = updates.availableDays;

    const { data, error } = await (await this.sb())
      .from("worker_profiles")
      .update(patch)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapWorkerProfile(data);
  }

  // ── Bookings ─────────────────────────────────────────────────────────────

  async getBookings(): Promise<Booking[]> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBooking);
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapBooking(data);
  }

  async getBookingsForWorker(workerId: string): Promise<Booking[]> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .select("*")
      .eq("worker_id", workerId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBooking);
  }

  async getBookingsForClient(clientId: string): Promise<Booking[]> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBooking);
  }

  async isWorkerExclusivelyAvailable(
    workerId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .select("id,start_date,end_date")
      .eq("worker_id", workerId)
      .in("status", ["confirmed_exclusive", "in_progress"]);

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const overlaps = startDate <= row.end_date && endDate >= row.start_date;
      if (overlaps) return false;
    }
    return true;
  }

  async createBooking(booking: Booking): Promise<Booking> {
    const { data, error } = await (await this.sb())
      .from("bookings")
      .insert({
        booking_ref: booking.bookingRef,
        client_id: booking.clientId,
        worker_id: booking.workerId,
        service_name: booking.serviceName,
        start_date: booking.startDate,
        end_date: booking.endDate,
        total_days: booking.totalDays,
        engagement_type: booking.engagementType,
        platform_booking_fee: booking.platformBookingFee,
        worker_expected_daily_salary: booking.workerExpectedDailySalary,
        worker_expected_monthly_salary: booking.workerExpectedMonthlySalary ?? 0,
        total_amount: booking.totalAmount,
        status: booking.status,
        escrow_status: booking.escrowStatus,
        client_address: booking.clientAddress,
        special_instructions: booking.specialInstructions ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapBooking(data);
  }

  /** Used by server-side status transitions (service role bypasses RLS). */
  async updateBookingAsService(
    id: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb.from("bookings").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
  }

  // ── M-Pesa payments ──────────────────────────────────────────────────────

  async createMpesaPayment(payment: MpesaPayment): Promise<MpesaPayment> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("mpesa_payments")
      .insert({
        booking_id: payment.bookingId,
        client_id: payment.clientId,
        amount_kes: payment.amountKes,
        phone_number: payment.phoneNumber,
        status: payment.status,
        merchant_request_id: payment.merchantRequestId ?? null,
        checkout_request_id: payment.checkoutRequestId ?? null,
        paybill_number: payment.paybillNumber ?? null,
        account_reference: payment.accountReference ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapPayment(data);
  }

  async getMpesaPaymentById(id: string): Promise<MpesaPayment | undefined> {
    const { data, error } = await (await this.sb())
      .from("mpesa_payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapPayment(data);
  }

  async getMpesaPaymentByCheckoutRequestId(
    checkoutRequestId: string,
  ): Promise<MpesaPayment | undefined> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("mpesa_payments")
      .select("*")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapPayment(data);
  }

  async getPendingMpesaPaymentForBooking(
    bookingId: string,
  ): Promise<MpesaPayment | undefined> {
    const { data, error } = await (await this.sb())
      .from("mpesa_payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "pending")
      .maybeSingle();
    if (error || !data) return undefined;
    return mapPayment(data);
  }

  /**
   * Turns a provider-confirmed payment into an exclusive booking.
   *
   * Runs with the service-role client (called from the Safaricom callback,
   * which has no user session). The database trigger `prevent_double_booking`
   * independently rejects overlapping locks, so this is safe even if two
   * callbacks arrive at once.
   */
  async confirmMpesaPayment(
    paymentId: string,
    receipt: string,
    rawCallback: Record<string, unknown>,
  ): Promise<Booking | null> {
    const sb = createAdminClient();

    const { data: paymentRow, error: payErr } = await sb
      .from("mpesa_payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (payErr || !paymentRow) return null;

    const payment = mapPayment(paymentRow);

    const { data: bookingRow, error: bkgErr } = await sb
      .from("bookings")
      .select("*")
      .eq("id", payment.bookingId)
      .maybeSingle();
    if (bkgErr || !bookingRow) return null;

    const booking = mapBooking(bookingRow);

    // Idempotency: Safaricom may deliver the same callback after completion.
    if (payment.status === "paid") {
      return booking;
    }

    const now = new Date().toISOString();

    await sb
      .from("mpesa_payments")
      .update({
        status: "paid",
        mpesa_receipt_number: receipt,
        paid_at: now,
        raw_callback: rawCallback,
        result_description: "Payment confirmed by Safaricom.",
      })
      .eq("id", paymentId);

    const { data: updated, error: updErr } = await sb
      .from("bookings")
      .update({
        status: "confirmed_exclusive",
        escrow_status: "holding",
        payment_status: "paid",
        payment_method: "M-Pesa STK Push",
        payment_transaction_ref: receipt,
        paid_at: now,
        reservation_expires_at: null,
        payment_failure_reason: null,
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updErr) {
      // A unique/exclusion violation means another booking locked first; the
      // money is real, so mark it for an admin refund rather than failing it.
      await sb
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_transaction_ref: receipt,
          payment_failure_reason:
            "Worker was no longer available when the payment confirmation arrived. Refund required.",
        })
        .eq("id", booking.id);
      await sb
        .from("mpesa_payments")
        .update({
          result_description:
            "Payment received, but the worker was already locked. Refund required.",
        })
        .eq("id", paymentId);
      return null;
    }

    return mapBooking(updated);
  }

  async failMpesaPayment(
    paymentId: string,
    reason: string,
    resultCode?: number,
    rawCallback?: Record<string, unknown>,
  ): Promise<MpesaPayment | null> {
    const sb = createAdminClient();

    const { data: existing } = await sb
      .from("mpesa_payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (!existing) return null;
    if (existing.status === "paid") return mapPayment(existing); // never downgrade

    const { data, error } = await sb
      .from("mpesa_payments")
      .update({
        status: "failed",
        result_code: resultCode ?? null,
        result_description: reason,
        raw_callback: rawCallback ?? null,
      })
      .eq("id", paymentId)
      .select("*")
      .single();
    if (error || !data) return null;

    await sb
      .from("bookings")
      .update({
        payment_status: "failed",
        payment_failure_reason: reason,
        reservation_expires_at: null,
      })
      .eq("id", existing.booking_id)
      .neq("status", "confirmed_exclusive");

    return mapPayment(data);
  }

  // ── ID verification ──────────────────────────────────────────────────────

  async submitIdVerification(
    userId: string,
    idType: "national_id" | "passport" | "drivers_license",
    idNumber: string,
    idDocumentUrl: string,
    selfieUrl: string,
    idDocumentBackUrl?: string,
  ): Promise<User | null> {
    const { data, error } = await (await this.sb())
      .from("profiles")
      .update({
        id_verification_status: "pending",
        id_type: idType,
        id_number: idNumber,
        id_document_url: idDocumentUrl,
        id_document_back_url: idDocumentBackUrl ?? null,
        selfie_url: selfieUrl,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  // ── Admin review (service role) ──────────────────────────────────────────

  async reviewIdVerification(
    userId: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<User | null> {
    const sb = createAdminClient();
    const status: VerificationStatus =
      decision === "approve" ? "verified" : "rejected";

    const { data, error } = await sb
      .from("profiles")
      .update({
        id_verification_status: status,
        verified_at: decision === "approve" ? new Date().toISOString() : null,
        rejection_reason:
          decision === "reject"
            ? rejectionReason || "Document details could not be verified."
            : null,
      })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  async reviewAccount(
    userId: string,
    decision: "approve" | "reject" | "suspend",
    adminId: string,
    reason?: string,
  ): Promise<User | null> {
    const sb = createAdminClient();
    const now = new Date().toISOString();
    const status: AccountStatus =
      decision === "approve"
        ? "approved"
        : decision === "suspend"
          ? "suspended"
          : "rejected";

    const { data, error } = await sb
      .from("profiles")
      .update({
        account_status: status,
        approved_at: decision === "approve" ? now : null,
        approved_by: decision === "approve" ? adminId : null,
        account_status_reason: decision === "approve" ? null : (reason ?? null),
      })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  // ── Administrator console: every account ─────────────────────────────────

  /**
   * Every account on the platform — clients, workers and administrators alike.
   *
   * Uses the service-role client so the list stays complete even when a profile
   * is not covered by a row policy (pending or suspended rows included). Callers
   * MUST verify the caller is an administrator first and MUST strip identity
   * documents before returning the rows to a browser.
   */
  async getAllAccountsAsService(): Promise<User[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapProfile(row as ProfileRow));
  }

  /**
   * Change an account's role (promote to / demote from administrator).
   *
   * Uses the service role because the privilege-guard trigger intentionally
   * rejects role changes from a browser session. The caller is responsible for
   * authorising the change; see /api/admin/accounts.
   */
  async setUserRoleAsService(userId: string, role: UserRole): Promise<User | null> {
    const sb = createAdminClient();
    const patch: Record<string, unknown> = { role };

    // Promoting to administrator implies a usable, verified admin account.
    if (role === "admin" || role === "super_admin") {
      patch.account_status = "approved";
      patch.account_status_reason = null;
      patch.approved_at = new Date().toISOString();
    }

    const { data, error } = await sb
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  async getReviewsForWorker(workerId: string): Promise<Review[]> {
    const { data, error } = await (await this.sb())
      .from("reviews")
      .select("*")
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapReview);
  }

  // ── Incident reports ─────────────────────────────────────────────────────

  async getEmergencyAlarms(): Promise<EmergencyAlarm[]> {
    const { data, error } = await (await this.sb())
      .from("emergencies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAlarm);
  }

  async raiseEmergencyAlarm(alarmData: {
    bookingId: string;
    bookingRef: string;
    raisedByUserId: string;
    raisedByName: string;
    raisedByUserRole: "client" | "worker";
    alarmType: EmergencyAlarmType;
    severity: "critical" | "urgent";
    details: string;
    location: string;
  }): Promise<EmergencyAlarm> {
    const { data, error } = await (await this.sb())
      .from("emergencies")
      .insert({
        booking_id:
          alarmData.bookingId && alarmData.bookingId !== "general"
            ? alarmData.bookingId
            : null,
        booking_ref: alarmData.bookingRef,
        raised_by_user_id: alarmData.raisedByUserId,
        raised_by_name: alarmData.raisedByName,
        raised_by_user_role: alarmData.raisedByUserRole,
        alarm_type: alarmData.alarmType,
        severity: alarmData.severity,
        details: alarmData.details,
        location: alarmData.location,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapAlarm(data);
  }

  async updateEmergencyStatus(
    alarmId: string,
    status: "active" | "responding" | "resolved",
    adminNotes?: string,
  ): Promise<EmergencyAlarm | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("emergencies")
      .update({
        status,
        ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
      })
      .eq("id", alarmId)
      .select("*")
      .maybeSingle();
    if (error || !data) return null;
    return mapAlarm(data);
  }
}

const globalForDb = global as unknown as { dbInstance?: Database };
export const db = globalForDb.dbInstance ?? new Database();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
