import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Purges synchronized local emails, deadlines, and opportunity records for the authenticated user.
 * Strictly preserves user identity, auth credentials, and audit trail.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prevent accidental demo user clearing if needed, or allow clearing demo data
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: "Confirmation required to purge synchronized mailbox data." },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Delete in sequence to respect foreign keys (cascade handles most, but explicit is safest)
    const [deletedDeadlines, deletedLabels, deletedEmails, deletedOpps] = await prisma.$transaction([
      prisma.deadline.deleteMany({ where: { userId } }),
      prisma.emailLabel.deleteMany({ where: { email: { userId } } }),
      prisma.email.deleteMany({ where: { userId } }),
      prisma.placementOpportunity.deleteMany({ where: { userId } }),
    ]);

    // Record audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: "MAILBOX_PURGED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Synchronized email data and associated deadlines purged successfully.",
      counts: {
        emails: deletedEmails.count,
        deadlines: deletedDeadlines.count,
        opportunities: deletedOpps.count,
      },
    });
  } catch (err: any) {
    console.error("Purge API error:", err);
    return NextResponse.json(
      { error: "Failed to purge student data: " + (err.message || "") },
      { status: 500 }
    );
  }
}
