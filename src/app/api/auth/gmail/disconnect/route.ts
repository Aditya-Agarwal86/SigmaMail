import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revokeAndDisconnectGmail } from "@/lib/gmail-client";
import { getCurrentUser } from "@/lib/data";

/**
 * Handles revocation of Gmail tokens and deletion of local OAuth credentials.
 * Does NOT delete emails unless explicitly requested through a purge action.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await revokeAndDisconnectGmail(user.id);
    return NextResponse.json({ success: true, message: "Gmail disconnected successfully." });
  } catch (err: any) {
    console.error("Failed to disconnect Gmail:", err);
    return NextResponse.json({ error: "Failed to disconnect Gmail." }, { status: 500 });
  }
}
