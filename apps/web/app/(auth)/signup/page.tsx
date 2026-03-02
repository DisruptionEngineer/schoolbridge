"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@schoolbridge/db";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use server-side signup to auto-confirm email (no SMTP needed)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        setLoading(false);
        return;
      }

      // User created & confirmed — now sign in to establish session
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.refresh();
      router.push("/dashboard/overview");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-lg mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 21h16" />
              <path d="M4 16h16" />
              <path d="M4 16c0-4 4-8 8-8s8 4 8 8" />
              <path d="M8 16V9" />
              <path d="M16 16V9" />
              <path d="M12 16V8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            Create your account
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Start syncing your child&apos;s school events
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_4px_6px_-1px_rgba(60,45,30,0.08)] space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="tenant" className="text-sm font-medium">
              Family / Organization Name
            </label>
            <input
              id="tenant"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="The Smith Family"
              required
              className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              required
              className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:bg-[hsl(var(--primary-hover))] transition-all disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[hsl(var(--primary))] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
