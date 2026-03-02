import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { SourceConfigForm } from "./source-form";
import { ClassDojoLoginForm } from "./classdojo-login-form";
import { SourceTabs } from "./source-tabs";
import { ConnectionManager } from "./connection-manager";

export const metadata = { title: "ClassDojo Source – SchoolBridge" };

export default async function SourcePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: source } = await supabase
    .from("classdojo_sources")
    .select("*")
    .limit(1)
    .single();

  const isConnected = source?.enabled === true && !!source?.session_cookie;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          ClassDojo Source
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Connect your ClassDojo account to sync your child&apos;s posts
        </p>
      </div>

      <div className="max-w-xl">
        {isConnected ? (
          /* ── Connected: show management UI ── */
          <ConnectionManager lastPolledAt={source.last_polled_at ?? null} />
        ) : (
          /* ── Not connected: show auth methods ── */
          <SourceTabs
            loginForm={<ClassDojoLoginForm />}
            manualForm={
              <div className="space-y-4">
                <div className="rounded-lg bg-[hsl(var(--muted))] p-4 space-y-2">
                  <p className="text-sm font-medium">How to get your cookie:</p>
                  <ol className="text-sm text-[hsl(var(--muted-foreground))] space-y-1 list-decimal list-inside">
                    <li>Log in to <strong>classdojo.com</strong> in your browser</li>
                    <li>Open DevTools (F12) and go to <strong>Application &gt; Cookies</strong></li>
                    <li>
                      Find the cookie named{" "}
                      <code className="text-xs bg-[hsl(var(--background))] px-1.5 py-0.5 rounded">
                        dojo_home_login.sid
                      </code>
                    </li>
                    <li>Copy the value and paste it below</li>
                  </ol>
                </div>
                <SourceConfigForm
                  existingCookie={source?.session_cookie ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : undefined}
                  enabled={source?.enabled ?? false}
                  lastPolledAt={source?.last_polled_at ?? null}
                />
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
