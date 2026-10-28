import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen w-full bg-[#F7F8F4] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E1E5DC] shadow-card p-8 text-center space-y-6">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[#252923] tracking-tight">
            Authentication Notice
          </h1>
          <p className="text-sm text-[#697168]">
            An issue occurred during Google OAuth identity verification.
          </p>
        </div>

        {searchParams.error && (
          <div className="p-3 rounded-lg bg-[#F7F8F4] font-mono text-xs text-[#252923] border border-[#E1E5DC]">
            {searchParams.error}
          </div>
        )}

        <div className="pt-2">
          <Link href="/login" className="w-full block">
            <Button className="w-full bg-[#244A3A] hover:bg-[#1B382C] text-white">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
