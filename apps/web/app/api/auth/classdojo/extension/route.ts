import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@schoolbridge/db";
import {
  CLASSDOJO_SESSION_URL,
  CLASSDOJO_HEADERS,
  CLASSDOJO_COOKIE_NAME,
} from "@schoolbridge/shared";

export const dynamic = "force-dynamic";

/**
 * Extension endpoint: receives a ClassDojo session cookie from the Chrome extension.
 *
 * Authentication: API key must match a tenant's stored extension_api_key.
 * The extension reads the HttpOnly dojo_home_login.sid cookie via chrome.cookies
 * and sends it here.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionCookie, apiKey } = (await request.json()) as {
      sessionCookie: string;
      apiKey: string;
    };

    if (!sessionCookie || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing sessionCookie or apiKey" },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    // Look up tenant by API key (stored in tenant settings or as cron_secret)
    // For now, use a simple approach: the API key is the tenant_id + a secret
    // We'll validate the key format: {tenant_id}:{secret}
    const parts = apiKey.split(":");
    if (parts.length !== 2) {
      return NextResponse.json(
        { success: false, error: "Invalid API key format" },
        { status: 401 },
      );
    }

    const [tenantId, secret] = parts;

    // Verify tenant exists
    const { data: tenant } = await db
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 },
      );
    }

    // Verify the secret matches CRON_SECRET (shared secret for now)
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 },
      );
    }

    // Verify cookie works against ClassDojo
    const verifyRes = await fetch(
      `${CLASSDOJO_SESSION_URL}?includeExtras=location`,
      {
        headers: {
          ...CLASSDOJO_HEADERS,
          cookie: `${CLASSDOJO_COOKIE_NAME}=${sessionCookie}`,
        },
      },
    );

    if (!verifyRes.ok) {
      return NextResponse.json(
        { success: false, error: "ClassDojo cookie is expired or invalid" },
        { status: 400 },
      );
    }

    // Store in database (select-then-update/insert since no unique constraint on tenant_id)
    const { data: existing } = await db
      .from("classdojo_sources")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const dbError = existing
      ? (
          await db
            .from("classdojo_sources")
            .update({ session_cookie: sessionCookie, enabled: true })
            .eq("tenant_id", tenantId)
        ).error
      : (
          await db.from("classdojo_sources").insert({
            tenant_id: tenantId,
            session_cookie: sessionCookie,
            student_ids: [],
            enabled: true,
          })
        ).error;

    if (dbError) {
      return NextResponse.json(
        { success: false, error: "Failed to save session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Extension Auth] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
