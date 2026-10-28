import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await auth();

  // If already authenticated, redirect to home/callback
  if (session?.user) {
    redirect(searchParams.callbackUrl || "/");
  }

  return (
    <div className="min-h-screen w-full bg-[#F7F8F4] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-[#244A3A] mx-auto flex items-center justify-center text-white shadow-card">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#252923]">
            SigmaMail
          </h1>
          <p className="text-sm font-medium text-[#697168]">
            Your campus inbox, under control.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E1E5DC] shadow-card p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-bold text-[#252923]">
              Student Sign-In
            </h2>
            <p className="text-xs text-[#697168] leading-relaxed">
              Sign in with your official university Google account to access your categorized inbox and deadlines.
            </p>
          </div>

          {searchParams.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Authentication failed: {searchParams.error}</span>
            </div>
          )}

          {/* Domain Notice Badge */}
          <div className="p-3.5 rounded-xl bg-[#E5EBE1] border border-[#D3DCD0] space-y-1.5">
            <div className="flex items-center gap-2 text-[#244A3A] font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-[#244A3A] shrink-0" />
              <span>Domain Verification Enforced</span>
            </div>
            <p className="text-[12px] text-[#244A3A] leading-relaxed">
              Only verified university emails ending in{" "}
              <code className="font-bold font-mono">@vitapstudent.ac.in</code> are
              eligible to sign in. Personal Gmail or external accounts are strictly denied.
            </p>
          </div>

          {/* Google Sign-in Form */}
          <form
            action={async () => {
              "use server";
              const { signIn } = await import("@/auth");
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              className="w-full h-11 bg-white hover:bg-[#F7F8F4] text-[#252923] border border-[#E1E5DC] shadow-xs font-semibold text-sm flex items-center justify-center gap-3"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>
          </form>

          {/* Mailbox Scope Disclaimer */}
          <div className="pt-2 border-t border-[#E1E5DC] text-center">
            <p className="text-[11px] text-[#697168] leading-snug">
              Signing in only verifies your university student identity. Gmail mailbox synchronization is a separate,
              explicit opt-in authorization step.
            </p>
          </div>
        </div>

        {/* Demo Mode Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#697168] hover:text-[#244A3A] transition-colors"
          >
            <span>Explore synthetic offline demo</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
