import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/env";
import { syncGoogleIdentity } from "@/lib/auth-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID || "placeholder-google-client-id",
      clientSecret: env.AUTH_GOOGLE_SECRET || "placeholder-google-client-secret",
      authorization: {
        params: {
          // STRICT Phase 3 Identity scopes only: NO Gmail scopes!
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) {
        return false;
      }

      const googleSubjectId = profile.sub;
      const email = profile.email;
      const isEmailVerified = Boolean((profile as any).email_verified ?? true);

      if (!googleSubjectId || !email) {
        return false;
      }

      // Enforce domain validation & identity sync on the server
      const syncResult = await syncGoogleIdentity({
        googleSubjectId,
        email,
        isEmailVerified,
        name: profile.name,
        image: (profile as any).picture,
      });

      if (!syncResult.success) {
        console.warn(`Sign-in rejected for ${email}: ${syncResult.error}`);
        // Redirect with AccessDenied error parameter
        return `/auth/access-denied?reason=${encodeURIComponent(syncResult.error || "Domain not allowed")}`;
      }

      return true;
    },

    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.googleSubjectId = profile.sub;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.googleSubjectId) {
        (session.user as any).googleSubjectId = token.googleSubjectId;
      }
      return session;
    },
  },
});
