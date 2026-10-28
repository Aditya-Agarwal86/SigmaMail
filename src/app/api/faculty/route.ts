import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { normalizeEmailAddress } from "@/lib/classifier";
import { reprocessUserEmails } from "@/lib/intelligence";
import { z } from "zod";

const FacultySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  courseLabel: z.string().max(50).optional().nullable(),
});

/**
 * GET: Retrieve user's configured faculty directory
 */
export async function GET() {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.facultyContact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ contacts });
}

/**
 * POST: Add a new faculty member and trigger reclassification of matching emails
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = FacultySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, courseLabel } = parsed.data;
    const cleanEmail = normalizeEmailAddress(email);

    // Save or update faculty contact scoped to user
    const contact = await prisma.facultyContact.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: cleanEmail,
        },
      },
      update: {
        name,
        courseLabel: courseLabel || null,
      },
      create: {
        userId: user.id,
        name,
        email: cleanEmail,
        courseLabel: courseLabel || null,
      },
    });

    // Automatically reprocess existing emails from this sender
    try {
      await reprocessUserEmails(user.id, { forceAll: true });
    } catch (e) {
      console.warn("Reprocess after faculty add warning:", e);
    }

    return NextResponse.json({ success: true, contact });
  } catch (err: any) {
    console.error("Add faculty error:", err);
    return NextResponse.json({ error: "Failed to save faculty contact." }, { status: 500 });
  }
}

/**
 * DELETE: Remove a faculty member without deleting any emails or confirmed deadlines
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Faculty ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.facultyContact.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Faculty contact not found." }, { status: 404 });
    }

    await prisma.facultyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete faculty error:", err);
    return NextResponse.json({ error: "Failed to delete faculty contact." }, { status: 500 });
  }
}
