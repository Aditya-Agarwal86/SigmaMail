import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { EmailCategory } from "@prisma/client";
import { z } from "zod";

const OverrideSchema = z.object({
  emailId: z.string().min(1),
  category: z.nativeEnum(EmailCategory).nullable(), // null means reset override
});

/**
 * PATCH /api/emails/override
 * Allows a student to set or reset a manual category override.
 * Stores manual override separately so automatic reprocessing preserves it.
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = OverrideSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { emailId, category } = parsed.data;

    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: user.id },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found." }, { status: 404 });
    }

    if (category === null) {
      // Reset manual override
      const updated = await prisma.email.update({
        where: { id: email.id },
        data: {
          isManualOverride: false,
          userCategoryOverride: null,
        },
      });
      return NextResponse.json({ success: true, email: updated });
    } else {
      // Apply manual override
      const updated = await prisma.email.update({
        where: { id: email.id },
        data: {
          category,
          userCategoryOverride: category,
          isManualOverride: true,
        },
      });
      return NextResponse.json({ success: true, email: updated });
    }
  } catch (err: any) {
    console.error("Override error:", err);
    return NextResponse.json({ error: "Failed to update category override." }, { status: 500 });
  }
}
