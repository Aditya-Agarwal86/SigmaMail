import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { generateICalendarFeed } from "@/lib/ical-generator";
import { DeadlineStatus } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/export.ics
 * Securely exports confirmed, active academic and placement deadlines for the authenticated student.
 * Excludes candidates, dismissed, completed, and unconfirmed items.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized. Please log in to export your calendar.", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Rate Limiting: Max 20 export downloads per minute per user
  const rl = checkRateLimit(`cal_export:${user.id}`, { limit: 20, windowMs: 60 * 1000 });
  if (!rl.success) {
    return new NextResponse("Rate limit exceeded for calendar exports. Please wait a minute.", {
      status: 429,
      headers: {
        "Content-Type": "text/plain",
        "Retry-After": Math.ceil(rl.resetMs / 1000).toString(),
      },
    });
  }

  try {
    // Only fetch CONFIRMED active deadlines (not candidates, not dismissed, not completed)
    const activeDeadlines = await prisma.deadline.findMany({
      where: {
        userId: user.id, // STRICT USER ISOLATION
        isCandidate: false,
        status: DeadlineStatus.PENDING,
      },
      orderBy: { dueDate: "asc" },
      include: {
        email: {
          select: {
            id: true,
            subject: true,
          },
        },
      },
    });

    const host = request.headers.get("host") || "localhost:3001";
    const protocol = request.headers.get("x-forwarded-proto") || "http";

    const events = activeDeadlines.map((dl) => ({
      uid: dl.id,
      title: dl.title,
      description: dl.description,
      dueDate: dl.dueDate,
      category: dl.category,
      sourceEmailSubject: dl.email.subject,
      reminderMinutesBefore: dl.reminderMinutesBefore,
      url: `${protocol}://${host}/email/${dl.email.id}`,
    }));

    const icsContent = generateICalendarFeed(
      events,
      `SigmaMail Deadlines - ${user.name || user.email}`
    );

    const filename = `sigmamail-deadlines-${new Date().toISOString().slice(0, 10)}.ics`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("Failed to generate iCalendar export:", error);
    return new NextResponse("Internal server error generating calendar export.", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
