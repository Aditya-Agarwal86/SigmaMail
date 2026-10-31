import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";

/**
 * Toggle or explicitly set the isImportant flag on an email.
 * Marks isPriorityManual = true so automated reclassification will preserve the user's manual preference.
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
    const body = await request.json().catch(() => ({}));
    const newImportantState = typeof body.isImportant === "boolean" ? body.isImportant : !email.isImportant;

    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        isImportant: newImportantState,
        isPriorityManual: true,
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      isImportant: updated.isImportant,
    });
  } catch (err: any) {
    console.error(`Error updating important flag for email ${emailId}:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
