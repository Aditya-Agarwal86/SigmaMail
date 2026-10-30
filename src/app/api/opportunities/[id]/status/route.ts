import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { StudentApplicationStatus } from "@prisma/client";

/**
 * Update personal student application status for a tracked placement opportunity.
 * Scoped strictly to the authenticated student user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oppId = params.id;
  const opp = await prisma.placementOpportunity.findFirst({
    where: { id: oppId, userId: user.id },
  });

  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status, notes } = body;

    if (status && !Object.values(StudentApplicationStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid student status" }, { status: 400 });
    }

    const updated = await prisma.placementOpportunity.update({
      where: { id: opp.id },
      data: {
        studentStatus: status !== undefined ? status : undefined,
        studentNotes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      opportunity: updated,
    });
  } catch (err: any) {
    console.error(`Error updating opportunity status for ${oppId}:`, err);
    return NextResponse.json(
      { error: "Failed to update placement status" },
      { status: 500 }
    );
  }
}
