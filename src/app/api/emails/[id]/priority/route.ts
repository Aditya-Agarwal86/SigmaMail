import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { PriorityLevel } from "@prisma/client";

/**
 * Manually update priority level of an email.
 * Marks isPriorityManual = true and preserves user Priority override.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailId = params.id;
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: user.id },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const priority = body.priority as PriorityLevel;

    if (!priority || !Object.values(PriorityLevel).includes(priority)) {
      return NextResponse.json({ error: "Invalid priority level" }, { status: 400 });
    }

    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        priorityLevel: priority,
        userPriorityOverride: priority,
        isPriorityManual: true,
      },
    });

    return NextResponse.json({
      success: true,
      email: updated,
    });
  } catch (err: any) {
    console.error(`Error updating priority for email ${emailId}:`, err);
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
  }
}
