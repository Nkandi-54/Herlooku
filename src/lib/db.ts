import fs from "fs";
import path from "path";
import {
  User,
  WorkerProfile,
  Booking,
  Review,
  VerificationStatus,
  EmergencyAlarm,
  EmergencyAlarmType,
  MpesaPayment,
  CONSTANT_HIRING_FEE_USD,
} from "@/types";

interface DatabaseSchema {
  users: User[];
  workerProfiles: WorkerProfile[];
  bookings: Booking[];
  reviews: Review[];
  payments: MpesaPayment[];
  emergencies: EmergencyAlarm[];
}

/**
 * The on-disk JSON store.
 *
 * IMPORTANT: this file is a single-process store intended for a small,
 * single-instance deployment. It is NOT a substitute for a managed
 * transactional database. All writes go through a synchronous read-modify-write
 * guarded by a cross-process file lock, so a Safaricom payment callback cannot
 * double-lock a worker, but you should still migrate to a real database
 * (Postgres/MySQL) before running at meaningful scale.
 *
 * The storage location is configurable so it can be pointed at a mounted
 * persistent volume in production:
 *   DATA_DIR=/var/data  (defaults to <project>/data)
 */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIR, "db.json");
const LOCK_FILE_PATH = path.join(DATA_DIR, "db.lock");

const EMPTY_STATE: DatabaseSchema = {
  users: [],
  workerProfiles: [],
  bookings: [],
  reviews: [],
  payments: [],
  emergencies: [],
};

/** Simple synchronous sleep without pulling in a dependency. */
function sleep(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Busy-wait is acceptable: writes are tiny and infrequent.
  }
}

