"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const switchTo = searchParams.get("switchTo") || "";
  const prefillEmail = searchParams.get("email") || "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const tenantId = String(form.get("tenantId") || "").trim();
    const res = await signIn("credentials", { email, password, tenantId, redirect: false, callbackUrl: "/home" });
    setLoading(false);
    if (res?.error) {
      if (res.error === "CredentialsSignin") {
        setError("Invalid credentials, inactive account, or ambiguous tenant login. Please try again.");
      } else {
        setError("Authentication service error. Please contact support if this persists.");
      }
      return;
    }
    router.push(res?.url || "/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-between bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-12 text-white">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Image src="/anaxi-logo.png" alt="Anaxi" width={22} height={22} priority className="h-[22px] w-[22px] object-contain brightness-0 invert" />
          </span>
          <span className="text-[17px] font-bold tracking-[-0.02em]">Anaxi</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-[36px] font-bold leading-[1.15] tracking-[-0.03em]">
            School operations,<br />simplified.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Observations, behaviour, leave, meetings, and analytics — all in one place. Built for school leadership teams that move fast.
          </p>
        </div>
        <p className="text-[12px] text-white/40">&copy; 2026 Anaxi. All rights reserved.</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 lg:hidden">
              <Image src="/anaxi-logo.png" alt="Anaxi" width={28} height={28} priority className="h-7 w-7 object-contain" />
            </div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-text">Welcome back</h1>
            <p className="mt-1 text-[14px] text-muted">Sign in to your Anaxi account</p>
          </div>

          {switchTo && (
            <div className="mb-4 rounded-lg border border-accent/20 bg-[var(--pill-accent-bg)] px-4 py-3">
              <p className="text-[13px] text-[var(--pill-accent-text)]">Switching school. Enter your password to continue.</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-text">Email</label>
              <input id="email" name="email" type="email" placeholder="you@school.edu" className="field" required autoComplete="email" defaultValue={prefillEmail} />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-text">Password</label>
              <input id="password" name="password" type="password" placeholder="Enter your password" className="field" required autoComplete="current-password" />
            </div>

            <input type="hidden" name="tenantId" value={switchTo} />

            <div className="flex items-center justify-end">
              <a className="calm-transition text-[13px] text-muted hover:text-accent" href="#">Forgot password?</a>
            </div>

            {error ? (
              <div className="rounded-lg border border-error/20 bg-[var(--pill-error-bg)] px-4 py-3">
                <p className="text-[13px] text-[var(--pill-error-text)]">{error}</p>
              </div>
            ) : null}

            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
