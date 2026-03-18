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
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 p-14 text-white relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/[0.10] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/[0.06] blur-2xl" />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.12] backdrop-blur-md ring-1 ring-white/[0.08]">
            <Image src="/anaxi-logo.png" alt="Anaxi" width={24} height={24} priority className="h-6 w-6 object-contain brightness-0 invert" />
          </span>
          <span className="text-[18px] font-bold tracking-[-0.02em]">Anaxi</span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
            School operations,<br />simplified.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60">
            Observations, behaviour, leave, meetings, and analytics — all in one place. Built for school leadership teams that move fast.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["E", "S", "M", "K"].map((letter, i) => (
                <span key={i} className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-500 bg-white/[0.15] text-[11px] font-semibold text-white backdrop-blur-sm">
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-[13px] text-white/50">Trusted by school leaders everywhere</p>
          </div>
        </div>

        <p className="relative text-[12px] text-white/30">&copy; 2026 Anaxi. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 text-center lg:text-left">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 lg:hidden">
              <Image src="/anaxi-logo.png" alt="Anaxi" width={28} height={28} priority className="h-7 w-7 object-contain" />
            </div>
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-text">Welcome back</h1>
            <p className="mt-1.5 text-[14px] text-muted">Sign in to your Anaxi account</p>
          </div>

          {switchTo && (
            <div className="mb-5 rounded-xl border border-accent/15 bg-[var(--pill-accent-bg)] px-4 py-3">
              <p className="text-[13px] text-[var(--pill-accent-text)]">Switching school. Enter your password to continue.</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
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
              <div className="rounded-xl border border-error/15 bg-[var(--pill-error-bg)] px-4 py-3">
                <p className="text-[13px] text-[var(--pill-error-text)]">{error}</p>
              </div>
            ) : null}

            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-[12px] text-muted/60 lg:hidden">&copy; 2026 Anaxi. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
