import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { SourceConfigForm } from "./source-form";
import { ClassDojoLoginForm } from "./classdojo-login-form";
import { SourceTabs } from "./source-tabs";

export const metadata = { title: "ClassDojo Source – SchoolBridge" };

export default async function SourcePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: source } = await supabase
    .from("classdojo_sources")
    .select("*")
    .limit(1)
    .single();

  const isConnected = source?.enabled === true;

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

      {/* Connection Status */}
      {source && (
        <div className="max-w-xl">
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${
            isConnected
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}>
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
              isConnected ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {isConnected ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isConnected ? "text-emerald-800" : "text-red-800"}`}>
                {isConnected ? "ClassDojo Connected" : "ClassDojo Disconnected"}
              </p>
              {source.last_polled_at && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Last synced: {new Date(source.last_polled_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Methods */}
      <div className="max-w-xl">
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
                existingCookie={source?.session_cookie ? "••••••••" : undefined}
                enabled={source?.enabled ?? false}
                lastPolledAt={source?.last_polled_at ?? null}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
