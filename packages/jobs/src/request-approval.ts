import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import { connectorRegistry } from "@schoolbridge/connectors";

/**
 * Event-driven: posts extracted events to Discord for approval.
 * Triggered by classdojo/events.extracted.
 */
export const requestApproval = inngest.createFunction(
  {
    id: "request-approval",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "classdojo/events.extracted" },
  async ({ event, step }) => {
    const { tenantId, eventIds } = event.data as {
      tenantId: string;
      eventIds: string[];
    };

    const db = createServiceClient();

    // Get the Discord connection for this tenant
    const connection = await step.run("get-discord-connection", async () => {
      const { data } = await db
        .from("sync_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("connector_type", "discord")
        .eq("enabled", true)
        .single();
      return data;
    });

    if (!connection) {
      // No Discord connection — auto-approve events
      await step.run("auto-approve", async () => {
        await db
          .from("sync_events")
          .update({ status: "approved" })
          .in("id", eventIds);
      });

      // Trigger sync immediately
      await step.sendEvent("trigger-sync", {
        name: "classdojo/events.approved",
        data: { tenantId, eventIds },
      });

      return { autoApproved: eventIds.length };
    }

    // Load events for Discord posting
    const events = await step.run("load-events", async () => {
      const { data } = await db
        .from("sync_events")
        .select("*")
        .in("id", eventIds);
      return data ?? [];
    });

    // Post to Discord for approval
    const discord = connectorRegistry.get("discord");
    const result = await step.run("post-to-discord", async () => {
      return discord.sync(connection.config as Record<string, string>, {
        events: events as any,
      });
    });

    return {
      postedToDiscord: result.created,
      errors: result.errors.length,
    };
  },
);
