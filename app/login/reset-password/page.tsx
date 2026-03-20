"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

type State = "idle" | "loading" | "success" | "error";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setState("loading");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      setState("error");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("success");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  }

  const missingToken = !token;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--surface-bright)", color: "var(--on-surface)" }}
    >
      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 flex items-center px-8 h-20 glass-surface">
        <div className="flex items-center gap-3">
          <Image src="/anaxi-logo.png" alt="Anaxi" width={32} height={32} priority className="h-8 w-8 object-contain" />
          <div className="h-4 w-px mx-2" style={{ background: "rgba(198,198,205,0.30)" }} />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--on-surface-variant)" }}>
            Anaxi
          </span>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-[440px] flex flex-col">

          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--on-surface)" }}>
              New password
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
              Choose a strong password for your Anaxi account.
            </p>
          </div>

          {/* Card */}
          <div
            className="p-1 rounded-[1.5rem]"
            style={{
              background: "rgba(255,255,255,0.80)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 32px 64px -16px rgba(25,28,30,0.04)",
            }}
          >
            <div
              className="p-8 rounded-[1.375rem]"
              style={{
                background: "var(--surface-container-lowest)",
                border: "1px solid rgba(198,198,205,0.10)",
              }}
            >
              {missingToken ? (
                <div className="space-y-3 text-center py-2">
                  <p className="text-[15px] font-semibold" style={{ color: "var(--on-surface)" }}>Invalid link</p>
                  <p className="text-[13px]" style={{ color: "var(--on-surface-variant)" }}>
                    This password reset link is missing a token.{" "}
                    <Link href="/login/forgot-password" className="underline underline-offset-2 hover:opacity-70">
                      Request a new one.
                    </Link>
                  </p>
                </div>
              ) : state === "success" ? (
                <div className="space-y-4 text-center py-2">
                  <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "var(--surface-container-low)" }}
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.5 10 7.5 14l9-8" stroke="var(--on-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--on-surface)" }}>Password updated</p>
                  <p className="text-[13px]" style={{ color: "var(--on-surface-variant)" }}>
                    Redirecting you to sign in…
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="block text-[11px] font-bold tracking-widest uppercase ml-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      New Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="At least 8 characters"
                      className="field"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="confirm"
                      className="block text-[11px] font-bold tracking-widest uppercase ml-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      name="confirm"
                      type="password"
                      placeholder="Repeat your new password"
                      className="field"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>

                  {(state === "error") && errorMsg && (
                    <div
                      className="px-4 py-3 rounded-[0.75rem]"
                      style={{
                        background: "var(--pill-error-bg)",
                        border: "1px solid rgba(254,159,159,0.20)",
                      }}
                    >
                      <p className="text-[13px]" style={{ color: "var(--pill-error-text)" }}>{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="w-full py-3 rounded-[0.75rem] text-sm font-semibold tracking-[0.01em] calm-transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
                      color: "var(--on-primary)",
                    }}
                  >
                    {state === "loading" ? "Updating…" : "Set new password"}
                    {state !== "loading" && (
                      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <Link
              href="/login"
              className="text-[13px] calm-transition flex items-center gap-1.5 hover:opacity-70"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
