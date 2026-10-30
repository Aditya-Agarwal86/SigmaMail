import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedGmailClient } from "@/lib/gmail-client";

/**
 * Serves an email inline image (CID) or attachment securely by authenticating the student
 * and streaming from Gmail API with tenant-isolated checks.
 *
 * Route: /api/emails/[id]/attachment/[attachmentId]
 * Query params: ?mimeType=image/png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: emailId, attachmentId } = params;

  // Verify email belongs to this authenticated user
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      userId: user.id,
    },
    select: {
      id: true,
      gmailMessageId: true,
      userId: true,
    },
  });

  if (!email) {
    return new NextResponse("Email not found", { status: 404 });
  }

  try {
    const { gmail } = await getAuthenticatedGmailClient(email.userId);

    const attachmentRes = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: email.gmailMessageId,
      id: attachmentId,
    });

    const rawData = attachmentRes.data.data;
    if (!rawData) {
      return new NextResponse("Attachment data not available", { status: 404 });
    }

    // Decode base64url to binary buffer
    const base64 = rawData.replace(/-/g, "+").replace(/_/g, "/");
    const binaryBuffer = Buffer.from(base64, "base64");

    const mimeType = request.nextUrl.searchParams.get("mimeType") || "image/png";

    return new NextResponse(binaryBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": binaryBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error(`[Attachment Route] Failed to fetch attachment ${attachmentId}:`, error);
    return new NextResponse("Failed to retrieve attachment from Gmail", { status: 502 });
  }
}
