import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center dark:bg-amber-950/60 dark:text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight dark:text-white">
            Authentication Notice
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            An issue occurred during Google OAuth identity verification.
          </p>
        </div>

        {searchParams.error && (
          <div className="p-3 rounded-lg bg-slate-100 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {searchParams.error}
          </div>
        )}

        <div className="pt-2">
          <Link href="/login" className="w-full block">
            <Button className="w-full">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
