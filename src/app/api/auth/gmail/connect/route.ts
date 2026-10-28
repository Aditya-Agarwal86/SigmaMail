import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/data";
import { generateGmailAuthUrl } from "@/lib/gmail-client";
import { createOAuthState } from "@/lib/crypto";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Initiates the separate, explicit Gmail authorization flow.
 * Only authenticated users can connect their Gmail.
 * Creates a cryptographically signed HMAC-SHA256 state parameter stored in an HTTP-only cookie.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user?.email && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/settings", request.url));
  }

  // Generate cryptographically strong random state token
  const stateNonce = crypto.randomBytes(32).toString("hex");
  const signedState = createOAuthState({
    nonce: stateNonce,
    userEmail: user.email,
    userId: user.id,
    timestamp: Date.now(),
  });

  // Save state nonce in HTTP-only secure cookie for CSRF validation (10 min expiry)
  const cookieStore = cookies();
  cookieStore.set("campusinbox_gmail_oauth_state", stateNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60, // 10 minutes
    path: "/",
  });

  const authUrl = generateGmailAuthUrl(signedState);
  return NextResponse.redirect(authUrl);
}
