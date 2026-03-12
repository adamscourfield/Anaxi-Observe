"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";

export default function LoginPage() {
  const router = useRouter();
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
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-border/50 bg-surface/60 shadow-md backdrop-blur-sm">
          <Image
            src="/anaxi-logo.png"
            alt="Anaxi logo"
            width={48}
            height={48}
            priority
            className="h-12 w-12 object-contain"
          />
        </div>
        <p className="text-[42px] font-semibold tracking-[-0.03em] text-text">Anaxi</p>
        <p className="mt-1 text-sm font-medium text-muted">Future Education</p>
      </div>

      <div className="panel w-full p-7">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">Email address</label>
            <input id="email" name="email" type="email" placeholder="teacher@school.edu" className="field" required autoComplete="email" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">Password</label>
            <input id="password" name="password" type="password" placeholder="Enter your password" className="field" required autoComplete="current-password" />
          </div>

          <div>
            <label htmlFor="tenantId" className="mb-1.5 block text-sm font-medium text-text">
              Tenant ID <span className="text-muted/60">(optional)</span>
            </label>
            <input id="tenantId" name="tenantId" type="text" placeholder="Only needed for multi-tenant accounts" className="field" />
          </div>

          <div className="flex justify-end">
            <a className="calm-transition text-sm text-muted hover:text-accent" href="#">Forgot password?</a>
          </div>

          {error ? (
            <div className="rounded-xl border border-error/20 bg-[var(--pill-error-bg)] px-3 py-2.5">
              <MetaText className="text-[var(--pill-error-text)]">{error}</MetaText>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Log in"}
          </Button>
        </form>
      </div>

      <MetaText className="text-muted/50">&copy; 2026 Anaxi. All rights reserved.</MetaText>
    </div>
  );
}
