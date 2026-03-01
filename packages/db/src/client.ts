import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Browser client — uses anon key, respects RLS */
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Server client for Next.js App Router (server components, server actions, route handlers).
 * Must be called with cookies() from next/headers.
 */
export function createServerClient(cookieStore: {
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options: Record<string, unknown>) => void;
}) {
  return createSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Use only in backend jobs (Inngest, webhooks).
 * NEVER expose this client-side.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
