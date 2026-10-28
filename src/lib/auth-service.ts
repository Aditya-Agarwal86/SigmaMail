import { prisma } from "@/lib/prisma";
import { verifyCollegeEmail } from "@/lib/env";
import { User } from "@prisma/client";

export interface SyncGoogleIdentityParams {
  googleSubjectId: string; // The stable 'sub' claim from Google OAuth
  email: string;
  isEmailVerified?: boolean;
  name?: string | null;
  image?: string | null;
}

export interface SyncGoogleIdentityResult {
  success: boolean;
  user?: User;
  error?: string;
  code?: "DOMAIN_DENIED" | "UNVERIFIED_EMAIL" | "IDENTITY_MISMATCH" | "INTERNAL_ERROR";
}

/**
 * Maps a verified Google OAuth identity to an internal User record.
 * 
 * Invariants:
 * 1. Checks that Google verified the email.
 * 2. Enforces exact college domain (@vitapstudent.ac.in).
 * 3. Uses googleSubjectId ('sub') as the external identity key.
 * 4. Never silently links a new Google 'sub' to an existing user with differing sub.
 * 5. Safely creates or updates the user profile under concurrent requests.
 */
export async function syncGoogleIdentity(
  params: SyncGoogleIdentityParams
): Promise<SyncGoogleIdentityResult> {
  const { googleSubjectId, email, isEmailVerified = true, name, image } = params;

  if (!googleSubjectId || typeof googleSubjectId !== "string") {
    return {
      success: false,
      code: "IDENTITY_MISMATCH",
      error: "Missing Google subject identifier (sub claim).",
    };
  }

  // 1. Validate email domain and verification status
  const verification = verifyCollegeEmail(email, isEmailVerified);
  if (!verification.isValid || !verification.normalizedEmail) {
    return {
      success: false,
      code: isEmailVerified ? "DOMAIN_DENIED" : "UNVERIFIED_EMAIL",
      error: verification.reason || "Unauthorized email domain.",
    };
  }

  const normalizedEmail = verification.normalizedEmail;

  try {
    // 2. Query for existing user by stable googleSubjectId first
    let user = await prisma.user.findUnique({
      where: { googleSubjectId },
    });

    if (user) {
      // User found by stable sub: update profile details if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          image: image || user.image,
          email: normalizedEmail,
          emailVerified: new Date(),
        },
      });
      return { success: true, user };
    }

    // 3. Check if an account already exists with this email address
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmailUser) {
      // If the existing user has a DIFFERENT googleSubjectId already set, reject linking!
      if (
        existingEmailUser.googleSubjectId &&
        existingEmailUser.googleSubjectId !== googleSubjectId
      ) {
        console.error(
          `Security Alert: Account conflict for ${normalizedEmail}. Existing sub=${existingEmailUser.googleSubjectId}, attempted sub=${googleSubjectId}`
        );
        return {
          success: false,
          code: "IDENTITY_MISMATCH",
          error: "An account with this email is already linked to a different Google identity.",
        };
      }

      // If the existing user has no sub (e.g. created via seed/invite), link it safely:
      user = await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          googleSubjectId,
          name: name || existingEmailUser.name,
          image: image || existingEmailUser.image,
          emailVerified: new Date(),
        },
      });
      return { success: true, user };
    }

    // 4. Create new User with default user preferences
    user = await prisma.user.create({
      data: {
        googleSubjectId,
        email: normalizedEmail,
        name: name || "Student",
        image,
        emailVerified: new Date(),
        preferences: {
          create: {
            aiSummariesEnabled: true,
            aiDeadlineExtraction: true,
            allowedAiProviders: "gemini",
            autoArchiveRead: false,
            retentionDays: 90,
            notifyDeadlines: true,
          },
        },
      },
    });

    return { success: true, user };
  } catch (err: any) {
    console.error("Error in syncGoogleIdentity:", err);
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to synchronize user identity.",
    };
  }
}
