"use client";

import { useState, type ReactNode } from "react";

export function SourceTabs({
  loginForm,
  manualForm,
}: {
  loginForm: ReactNode;
  manualForm: ReactNode;
}) {
  const [tab, setTab] = useState<"login" | "manual">("login");

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "login"
              ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))]"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Sign In
          </span>
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "manual"
              ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))]"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Manual Cookie
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {tab === "login" ? loginForm : manualForm}
      </div>
    </div>
  );
}
