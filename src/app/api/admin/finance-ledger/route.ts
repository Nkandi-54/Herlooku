import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CATEGORY_SUGGESTIONS = [
  "M-Pesa (off-platform)",
  "Cash",
  "Bank transfer",
  "Worker payout",
  "Refund",
  "Product purchase reimbursement",
  "Other",
];

/** GET /api/admin/finance-ledger — admin-only ledger listing. */
export async function GET(req: Request) {
  try {
    await requireAdminUser(req);
    const entries = await db.getFinanceLedger();
    const income = entries
      .filter((e) => e.entryType === "income")
      .reduce((sum, e) => sum + e.amountKes, 0);
    const expenses = entries
      .filter((e) => e.entryType === "expense")
      .reduce((sum, e) => sum + e.amountKes, 0);
    return NextResponse.json({
      entries,
      categories: CATEGORY_SUGGESTIONS,
      totals: { income, expenses, net: income - expenses },
    });
  } catch (error: any) {
    return jsonError(error, "Could not load the finance ledger.");
  }
}

/**
 * POST /api/admin/finance-ledger
 *
 * Records a transaction settled outside the website: cash handed over, a
 * direct M-Pesa transfer, a bank payment, etc. Only administrators may write,
 * and every entry stores who recorded it.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json().catch(() => null);

    const entryType = body?.entryType;
    const category =
      typeof body?.category === "string" ? body.category.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const amount = Number(body?.amountKes);
    const occurredOn =
      typeof body?.occurredOn === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.occurredOn)
        ? body.occurredOn
        : new Date().toISOString().slice(0, 10);
    const transactionRef =
      typeof body?.transactionRef === "string" && body.transactionRef.trim()
        ? body.transactionRef.trim().slice(0, 120)
        : undefined;
    const bookingRef =
      typeof body?.bookingRef === "string" && body.bookingRef.trim()
        ? body.bookingRef.trim().slice(0, 40)
        : undefined;

    if (
      (entryType !== "income" && entryType !== "expense") ||
      !category ||
      category.length > 80 ||
      !description ||
      description.length > 500 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10_000_000
    ) {
      return NextResponse.json(
        {
          error:
            "Provide a type (income|expense), category, description, and a positive amount.",
        },
        { status: 400 },
      );
    }

    await db.createFinanceLedgerEntryAsService({
      entryType,
      category,
      description,
      amountKes: Math.round(amount * 100) / 100,
      occurredOn,
      transactionRef,
      bookingRef,
      recordedBy: admin.id,
    });

    return NextResponse.json({
      success: true,
      message: "Ledger entry recorded.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not record the ledger entry.");
  }
}

/** DELETE /api/admin/finance-ledger?id=… — remove a mistakenly added entry. */
export async function DELETE(req: Request) {
  try {
    await requireAdminUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Provide the entry id." },
        { status: 400 },
      );
    }
    await db.deleteFinanceLedgerEntryAsService(id);
    return NextResponse.json({ success: true, message: "Entry removed." });
  } catch (error: any) {
    return jsonError(error, "Could not remove the ledger entry.");
  }
}