class Database {
  private read(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf-8"));
        return {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          workerProfiles: Array.isArray(parsed.workerProfiles)
            ? parsed.workerProfiles
            : [],
          bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          emergencies: Array.isArray(parsed.emergencies)
            ? parsed.emergencies
            : [],
        };
      }
    } catch (error) {
      console.error("Could not read the database file.", error);
    }
    return { ...EMPTY_STATE };
  }

  private write(data: DatabaseSchema) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${DB_FILE_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, DB_FILE_PATH);
  }

  /**
   * Runs `mutator` while holding an exclusive cross-process lock, so two
   * requests (e.g. two Safaricom callbacks) cannot interleave a
   * read-modify-write and double-lock a worker. Returns the mutator's result.
   */
  private transaction<T>(mutator: (data: DatabaseSchema) => T): T {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const deadline = Date.now() + 10_000;
    let lockHandle: number | null = null;

    while (lockHandle === null) {
      try {
        lockHandle = fs.openSync(LOCK_FILE_PATH, "wx");
      } catch (error: any) {
        if (error?.code !== "EEXIST") throw error;
        if (Date.now() > deadline) {
          // Stale lock recovery: a crashed process should not wedge the store.
          try {
            const age = Date.now() - fs.statSync(LOCK_FILE_PATH).mtimeMs;
            if (age > 15_000) fs.unlinkSync(LOCK_FILE_PATH);
          } catch {
            /* another worker removed it first */
          }
        }
        sleep(25);
      }
    }

    try {
      const data = this.read();
      const result = mutator(data);
      this.write(data);
      return result;
    } finally {
      try {
        fs.closeSync(lockHandle);
      } catch {
        /* already closed */
      }
      try {
        fs.unlinkSync(LOCK_FILE_PATH);
      } catch {
        /* already removed */
      }
    }
  }

  // ── Users ────────────────────────────────────────────────────────────────

  getUsers(): User[] {
    return this.read().users;
  }

  getUserById(id: string): User | undefined {
    return this.read().users.find((user) => user.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    const target = email.trim().toLowerCase();
    return this.read().users.find(
      (user) => user.email?.toLowerCase() === target,
    );
  }

  countUsers(): number {
    return this.read().users.length;
  }

  countAdmins(): number {
    return this.read().users.filter((user) => user.role === "admin").length;
  }

  createUser(user: User): User {
    return this.transaction((data) => {
      data.users.push(user);
      return user;
    });
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    return this.transaction((data) => {
      const index = data.users.findIndex((user) => user.id === id);
      if (index === -1) return null;
      data.users[index] = { ...data.users[index], ...updates };
      return data.users[index];
    });
  }

  // ── Worker profiles ──────────────────────────────────────────────────────

  /**
   * Directory listing. A profile is only returned when the worker's account is
   * approved AND their ID verification has passed — unless the caller explicitly
   * asks for unverified profiles for internal/admin use.
   */
  getWorkerProfiles(
    onlyPublic: boolean = true,
  ): (WorkerProfile & { user: User })[] {
    const data = this.read();
    return data.workerProfiles
      .map((profile) => {
        const user = data.users.find(
          (candidate) => candidate.id === profile.userId,
        );
        return user ? { ...profile, user } : null;
      })
      .filter((profile): profile is WorkerProfile & { user: User } =>
        Boolean(profile),
      )
      .filter((profile) =>
        onlyPublic
          ? profile.user.idVerificationStatus === "verified" &&
            profile.user.accountStatus === "approved"
          : true,
      );
  }

  getWorkerProfileByUserId(
    userId: string,
  ): (WorkerProfile & { user: User }) | null {
    const data = this.read();
    const profile = data.workerProfiles.find(
      (candidate) => candidate.userId === userId,
    );
    if (!profile) return null;
    const user = data.users.find((candidate) => candidate.id === userId);
    if (!user) return null;
    return { ...profile, user };
  }

  updateWorkerProfile(
    userId: string,
    updates: Partial<WorkerProfile>,
  ): WorkerProfile | null {
    // The platform hiring fee is fixed and can never be set by a worker.
    const { hireFee: _ignored, ...safeUpdates } = updates;
    return this.transaction((data) => {
      const index = data.workerProfiles.findIndex(
        (profile) => profile.userId === userId,
      );
      if (index === -1) {
        const created: WorkerProfile = {
          id: "prof_" + userId,
          userId,
          headline: "Domestic Helper",
          bio: "",
          services: ["Housekeeping"],
          expectedDailySalary: 8,
          expectedMonthlySalary: 208,
          engagementTypes: ["daily", "monthly"],
          location: "Kenya",
          serviceRadiusKm: 20,
          yearsExperience: 0,
          rating: 0,
          reviewCount: 0,
          languages: ["English", "Swahili"],
          policeClearanceVerified: false,
          backgroundCheckVerified: false,
          referenceCount: 0,
          liveInAvailable: false,
          availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          skills: [],
          ...safeUpdates,
          hireFee: CONSTANT_HIRING_FEE_USD,
        };
        data.workerProfiles.push(created);
        return created;
      }
      data.workerProfiles[index] = {
        ...data.workerProfiles[index],
        ...safeUpdates,
        hireFee: CONSTANT_HIRING_FEE_USD,
      };
      return data.workerProfiles[index];
    });
  }

  // ── Bookings ─────────────────────────────────────────────────────────────

  getBookings(): Booking[] {
    return this.read().bookings;
  }

  getBookingById(id: string): Booking | undefined {
    return this.read().bookings.find((booking) => booking.id === id);
  }

  getBookingByRef(bookingRef: string): Booking | undefined {
    const target = bookingRef.trim().toUpperCase();
    return this.read().bookings.find(
      (booking) => booking.bookingRef?.toUpperCase() === target,
    );
  }

  getBookingsForWorker(workerId: string): Booking[] {
    return this.read().bookings.filter(
      (booking) =>
        booking.workerId === workerId && booking.status !== "cancelled",
    );
  }

  getBookingsForClient(clientId: string): Booking[] {
    return this.read().bookings.filter(
      (booking) => booking.clientId === clientId,
    );
  }

  isWorkerExclusivelyAvailable(
    workerId: string,
    startDate: string,
    endDate: string,
  ): boolean {
    return this.isWorkerAvailable(this.read(), workerId, startDate, endDate);
  }

  private isWorkerAvailable(
    data: DatabaseSchema,
    workerId: string,
    startDate: string,
    endDate: string,
  ): boolean {
    const toTime = (dateString: string) => {
      const [year, month, day] = dateString.split("-").map(Number);
      const value = Date.UTC(year, month - 1, day);
      return Number.isNaN(value) ? null : value;
    };

    const requestStart = toTime(startDate);
    const requestEnd = toTime(endDate);
    if (requestStart === null || requestEnd === null) return false;

    const active = data.bookings.filter(
      (booking) =>
        booking.workerId === workerId &&
        (booking.status === "confirmed_exclusive" ||
          booking.status === "in_progress"),
    );

    for (const booking of active) {
      const bookingStart = toTime(booking.startDate);
      const bookingEnd = toTime(booking.endDate);
      if (
        bookingStart !== null &&
        bookingEnd !== null &&
        requestStart <= bookingEnd &&
        requestEnd >= bookingStart
      ) {
        return false;
      }
    }
    return true;
  }

  createBooking(booking: Booking): Booking {
    return this.transaction((data) => {
      data.bookings.unshift(booking);
      return booking;
    });
  }

  updateBooking(id: string, updates: Partial<Booking>): Booking | null {
    return this.transaction((data) => {
      const index = data.bookings.findIndex((booking) => booking.id === id);
      if (index === -1) return null;
      data.bookings[index] = { ...data.bookings[index], ...updates };
      return data.bookings[index];
    });
  }

  // ── M-Pesa payments ──────────────────────────────────────────────────────

  createMpesaPayment(payment: MpesaPayment): MpesaPayment {
    return this.transaction((data) => {
      data.payments.unshift(payment);
      return payment;
    });
  }

  getMpesaPaymentById(id: string): MpesaPayment | undefined {
    return this.read().payments.find((payment) => payment.id === id);
  }

  getMpesaPaymentByCheckoutRequestId(
    checkoutRequestId: string,
  ): MpesaPayment | undefined {
    return this.read().payments.find(
      (payment) => payment.checkoutRequestId === checkoutRequestId,
    );
  }

  getMpesaPaymentsForBooking(bookingId: string): MpesaPayment[] {
    return this.read().payments.filter(
      (payment) => payment.bookingId === bookingId,
    );
  }

  getPendingMpesaPaymentForBooking(
    bookingId: string,
  ): MpesaPayment | undefined {
    return this.read().payments.find(
      (payment) =>
        payment.bookingId === bookingId && payment.status === "pending",
    );
  }

  getPaidMpesaPaymentForBooking(bookingId: string): MpesaPayment | undefined {
    return this.read().payments.find(
      (payment) => payment.bookingId === bookingId && payment.status === "paid",
    );
  }

  updateMpesaPayment(
    id: string,
    updates: Partial<MpesaPayment>,
  ): MpesaPayment | null {
    return this.transaction((data) => {
      const index = data.payments.findIndex((payment) => payment.id === id);
      if (index === -1) return null;
      data.payments[index] = {
        ...data.payments[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return data.payments[index];
    });
  }

  /**
   * The single operation that turns a provider-confirmed payment into an
   * exclusive booking. Runs in one locked transaction and is idempotent, because
   * Safaricom may deliver the same callback more than once. If the worker is no
   * longer available, the payment is retained as "paid" (not failed) so an admin
   * can refund it — the money really did leave the client's account.
   */
  confirmMpesaPayment(
    paymentId: string,
    receipt: string,
    rawCallback: Record<string, unknown>,
  ): Booking | null {
    return this.transaction((data) => {
      const payment = data.payments.find(
        (candidate) => candidate.id === paymentId,
      );
      if (!payment) return null;
      const booking = data.bookings.find(
        (candidate) => candidate.id === payment.bookingId,
      );
      if (!booking) return null;

      // Idempotency: already processed.
      if (payment.status === "paid" && booking.status === "confirmed_exclusive")
        return booking;

      const now = new Date().toISOString();
      const workerFree = this.isWorkerAvailable(
        data,
        booking.workerId,
        booking.startDate,
        booking.endDate,
      );

      if (!workerFree && booking.status !== "confirmed_exclusive") {
        payment.status = "paid";
        payment.mpesaReceiptNumber = receipt;
        payment.paidAt = now;
        payment.rawCallback = rawCallback;
        payment.resultDescription =
          "Payment received, but the worker was already locked. Refund required.";
        payment.updatedAt = now;
        booking.paymentStatus = "paid";
        booking.paymentTransactionRef = receipt;
        booking.paymentFailureReason =
          "Worker was no longer available when the payment confirmation arrived. Refund required.";
        booking.reservationExpiresAt = undefined;
        return null;
      }

      payment.status = "paid";
      payment.mpesaReceiptNumber = receipt;
      payment.paidAt = now;
      payment.rawCallback = rawCallback;
      payment.resultDescription = "Payment confirmed by Safaricom.";
      payment.updatedAt = now;

      booking.status = "confirmed_exclusive";
      booking.escrowStatus = "holding";
      booking.paymentStatus = "paid";
      booking.paymentMethod = "M-Pesa STK Push";
      booking.paymentTransactionRef = receipt;
      booking.paidAt = now;
      booking.reservationExpiresAt = undefined;
      booking.paymentFailureReason = undefined;
      return booking;
    });
  }

  failMpesaPayment(
    paymentId: string,
    reason: string,
    resultCode?: number,
    rawCallback?: Record<string, unknown>,
  ): MpesaPayment | null {
    return this.transaction((data) => {
      const payment = data.payments.find(
        (candidate) => candidate.id === paymentId,
      );
      if (!payment) return null;
      if (payment.status === "paid") return payment; // never downgrade a real payment
      payment.status = "failed";
      payment.resultCode = resultCode;
      payment.resultDescription = reason;
      payment.rawCallback = rawCallback;
      payment.updatedAt = new Date().toISOString();
      const booking = data.bookings.find(
        (candidate) => candidate.id === payment.bookingId,
      );
      if (booking && booking.status !== "confirmed_exclusive") {
        booking.paymentStatus = "failed";
        booking.paymentFailureReason = reason;
        booking.reservationExpiresAt = undefined;
      }
      return payment;
    });
  }

  // ── ID verification ──────────────────────────────────────────────────────

  submitIdVerification(
    userId: string,
    idType: "national_id" | "passport" | "drivers_license",
    idNumber: string,
    idDocumentUrl: string,
    selfieUrl: string,
    idDocumentBackUrl?: string,
  ): User | null {
    return this.updateUser(userId, {
      idVerificationStatus: "pending",
      idType,
      idNumber,
      idDocumentUrl,
      idDocumentBackUrl,
      selfieUrl,
      submittedAt: new Date().toISOString(),
      rejectionReason: undefined,
    });
  }

  reviewIdVerification(
    userId: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ): User | null {
    const status: VerificationStatus =
      decision === "approve" ? "verified" : "rejected";
    return this.updateUser(userId, {
      idVerificationStatus: status,
      verifiedAt: decision === "approve" ? new Date().toISOString() : undefined,
      rejectionReason:
        decision === "reject"
          ? rejectionReason || "Document details could not be verified."
          : undefined,
    });
  }

  // ── Account approval ─────────────────────────────────────────────────────

  /** New client/worker accounts are created pending admin approval. */
  reviewAccount(
    userId: string,
    decision: "approve" | "reject" | "suspend",
    adminId: string,
    reason?: string,
  ): User | null {
    const now = new Date().toISOString();
    const updates: Partial<User> = {
      accountStatus:
        decision === "approve"
          ? "approved"
          : decision === "suspend"
            ? "suspended"
            : "rejected",
      approvedAt: decision === "approve" ? now : undefined,
      approvedBy: decision === "approve" ? adminId : undefined,
      accountStatusReason: decision === "approve" ? undefined : reason,
    };
    const updated = this.updateUser(userId, updates);
    if (updated && decision === "approve" && updated.role === "worker") {
      this.updateWorkerProfile(userId, {
        policeClearanceVerified: true,
        backgroundCheckVerified: true,
      });
    }
    return updated;
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  getReviewsForWorker(workerId: string): Review[] {
    return this.read().reviews.filter((review) => review.workerId === workerId);
  }

  addReview(review: Review): Review {
    return this.transaction((data) => {
      data.reviews.unshift(review);
      const workerReviews = data.reviews.filter(
        (candidate) => candidate.workerId === review.workerId,
      );
      const average =
        workerReviews.reduce((sum, candidate) => sum + candidate.rating, 0) /
        (workerReviews.length || 1);
      const profileIndex = data.workerProfiles.findIndex(
        (profile) => profile.userId === review.workerId,
      );
      if (profileIndex !== -1) {
        data.workerProfiles[profileIndex] = {
          ...data.workerProfiles[profileIndex],
          rating: Number(average.toFixed(2)),
          reviewCount: workerReviews.length,
        };
      }
      return review;
    });
  }

  // ── Incident reports (Trust & Safety) ────────────────────────────────────

  getEmergencyAlarms(): EmergencyAlarm[] {
    return this.read().emergencies;
  }

  raiseEmergencyAlarm(alarmData: {
    bookingId: string;
    bookingRef: string;
    raisedByUserId: string;
    raisedByName: string;
    raisedByUserRole: "client" | "worker";
    alarmType: EmergencyAlarmType;
    severity: "critical" | "urgent";
    details: string;
    location: string;
  }): EmergencyAlarm {
    return this.transaction((data) => {
      const alarm: EmergencyAlarm = {
        id: "alm_" + crypto.randomUUID(),
        bookingId: alarmData.bookingId,
        bookingRef: alarmData.bookingRef,
        raisedByUserId: alarmData.raisedByUserId,
        raisedByName: alarmData.raisedByName,
        raisedByUserRole: alarmData.raisedByUserRole,
        alarmType: alarmData.alarmType,
        severity: alarmData.severity,
        details: alarmData.details,
        location: alarmData.location,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.emergencies.unshift(alarm);
      return alarm;
    });
  }

  updateEmergencyStatus(
    alarmId: string,
    status: "active" | "responding" | "resolved",
    adminNotes?: string,
  ): EmergencyAlarm | null {
    return this.transaction((data) => {
      const index = data.emergencies.findIndex((alarm) => alarm.id === alarmId);
      if (index === -1) return null;
      data.emergencies[index] = {
        ...data.emergencies[index],
        status,
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date().toISOString(),
      };
      return data.emergencies[index];
    });
  }
}

const globalForDb = global as unknown as { dbInstance?: Database };
export const db = globalForDb.dbInstance ?? new Database();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
