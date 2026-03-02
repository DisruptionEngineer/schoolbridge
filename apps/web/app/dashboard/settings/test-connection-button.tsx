"use client";

import { useState } from "react";
import { testClassDojoConnection } from "../actions";

type TestResult = {
  status: "connected" | "expired" | "no_source" | "error";
  message: string;
  parentName?: string;
  studentCount?: number;
};

export function TestConnectionButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const res = await testClassDojoConnection();
      setResult(res);
    } catch {
      setResult({
        status: "error",
        message: "Failed to test connection. Please try again.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleTest}
        disabled={testing}
        className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {testing ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Testing...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Test Connection
          </>
        )}
      </button>

      {result && (
        <div
          className={`rounded-lg p-3 text-sm ${
            result.status === "connected"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : result.status === "expired"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : result.status === "no_source"
                  ? "bg-blue-50 border border-blue-200 text-blue-800"
                  : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <p className="font-medium">{result.message}</p>
          {result.parentName && (
            <p className="text-xs mt-1 opacity-75">
              Logged in as: {result.parentName}
              {result.studentCount
                ? ` (${result.studentCount} student${result.studentCount !== 1 ? "s" : ""})`
                : ""}
            </p>
          )}
          {result.status === "expired" && (
            <p className="text-xs mt-1 opacity-75">
              Re-connect via the ClassDojo Source page to refresh the session.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
