import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

/**
 * Returns the currently authenticated user from the database.
 * If demoMode is enabled and no active session exists, it falls back
 * to the synthetic demo user for isolated testing and previewing.
 */
export async function getAuthenticatedUser(options?: { allowDemoFallback?: boolean }): Promise<User | null> {
  const session = await auth();

  if (session?.user?.email) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          (session.user as any).googleSubjectId
            ? { googleSubjectId: (session.user as any).googleSubjectId }
            : undefined,
          { email: session.user.email.toLowerCase().trim() },
        ].filter(Boolean) as any,
      },
      include: {
        preferences: true,
      },
    });

    if (user) {
      return user;
    }
  }

  // If allowDemoFallback is explicitly enabled, return the synthetic demo student
  if (options?.allowDemoFallback) {
    return prisma.user.findFirst({
      where: { email: "fictional.student@vitapstudent.ac.in" },
      include: {
        preferences: true,
      },
    });
  }

  return null;
}
