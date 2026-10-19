import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ALARM_TYPES = [
  "theft",
  "security",
  "abuse",
  "neglect",
  "misconduct",
];

export async function GET(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
    const alarms = await db.getEmergencyAlarms();

    if (activeUser.role === "admin") {
      return NextResponse.json({ alarms });
    }

    const relevant = alarms.filter((a) => a.raisedByUserId === activeUser.id);
    return NextResponse.json({ alarms: relevant });
  } catch (error: any) {
    return jsonError(error, "Could not load incident reports.");
  }
}

export async function POST(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { bookingId, alarmType, severity, details, location } = body;

    if (!details || !details.trim()) {
      return NextResponse.json(
        {
          error:
            "Please provide incident details describing the situation between the client and worker.",
        },
        { status: 400 },
      );
    }

    let bookingRef = "DIRECT-REPORT";
    let reportedLocation = location || activeUser.location || "Nairobi Metro";

    if (bookingId && bookingId !== "general") {
      const booking = await db.getBookingById(bookingId);
      if (booking) {
        bookingRef = booking.bookingRef;
        if (!location)
          reportedLocation = booking.clientAddress || reportedLocation;
      }
    }

    const alarm = await db.raiseEmergencyAlarm({
      bookingId: bookingId || "general",
      bookingRef,
      raisedByUserId: activeUser.id,
      raisedByName: activeUser.name,
      raisedByUserRole: activeUser.role === "worker" ? "worker" : "client",
      alarmType: ALLOWED_ALARM_TYPES.includes(alarmType)
        ? alarmType
        : "misconduct",
      severity: severity || "critical",
      details: details.trim(),
      location: reportedLocation,
    });

    return NextResponse.json({
      success: true,
      alarm,
      message:
        "INCIDENT REPORT SUBMITTED. Herlooku Trust & Safety has been notified and will review the client–worker matter with high priority.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not submit the incident report.");
  }
}

export async function PATCH(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
    if (activeUser.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Admin privileges required to update incident status.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { alarmId, status, adminNotes } = body;

    if (!alarmId || !status) {
      return NextResponse.json(
        { error: "Missing alarmId or status" },
        { status: 400 },
      );
    }

    const updated = await db.updateEmergencyStatus(alarmId, status, adminNotes);
    if (!updated) {
      return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alarm: updated,
      message: `Incident status updated to '${status}'.`,
    });
  } catch (error: any) {
    return jsonError(error, "Could not update the incident.");
  }
}
