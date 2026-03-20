"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type State = "idle" | "loading" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const email = String(new FormData(e.currentTarget).get("email") || "");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

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
              Reset password
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
              Enter your email and we&apos;ll send you a link to set a new password.
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
              {state === "sent" ? (
                <div className="space-y-4 text-center py-2">
                  <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "var(--surface-container-low)" }}
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.5 10 7.5 14l9-8" stroke="var(--on-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--on-surface)" }}>Check your email</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
                    If an account exists for that address, we&apos;ve sent a password reset link. It expires in 1 hour.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-[11px] font-bold tracking-widest uppercase ml-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@school.edu"
                      className="field"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {state === "error" && (
                    <div
                      className="px-4 py-3 rounded-[0.75rem]"
                      style={{
                        background: "var(--pill-error-bg)",
                        border: "1px solid rgba(254,159,159,0.20)",
                      }}
                    >
                      <p className="text-[13px]" style={{ color: "var(--pill-error-text)" }}>
                        Something went wrong. Please try again.
                      </p>
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
                    {state === "loading" ? "Sending…" : "Send reset link"}
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
