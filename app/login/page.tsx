"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const tenantId = String(form.get("tenantId") || "").trim();
    const res = await signIn("credentials", { email, password, tenantId, redirect: false, callbackUrl: "/home" });
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
    <div className="mx-auto flex min-h-[78vh] w-full max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <p className="text-4xl leading-none text-primaryBtn">⌁</p>
        <p className="mt-2 text-[42px] font-semibold tracking-[-0.03em] text-text">Anaxi</p>
        <p className="mt-1 text-sm text-muted">Future Education</p>
      </div>

      <div className="panel w-full p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">Email address</label>
            <input id="email" name="email" type="email" placeholder="teacher@school.edu" className="field" required />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">Password</label>
            <input id="password" name="password" type="password" placeholder="Enter your password" className="field" required />
          </div>

          <div>
            <label htmlFor="tenantId" className="mb-1.5 block text-sm font-medium text-text">Tenant ID <span className="text-muted">(optional)</span></label>
            <input id="tenantId" name="tenantId" type="text" placeholder="Only needed if your email exists in multiple tenants" className="field" />
          </div>

          <div className="flex justify-end">
            <a className="text-sm text-muted hover:text-text" href="#">Forgot password?</a>
          </div>

          {error ? <MetaText className="text-error">{error}</MetaText> : null}

          <Button type="submit" className="w-full">Log in →</Button>
        </form>
      </div>

      <MetaText>© 2026 Anaxi. All rights reserved.</MetaText>
    </div>
  );
}
