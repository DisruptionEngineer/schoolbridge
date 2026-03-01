import { createServerClient } from "@schoolbridge/db";
import { SourceConfigForm } from "./source-form";

export const metadata = { title: "ClassDojo Source – SchoolBridge" };

export default async function SourcePage() {
  const supabase = await createServerClient();

  const { data: sources } = await supabase
    .from("classdojo_sources")
    .select("*")
    .limit(1)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          ClassDojo Source
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Configure your ClassDojo session cookie to start syncing posts
        </p>
      </div>

      <div className="max-w-xl">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Session Cookie</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              ClassDojo doesn&apos;t have a public API. SchoolBridge uses your
              session cookie to read your child&apos;s feed. The cookie expires
              approximately every 7 days and will need to be refreshed.
            </p>
          </div>

          <div className="rounded-lg bg-[hsl(var(--muted))] p-4 space-y-2">
            <p className="text-sm font-medium">How to get your cookie:</p>
            <ol className="text-sm text-[hsl(var(--muted-foreground))] space-y-1 list-decimal list-inside">
              <li>Log in to <strong>classdojo.com</strong> in your browser</li>
              <li>Open DevTools (F12) and go to <strong>Application &gt; Cookies</strong></li>
              <li>
                Find the cookie named{" "}
                <code className="text-xs bg-[hsl(var(--background))] px-1.5 py-0.5 rounded">
                  dojo_log_session_id
                </code>
              </li>
              <li>Copy the value and paste it below</li>
            </ol>
          </div>

          <SourceConfigForm
            existingCookie={sources?.session_cookie ? "••••••••" : undefined}
            enabled={sources?.enabled ?? false}
            lastPolledAt={sources?.last_polled_at ?? null}
          />
        </div>
      </div>
    </div>
  );
}
