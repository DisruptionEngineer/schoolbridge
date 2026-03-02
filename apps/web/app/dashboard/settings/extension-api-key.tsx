"use client";

import { useState } from "react";

export function ExtensionApiKey({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = apiKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-[hsl(var(--foreground))]">
        API Key
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 font-mono text-xs break-all select-all">
          {visible ? apiKey : "\u2022".repeat(20)}
        </div>
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          title={visible ? "Hide" : "Show"}
        >
          {visible ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={copyToClipboard}
          className="shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </span>
          )}
        </button>
      </div>
      <div className="rounded-lg bg-[hsl(var(--muted))] p-3 space-y-2">
        <p className="text-xs font-medium text-[hsl(var(--foreground))]">
          How to use:
        </p>
        <ol className="text-xs text-[hsl(var(--muted-foreground))] space-y-1 list-decimal list-inside">
          <li>Install the SchoolBridge Chrome Extension</li>
          <li>Log into ClassDojo in your browser</li>
          <li>Open the extension popup and paste this API key</li>
          <li>Click &quot;Connect to SchoolBridge&quot;</li>
        </ol>
      </div>
    </div>
  );
}
