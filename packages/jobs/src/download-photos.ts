import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import { connectorRegistry } from "@schoolbridge/connectors";

/**
 * Event-driven: downloads ClassDojo photos and uploads to Immich.
 * Triggered by classdojo/photos.queued.
 */
export const downloadPhotos = inngest.createFunction(
  {
    id: "download-photos",
    retries: 3,
    concurrency: { limit: 3 },
  },
  { event: "classdojo/photos.queued" },
  async ({ event, step }) => {
    const { tenantId, photoIds } = event.data as {
      tenantId: string;
      photoIds: string[];
    };

    const db = createServiceClient();

    // Get Immich connection for this tenant
    const immichConn = await step.run("get-immich-connection", async () => {
      const { data } = await db
        .from("sync_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("connector_type", "immich")
        .eq("enabled", true)
        .single();
      return data;
    });

    if (!immichConn) {
      return { message: "No Immich connection configured — photos skipped" };
    }

    // Load pending photos
    const photos = await step.run("load-photos", async () => {
      const { data } = await db
        .from("photo_downloads")
        .select("*")
        .in("id", photoIds)
        .eq("status", "pending");
      return data ?? [];
    });

    if (!photos.length) return { message: "No pending photos" };

    // Sync photos to Immich
    const immich = connectorRegistry.get("immich");
    const result = await step.run("upload-to-immich", async () => {
      return immich.sync(immichConn.config as Record<string, string>, {
        events: [],
        photos: photos as any,
      });
    });

    // Update photo statuses based on results
    await step.run("update-statuses", async () => {
      const failedIds = new Set(result.errors.map((e) => e.id));

      for (const photo of photos) {
        if (failedIds.has(photo.id)) {
          const error = result.errors.find((e) => e.id === photo.id);
          await db
            .from("photo_downloads")
            .update({ status: "failed", error: error?.error })
            .eq("id", photo.id);
        } else {
          await db
            .from("photo_downloads")
            .update({ status: "uploaded" })
            .eq("id", photo.id);
        }
      }
    });

    return {
      uploaded: result.created,
      skipped: result.skipped,
      failed: result.errors.length,
    };
  },
);
