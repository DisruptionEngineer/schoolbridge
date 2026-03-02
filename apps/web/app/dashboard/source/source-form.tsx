"use client";

import { useState } from "react";
import { saveClassDojoSource } from "../actions";

export function SourceConfigForm({
  existingCookie,
  enabled,
  lastPolledAt,
}: {
  existingCookie?: string;
  enabled: boolean;
  lastPolledAt: string | null;
}) {
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await saveClassDojoSource(cookie);
      if (result.success) {
        setMessage({ type: "success", text: "Session cookie saved successfully." });
        setCookie("");
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {existingCookie && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">
            Current cookie: <code className="bg-[hsl(var(--background))] px-1.5 py-0.5 rounded">{existingCookie}</code>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-red-500"}`} />
            {enabled ? "Active" : "Disabled"}
          </span>
        </div>
      )}

      {lastPolledAt && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Last polled: {new Date(lastPolledAt).toLocaleString()}
        </p>
      )}

      <div>
        <label htmlFor="cookie" className="text-sm font-medium text-[hsl(var(--foreground))]">
          {existingCookie ? "Update Cookie" : "Session Cookie"}
        </label>
        <input
          id="cookie"
          type="password"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="Paste dojo_home_login.sid cookie value..."
          className="mt-1 flex h-10 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.20)] focus-visible:border-[hsl(var(--primary))]"
          required
          minLength={10}
        />
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || cookie.length < 10}
        className="inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-medium rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {saving ? "Saving..." : existingCookie ? "Update Cookie" : "Save Cookie"}
      </button>
    </form>
  );
}
