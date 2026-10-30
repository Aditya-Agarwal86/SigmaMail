import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { processEmailIntelligence } from "@/lib/intelligence";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Re-classifies a specific single email on demand.
 * Verifies authenticated user ownership, respects manual locks unless forceOverwrite is specified.
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
    where: {
      id: emailId,
      userId: user.id, // Strict tenant isolation
    },
    include: {
      deadlines: true,
    },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Rate Limiting: Max 20 re-classifications per minute per user
  const rl = checkRateLimit(`reclassify:${user.id}`, { limit: 20, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait a moment before re-classifying again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const forceOverwrite = Boolean(body.forceOverwrite);

    // If email is manually locked by student and forceOverwrite is not confirmed, warn client
    if (email.isManualOverride && !forceOverwrite) {
      return NextResponse.json({
        locked: true,
        message: "This email category was manually set by you. Please confirm to overwrite your manual lock.",
      });
    }

    // If forceOverwrite is confirmed on a manually overridden email, clear manual override
    if (email.isManualOverride && forceOverwrite) {
      await prisma.email.update({
        where: { id: email.id },
        data: {
          isManualOverride: false,
          userCategoryOverride: null,
          isPriorityManual: false,
          userPriorityOverride: null,
        },
      });
    }

    // Re-run intelligence pipeline (category, subcategory, faculty, priority, deadlines, opportunity)
    const result = await processEmailIntelligence(email.id);

    // Fetch updated email for immediate UI update
    const updatedEmail = await prisma.email.findUnique({
      where: { id: email.id },
      include: {
        deadlines: true,
        opportunity: true,
      },
    });

    return NextResponse.json({
      success: result.success,
      email: updatedEmail,
      result,
    });
  } catch (err: any) {
    console.error(`Error reclassifying email ${emailId}:`, err);
    return NextResponse.json(
      { error: "Failed to re-classify email. " + (err.message || "") },
      { status: 500 }
    );
  }
}
