import { google } from "googleapis";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { SyncStatus } from "@prisma/client";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Returns a configured OAuth2 client instance for the separate Gmail authorization flow.
 */
export function getGmailOAuthClient() {
  const clientId = env.GMAIL_CLIENT_ID || env.AUTH_GOOGLE_ID;
  const clientSecret = env.GMAIL_CLIENT_SECRET || env.AUTH_GOOGLE_SECRET;
  const redirectUri = env.GMAIL_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be configured.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const getOAuth2Client = getGmailOAuthClient;

/**
 * Generates the Google authorization URL for read-only Gmail access.
 * Enforces prompt=consent and access_type=offline to ensure a refresh token is returned.
 */
export function generateGmailAuthUrl(state: string): string {
  const oauth2Client = getGmailOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      GMAIL_READONLY_SCOPE,
    ],
    state,
  });
}

/**
 * Retrieves valid Google OAuth2 credentials for a user, automatically refreshing
 * the access token via the stored AES-256-GCM encrypted refresh token if expired.
 */
export async function getAuthenticatedGmailClient(userId: string) {
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    throw new Error("No Gmail credential found for this user.");
  }

  if (credential.syncStatus === SyncStatus.REVOKED) {
    throw new Error("Gmail access has been revoked by user or provider.");
  }

  const oauth2Client = getGmailOAuthClient();

  // Decrypt stored refresh token
  const refreshToken = decryptToken({
    ciphertext: credential.encryptedRefreshToken,
    iv: credential.tokenIv,
    tag: credential.tokenTag,
  });

  // Decrypt stored access token using its dedicated IV/Tag, or fallback to refreshing via refresh token if mismatched
  let accessToken: string | undefined = undefined;
  if (credential.encryptedAccessToken) {
    try {
      accessToken = decryptToken({
        ciphertext: credential.encryptedAccessToken,
        iv: credential.accessTokenIv || credential.tokenIv,
        tag: credential.accessTokenTag || credential.tokenTag,
      });
    } catch {
      // If access token cannot be decrypted (e.g. historical IV mismatch), allow refresh via refresh token
      accessToken = undefined;
    }
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken,
    expiry_date: credential.expiresAt.getTime(),
  });

  // Check if access token is missing, expired, or expires within 5 minutes
  const isExpired = !accessToken || (credential.expiresAt.getTime() - Date.now() < 5 * 60 * 1000);

  if (isExpired && refreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newCredentials = refreshed.credentials;

      if (newCredentials.access_token) {
        const encryptedNewAccess = encryptToken(newCredentials.access_token);
        await prisma.gmailCredential.update({
          where: { userId },
          data: {
            encryptedAccessToken: encryptedNewAccess.ciphertext,
            accessTokenIv: encryptedNewAccess.iv,
            accessTokenTag: encryptedNewAccess.tag,
            expiresAt: new Date(newCredentials.expiry_date || Date.now() + 3600 * 1000),
          },
        });
        oauth2Client.setCredentials(newCredentials);
      }
    } catch (refreshErr: any) {
      if (refreshErr.message?.includes("invalid_grant")) {
        await prisma.gmailCredential.update({
          where: { userId },
          data: {
            syncStatus: SyncStatus.REVOKED,
            syncError: "Gmail authorization was revoked or expired. Please reconnect.",
          },
        });
        throw new Error("GMAIL_AUTHORIZATION_REVOKED");
      }
      throw refreshErr;
    }
  }

  return {
    oauth2Client,
    credential,
    gmail: google.gmail({ version: "v1", auth: oauth2Client }),
  };
}

/**
 * Revokes Google OAuth tokens and cleans up stored credentials.
 */
export async function revokeAndDisconnectGmail(userId: string): Promise<boolean> {
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId },
  });

  if (!credential) return true;

  try {
    const refreshToken = decryptToken({
      ciphertext: credential.encryptedRefreshToken,
      iv: credential.tokenIv,
      tag: credential.tokenTag,
    });

    const oauth2Client = getGmailOAuthClient();
    await oauth2Client.revokeToken(refreshToken);
  } catch (err) {
    // If token was already revoked on Google's side, proceed with local cleanup
    console.warn("Notice: Token revocation at Google endpoint warning/ignored:", err);
  }

  // Delete credential record safely
  await prisma.gmailCredential.delete({
    where: { userId },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "GMAIL_DISCONNECTED",
      userAgent: "CampusInbox Server",
    },
  });

  return true;
}
