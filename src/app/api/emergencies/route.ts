import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Emergency alarms on Herlooku Task Ninja are strictly limited to matters between a
// client and their househelp (worker). General civic emergencies such as
// burglary, fire, or medical crises are out of scope and must be directed
// to the relevant local emergency services instead.
const ALLOWED_ALARM_TYPES = ["theft", "security", "abuse", "neglect", "misconduct"];

export async function GET(req: Request) {
  let activeUser;
  try { activeUser = requireAuthenticatedUser(req); } catch { return NextResponse.json({ error: "Sign in required." }, { status: 401 }); }
  const alarms = db.getEmergencyAlarms();

  // If admin, return all alarms
  if (activeUser.role === "admin") {
    return NextResponse.json({ alarms });
  }

  // If client or worker, return alarms relevant to them or their bookings
  const userAlarms = alarms.filter(
    (a) => a.raisedByUserId === activeUser.id || db.getBookingById(a.bookingId)?.workerId === activeUser.id || db.getBookingById(a.bookingId)?.clientId === activeUser.id
  );

  return NextResponse.json({ alarms: userAlarms });
}

export async function POST(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    const body = await req.json();
    const { bookingId, alarmType, severity, details, location } = body;

    if (!details || !details.trim()) {
      return NextResponse.json(
        { error: "Please provide incident details describing the situation between the client and worker." },
        { status: 400 }
      );
    }

    let bookingRef = "DIRECT-REPORT";
    let reportedLocation = location || activeUser.location || "Nairobi Metro";

    if (bookingId) {
      const booking = db.getBookingById(bookingId);
      if (booking) {
        bookingRef = booking.bookingRef;
        if (!location) {
          reportedLocation = booking.clientAddress || reportedLocation;
        }
      }
    }

    const alarm = db.raiseEmergencyAlarm({
      bookingId: bookingId || "general",
      bookingRef,
      raisedByUserId: activeUser.id,
      raisedByName: activeUser.name,
      raisedByUserRole: activeUser.role === "worker" ? "worker" : "client",
      alarmType: ALLOWED_ALARM_TYPES.includes(alarmType) ? alarmType : "misconduct",
      severity: severity || "critical",
      details: details.trim(),
      location: reportedLocation,
    });

    return NextResponse.json({
      success: true,
      alarm,
      message: "🚨 INCIDENT REPORT SUBMITTED. Herlooku Task Ninja Trust & Safety Command has been notified and will review the client–worker matter with high priority.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    if (activeUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required to update incident status." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { alarmId, status, adminNotes } = body;

    if (!alarmId || !status) {
      return NextResponse.json(
        { error: "Missing alarmId or status" },
        { status: 400 }
      );
    }

    const updated = db.updateEmergencyStatus(alarmId, status, adminNotes);
    if (!updated) {
      return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alarm: updated,
      message: `Incident status updated to '${status}'.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

