"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { revalidatePath } from "next/cache";
import { connectorRegistry } from "@schoolbridge/connectors";
import { inngest } from "@schoolbridge/jobs";
import type { ConnectorType } from "@schoolbridge/shared";
import {
  CLASSDOJO_SESSION_URL,
  CLASSDOJO_HEADERS,
  CLASSDOJO_COOKIE_NAME,
} from "@schoolbridge/shared";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(cookieStore);
}

// ─── ClassDojo Connection Test ───────────────────────────────

export async function testClassDojoConnection(): Promise<{
  status: "connected" | "expired" | "no_source" | "error";
  message: string;
  parentName?: string;
  studentCount?: number;
}> {
  try {
    const db = await getSupabase();

    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return { status: "error", message: "Not authenticated." };

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId)
      return { status: "error", message: "No tenant assigned." };

    const { data: source } = await db
      .from("classdojo_sources")
      .select("session_cookie, enabled")
      .eq("tenant_id", tenantId)
      .single();

    if (!source || !source.session_cookie) {
      return {
        status: "no_source",
        message: "No ClassDojo session configured. Go to ClassDojo Source to connect.",
      };
    }

    // Verify cookie against ClassDojo API
    const res = await fetch(
      `${CLASSDOJO_SESSION_URL}?includeExtras=location`,
      {
        headers: {
          ...CLASSDOJO_HEADERS,
          cookie: `${CLASSDOJO_COOKIE_NAME}=${source.session_cookie}`,
        },
      },
    );

    if (!res.ok) {
      return {
        status: "expired",
        message: "ClassDojo session has expired. Please re-connect.",
      };
    }

    // Parse session info for display
    let parentName: string | undefined;
    let studentCount: number | undefined;
    try {
      const session = await res.json();
      const firstName = session.firstName || "";
      const lastName = session.lastName || "";
      parentName = `${firstName} ${lastName}`.trim() || undefined;
      if (Array.isArray(session.children)) {
        studentCount = session.children.length;
      }
    } catch {
      // Non-critical, just skip display info
    }

    return {
      status: "connected",
      message: "ClassDojo session is active and working!",
      parentName,
      studentCount,
    };
  } catch (err) {
    console.error("[Test Connection]", err);
    return {
      status: "error",
      message: "Failed to test connection. Please try again.",
    };
  }
}

// ─── ClassDojo Source ────────────────────────────────────────

export async function saveClassDojoSource(
  sessionCookie: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getSupabase();

    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) return { success: false, error: "No tenant assigned" };

    const { error } = await db.from("classdojo_sources").upsert(
      {
        tenant_id: tenantId,
        session_cookie: sessionCookie,
        student_ids: [],
        enabled: true,
      },
      { onConflict: "tenant_id" },
    );

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/source");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Sync Connections ────────────────────────────────────────

export async function createConnection(formData: FormData) {
  const db = await getSupabase();
  const connectorType = formData.get("connector_type") as ConnectorType;
  const displayName = formData.get("display_name") as string;
  const configJson = formData.get("config") as string;

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  const config = JSON.parse(configJson);

  // Validate config using the connector
  const connector = connectorRegistry.get(connectorType);
  const validation = connector.validateConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid configuration");
  }

  const { error } = await db.from("sync_connections").insert({
    tenant_id: tenantId,
    connector_type: connectorType,
    display_name: displayName,
    config,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/connections");
}

export async function testConnection(connectionId: string) {
  const db = await getSupabase();

  const { data: conn } = await db
    .from("sync_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (!conn) throw new Error("Connection not found");

  const connector = connectorRegistry.get(conn.connector_type);
  return connector.testConnection(conn.config as Record<string, string>);
}

export async function toggleConnection(connectionId: string, enabled: boolean) {
  const db = await getSupabase();
  const { error } = await db
    .from("sync_connections")
    .update({ enabled })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/connections");
}

export async function deleteConnection(connectionId: string) {
  const db = await getSupabase();
  const { error } = await db
    .from("sync_connections")
    .delete()
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/connections");
}

// ─── Events ──────────────────────────────────────────────────

export async function approveEvent(eventId: string) {
  const db = await getSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const tenantId = user.app_metadata?.tenant_id;

  const { error } = await db
    .from("sync_events")
    .update({ status: "approved" })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  // Trigger sync
  await inngest.send({
    name: "classdojo/events.approved",
    data: { tenantId, eventIds: [eventId] },
  });

  revalidatePath("/dashboard/events");
}

export async function skipEvent(eventId: string) {
  const db = await getSupabase();
  const { error } = await db
    .from("sync_events")
    .update({ status: "skipped" })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/events");
}

// ─── Manual Sync ─────────────────────────────────────────────

export async function triggerManualSync() {
  const db = await getSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const tenantId = user.app_metadata?.tenant_id;

  await inngest.send({
    name: "classdojo/manual-sync",
    data: { tenantId },
  });

  return { triggered: true };
}
