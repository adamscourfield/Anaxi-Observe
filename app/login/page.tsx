"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const res = await signIn("credentials", { email, password, redirect: true, callbackUrl: "/tenant" });
    if (res?.error) setError("Invalid credentials");
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-3 rounded border bg-white p-4">
      <h1 className="text-xl font-semibold">Login</h1>
      <input name="email" type="email" placeholder="Email" className="w-full border p-2" required />
      <input name="password" type="password" placeholder="Password" className="w-full border p-2" required />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Sign in</button>
    </form>
  );
}
