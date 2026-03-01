import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import { connectorRegistry } from "@schoolbridge/connectors";

/**
 * Event-driven: syncs approved events to all configured non-Discord connectors.
 * Triggered when events are approved (via Discord reaction webhook or auto-approve).
 */
export const syncEvents = inngest.createFunction(
  {
    id: "sync-events",
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: "classdojo/events.approved" },
  async ({ event, step }) => {
    const { tenantId, eventIds } = event.data as {
      tenantId: string;
      eventIds: string[];
    };

    const db = createServiceClient();

    // Load approved events
    const events = await step.run("load-events", async () => {
      const { data } = await db
        .from("sync_events")
        .select("*")
        .in("id", eventIds)
        .in("status", ["approved", "edited"]);
      return data ?? [];
    });

    if (!events.length) return { message: "No approved events to sync" };

    // Get all non-Discord sync connections for this tenant
    const connections = await step.run("get-connections", async () => {
      const { data } = await db
        .from("sync_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("enabled", true)
        .neq("connector_type", "discord");
      return data ?? [];
    });

    const results: Record<string, { created: number; errors: number }> = {};

    for (const conn of connections) {
      const connector = connectorRegistry.get(conn.connector_type);
      const syncResult = await step.run(`sync-${conn.id}`, async () => {
        return connector.sync(conn.config as Record<string, string>, {
          events: events as any,
        });
      });

      // Log each sync operation
      await step.run(`log-${conn.id}`, async () => {
        const logs = events.map((evt) => ({
          tenant_id: tenantId,
          connection_id: conn.id,
          event_id: evt.id,
          action: syncResult.errors.some((e) => e.id === evt.id)
            ? ("failed" as const)
            : ("created" as const),
          details: {},
        }));
        await db.from("sync_logs").insert(logs);
      });

      results[conn.connector_type] = {
        created: syncResult.created,
        errors: syncResult.errors.length,
      };

      // Update last_synced_at
      await db
        .from("sync_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", conn.id);
    }

    // Mark events as synced
    await step.run("mark-synced", async () => {
      await db
        .from("sync_events")
        .update({ status: "synced" })
        .in("id", eventIds);
    });

    return { syncedTo: Object.keys(results).length, results };
  },
);
