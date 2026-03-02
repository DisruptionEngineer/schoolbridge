"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { testClassDojoConnection } from "../actions";

type TestResult = {
  status: "connected" | "expired" | "no_source" | "error";
  message: string;
  parentName?: string;
  studentCount?: number;
};

type SyncResult = {
  success?: boolean;
  postsProcessed?: number;
  eventsExtracted?: number;
  log?: string[];
  error?: string;
};

export function ConnectionManager({
  lastPolledAt,
}: {
  lastPolledAt: string | null;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showReconnect, setShowReconnect] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const router = useRouter();

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testClassDojoConnection();
      setTestResult(res);
    } catch {
      setTestResult({
        status: "error",
        message: "Failed to test connection.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        router.refresh();
      }
    } catch {
      setSyncResult({ error: "Failed to trigger sync" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect ClassDojo? SchoolBridge will stop syncing until you reconnect.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/classdojo/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Info */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">ClassDojo Connected</p>
            {lastPolledAt ? (
              <p className="text-xs text-emerald-600 mt-0.5">
                Last synced: {new Date(lastPolledAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-emerald-600 mt-0.5">
                Waiting for first sync &mdash; click &quot;Sync Now&quot; to run immediately
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-amber-400 bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Sync Now
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Test Connection
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowReconnect(!showReconnect)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Refresh Session
          </button>

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Disconnect
              </>
            )}
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-lg p-3 text-sm ${
              testResult.status === "connected"
                ? "bg-emerald-100 text-emerald-800"
                : testResult.status === "expired"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-700"
            }`}
          >
            <p className="font-medium">{testResult.message}</p>
            {testResult.parentName && (
              <p className="text-xs mt-1 opacity-75">
                Logged in as: {testResult.parentName}
                {testResult.studentCount
                  ? ` (${testResult.studentCount} student${testResult.studentCount !== 1 ? "s" : ""})`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div
            className={`rounded-lg p-3 text-sm ${
              syncResult.success
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {syncResult.error ? (
              <p className="font-medium">{syncResult.error}</p>
            ) : (
              <>
                <p className="font-medium">
                  Sync complete: {syncResult.postsProcessed ?? 0} posts processed,{" "}
                  {syncResult.eventsExtracted ?? 0} events extracted
                </p>
                {syncResult.log && syncResult.log.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowLog(!showLog)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {showLog ? "Hide" : "Show"} sync log ({syncResult.log.length} entries)
                    </button>
                    {showLog && (
                      <pre className="mt-2 text-xs bg-blue-100 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                        {syncResult.log.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
