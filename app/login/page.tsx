"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/tenant" });
    if (res?.error) {
      if (res.error === "CredentialsSignin") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Authentication service error. Please contact support if this persists.");
      }
      return;
    }
    router.push(res?.url || "/tenant");
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <H1 className="text-[20px]">Login</H1>
        <input name="email" type="email" placeholder="Email" className="w-full rounded-md border border-border bg-surface p-2" required />
        <input name="password" type="password" placeholder="Password" className="w-full rounded-md border border-border bg-surface p-2" required />
        {error ? <MetaText className="text-error">{error}</MetaText> : null}
        <Button type="submit">Sign in</Button>
      </form>
    </Card>
  );
}
