import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/data";
import { getGmailOAuthClient } from "@/lib/gmail-client";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken, verifyOAuthState } from "@/lib/crypto";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { SyncStatus } from "@prisma/client";

/**
 * Handles the OAuth redirect from Google for the separate Gmail authorization flow.
 * Validates CSRF state, exchanges authorization code for tokens, encrypts tokens at rest,
 * and verifies that the authorized Gmail address strictly matches the logged-in college student.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL("/settings", request.url);

  // 1. Handle user cancellation or OAuth error
  if (error) {
    console.warn("Gmail OAuth error returned from Google:", error);
    baseUrl.searchParams.set("error", `Gmail authorization was not completed (${error}).`);
    return NextResponse.redirect(baseUrl);
  }

  if (!code || !state) {
    baseUrl.searchParams.set("error", "Missing authorization code or state token.");
    return NextResponse.redirect(baseUrl);
  }

  // 2. Validate Session
  const currentUser = await getCurrentUser();
  const sessionEmail = session?.user?.email || currentUser?.email;
  if (!sessionEmail || !currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. CSRF & State Validation via cryptographic HMAC
  const cookieStore = cookies();
  const savedNonce = cookieStore.get("campusinbox_gmail_oauth_state")?.value;
  cookieStore.delete("campusinbox_gmail_oauth_state");

  const stateVerification = verifyOAuthState(state, 10 * 60 * 1000);
  if (!stateVerification.valid || !stateVerification.payload) {
    baseUrl.searchParams.set(
      "error",
      `OAuth state validation failed: ${stateVerification.error || "Tampered or expired state."}`
    );
    return NextResponse.redirect(baseUrl);
  }

  const { payload } = stateVerification;

  // Verify nonce matches session-bound cookie
  if (!savedNonce || savedNonce !== payload.nonce) {
    baseUrl.searchParams.set("error", "OAuth state mismatch. Request may have expired or been replayed.");
    return NextResponse.redirect(baseUrl);
  }

  // Verify user binding: Ensure OAuth callback strictly belongs to the currently logged-in user
  if (
    payload.userEmail.toLowerCase().trim() !== sessionEmail.toLowerCase().trim() ||
    payload.userId !== currentUser.id
  ) {
    console.error(
      `Cross-user OAuth hijacking attempt detected! Session: ${sessionEmail} (${currentUser.id}), State token: ${payload.userEmail} (${payload.userId})`
    );
    baseUrl.searchParams.set("error", "Security violation: OAuth authorization attempt belongs to another session.");
    return NextResponse.redirect(baseUrl);
  }

  try {
    // 4. Exchange Auth Code for Tokens
    const oauth2Client = getGmailOAuthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;

    if (!tokens.access_token) {
      baseUrl.searchParams.set("error", "No access token was granted by Google.");
      return NextResponse.redirect(baseUrl);
    }

    // 5. Query Google Userinfo to verify the authorized Gmail address
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userinfo = await oauth2.userinfo.get();
    const authorizedEmail = userinfo.data.email?.toLowerCase().trim();

    const loggedInEmail = sessionEmail.toLowerCase().trim();

    // Strict Account Mismatch Check
    if (!authorizedEmail || authorizedEmail !== loggedInEmail) {
      console.warn(`Account mismatch: logged in as ${loggedInEmail}, attempted Gmail connect with ${authorizedEmail}`);
      baseUrl.searchParams.set(
        "error",
        `Account Mismatch: You must authorize the same university account (${loggedInEmail}). Connected account was ${authorizedEmail}.`
      );
      return NextResponse.redirect(baseUrl);
    }

    // 6. Find user in database
    const user = await prisma.user.findFirst({
      where: { email: loggedInEmail },
      include: { gmailCredential: true },
    });

    if (!user) {
      baseUrl.searchParams.set("error", "User account not found.");
      return NextResponse.redirect(baseUrl);
    }

    // 7. Check for refresh token (Google only sends refresh_token on initial consent)
    let finalRefreshToken = tokens.refresh_token;

    if (!finalRefreshToken && user.gmailCredential) {
      // Reauthorization without prompt=consent might omit refresh token; preserve existing encrypted refresh token
      finalRefreshToken = decryptToken({
        ciphertext: user.gmailCredential.encryptedRefreshToken,
        iv: user.gmailCredential.tokenIv,
        tag: user.gmailCredential.tokenTag,
      });
    }

    if (!finalRefreshToken) {
      baseUrl.searchParams.set(
        "error",
        "Google did not provide a refresh token. Please revoke access in Google Security settings and try again."
      );
      return NextResponse.redirect(baseUrl);
    }

    // 8. Encrypt tokens using AES-256-GCM before database write
    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = encryptToken(finalRefreshToken);

    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);
    const grantedScope = tokens.scope || "https://www.googleapis.com/auth/gmail.readonly";

    // 9. Persist encrypted credentials with separate IV and Tag for both access and refresh tokens
    await prisma.gmailCredential.upsert({
      where: { userId: user.id },
      update: {
        gmailAddress: authorizedEmail,
        encryptedAccessToken: encryptedAccess.ciphertext,
        encryptedRefreshToken: encryptedRefresh.ciphertext,
        tokenIv: encryptedRefresh.iv, // Refresh token IV
        tokenTag: encryptedRefresh.tag, // Refresh token Tag
        accessTokenIv: encryptedAccess.iv, // Access token IV
        accessTokenTag: encryptedAccess.tag, // Access token Tag
        scope: grantedScope,
        expiresAt,
        syncStatus: SyncStatus.IDLE,
        syncError: null,
      },
      create: {
        userId: user.id,
        gmailAddress: authorizedEmail,
        encryptedAccessToken: encryptedAccess.ciphertext,
        encryptedRefreshToken: encryptedRefresh.ciphertext,
        tokenIv: encryptedRefresh.iv,
        tokenTag: encryptedRefresh.tag,
        accessTokenIv: encryptedAccess.iv,
        accessTokenTag: encryptedAccess.tag,
        scope: grantedScope,
        expiresAt,
        syncStatus: SyncStatus.IDLE,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "GMAIL_CONNECTED",
        userAgent: "CampusInbox OAuth Callback",
      },
    });

    baseUrl.searchParams.set("connected", "true");
    return NextResponse.redirect(baseUrl);
  } catch (err: any) {
    console.error("Error exchanging Gmail OAuth tokens:", err);
    baseUrl.searchParams.set("error", "Failed to complete Gmail authorization.");
    return NextResponse.redirect(baseUrl);
  }
}
