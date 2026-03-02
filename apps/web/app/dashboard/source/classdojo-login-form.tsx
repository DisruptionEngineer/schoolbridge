"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClassDojoLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
    remainingAttempts?: number;
  } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/classdojo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setPassword(""); // clear credentials immediately
        router.refresh(); // refresh server state to show new connection
      } else {
        setError(data.error);
      }
    } catch {
      setError({ code: "UNKNOWN", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-emerald-800">Connected!</h3>
        <p className="text-sm text-emerald-600">
          Your ClassDojo account is linked. SchoolBridge will start syncing your child&apos;s feed automatically.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Sign in with your ClassDojo parent account. Your credentials are used once to establish a session and are <strong>never stored</strong>.
      </p>

      <div className="space-y-2">
        <label htmlFor="dojo-email" className="text-sm font-medium text-[hsl(var(--foreground))]">
          ClassDojo Email
        </label>
        <input
          id="dojo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          required
          disabled={loading}
          className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))] disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="dojo-password" className="text-sm font-medium text-[hsl(var(--foreground))]">
          ClassDojo Password
        </label>
        <div className="relative">
          <input
            id="dojo-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your ClassDojo password"
            required
            disabled={loading}
            className="flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 pr-10 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-lg p-3 text-sm ${
          error.code === "RATE_LIMITED" || error.code === "ACCOUNT_LOCKED"
            ? "bg-amber-50 border border-amber-200 text-amber-800"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          <p>{error.message}</p>
          {error.remainingAttempts !== undefined && error.remainingAttempts > 0 && (
            <p className="mt-1 text-xs opacity-75">
              {error.remainingAttempts} attempt{error.remainingAttempts !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full h-10 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:bg-[hsl(var(--primary-hover))] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </span>
        ) : (
          "Connect ClassDojo"
        )}
      </button>

      <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
        Your credentials are sent securely to ClassDojo&apos;s servers and are never stored by SchoolBridge.
      </p>
    </form>
  );
}
