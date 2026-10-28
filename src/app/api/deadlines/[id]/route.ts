import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { DeadlineStatus } from "@prisma/client";

/**
 * Handles confirmation, dismissal, or completion of a deadline candidate.
 * Strictly scoped to the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deadlineId = params.id;
  const existing = await prisma.deadline.findFirst({
    where: {
      id: deadlineId,
      userId: user.id, // STRICT USER ISOLATION
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updateData: any = {};

    if (body.action === "CONFIRM") {
      updateData.isCandidate = false;
      updateData.status = DeadlineStatus.PENDING;
    } else if (body.action === "DISMISS") {
      updateData.status = DeadlineStatus.DISMISSED;
    } else if (body.action === "COMPLETE") {
      updateData.status = DeadlineStatus.COMPLETED;
    } else if (body.action === "REACTIVATE") {
      updateData.status = DeadlineStatus.PENDING;
      updateData.isCandidate = false;
    } else if (body.action === "ARCHIVE") {
      // Archive candidate or deadline reversibly
      updateData.status = DeadlineStatus.DISMISSED;
    } else if (body.action === "RESTORE") {
      // Restore archived candidate back to pending candidate
      updateData.status = DeadlineStatus.PENDING;
      updateData.isCandidate = true;
    }

    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (!isNaN(parsed.getTime())) {
        updateData.dueDate = parsed;
      }
    }

    if (body.title && typeof body.title === "string") {
      updateData.title = body.title.trim();
    }

    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    }

    if (body.reminderMinutesBefore !== undefined) {
      if (body.reminderMinutesBefore === null || body.reminderMinutesBefore === 0) {
        updateData.reminderMinutesBefore = null;
      } else {
        const mins = parseInt(body.reminderMinutesBefore, 10);
        if (!isNaN(mins) && mins >= 0) {
          updateData.reminderMinutesBefore = mins;
        }
      }
    }

    const updated = await prisma.deadline.update({
      where: { id: deadlineId },
      data: updateData,
    });

    return NextResponse.json({ success: true, deadline: updated });
  } catch (err: any) {
    console.error("Deadline action error:", err);
    return NextResponse.json({ error: "Failed to update deadline" }, { status: 500 });
  }
}
