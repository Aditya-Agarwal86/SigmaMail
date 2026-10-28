import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { reprocessUserEmails } from "@/lib/intelligence";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Triggers batch reprocessing and categorization of existing stored emails.
 * Scoped strictly to the authenticated user.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiting: Max 5 reprocess invocations per minute
  const rl = checkRateLimit(`reprocess:${user.id}`, { limit: 5, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Reprocessing rate limit reached. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rl.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const forceAll = Boolean(body.forceAll);
    const limit = typeof body.limit === "number" ? body.limit : (forceAll ? 1000 : 50);

    const summary = await reprocessUserEmails(user.id, { limit, forceAll });

    return NextResponse.json({
      success: true,
      processed: summary.processed,
      skipped: summary.skipped,
      failed: summary.failed,
      resultsCount: summary.results.length,
    });
  } catch (err: any) {
    console.error("Reprocess API error:", err);
    return NextResponse.json(
      { error: "Internal server error during email reprocessing." },
      { status: 500 }
    );
  }
}
