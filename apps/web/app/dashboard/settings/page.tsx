import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { ExtensionApiKey } from "./extension-api-key";
import { TestConnectionButton } from "./test-connection-button";

export const metadata = { title: "Settings – SchoolBridge" };

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email ?? "Unknown";
  const tenantId = user.user?.app_metadata?.tenant_id ?? "Not assigned";

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, plan, created_at")
    .single();

  // Build extension API key (tenant_id:CRON_SECRET)
  const cronSecret = process.env.CRON_SECRET;
  const extensionApiKey =
    typeof tenantId === "string" && cronSecret
      ? `${tenantId}:${cronSecret}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Settings
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Manage your account and tenant configuration
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Account Info */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-[hsl(var(--muted-foreground))]">Email</dt>
              <dd className="text-sm font-medium">{email}</dd>
            </div>
            <div>
              <dt className="text-sm text-[hsl(var(--muted-foreground))]">Tenant ID</dt>
              <dd className="text-sm font-mono text-xs">{tenantId}</dd>
            </div>
          </dl>
        </div>

        {/* Tenant Info */}
        {tenant && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
            <h2 className="text-lg font-semibold">Tenant</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-[hsl(var(--muted-foreground))]">Name</dt>
                <dd className="text-sm font-medium">{tenant.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-[hsl(var(--muted-foreground))]">Plan</dt>
                <dd>
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]">
                    {tenant.plan}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[hsl(var(--muted-foreground))]">Created</dt>
                <dd className="text-sm">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* ClassDojo Connection Test */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
          <h2 className="text-lg font-semibold">ClassDojo Connection</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Verify that your stored ClassDojo session cookie is still valid and
            SchoolBridge can reach the ClassDojo API.
          </p>
          <TestConnectionButton />
        </div>

        {/* Extension API Key */}
        {extensionApiKey && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
            <h2 className="text-lg font-semibold">Chrome Extension</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Use this API key in the SchoolBridge Chrome Extension to automatically
              sync your ClassDojo session cookie.
            </p>
            <ExtensionApiKey apiKey={extensionApiKey} />
          </div>
        )}

        {/* Polling Config */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
          <h2 className="text-lg font-semibold">Sync Configuration</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            SchoolBridge polls ClassDojo every 15 minutes for new posts.
            Extracted events are sent to Discord for approval (if configured),
            then synced to your connected calendars and photo libraries.
          </p>
          <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Polling interval: <strong>15 minutes</strong> (configurable via
              environment variable)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
