import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import {
  computeEventHash,
  monthlyAlbumName,
  type ClassDojoPost,
  type NLPExtractionResult,
} from "@schoolbridge/shared";

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL ?? "http://localhost:8000";

/**
 * Event-driven: receives fetched ClassDojo posts and runs NLP extraction.
 * Calls the Python microservice for date/event extraction, then stores results.
 */
export const extractEvents = inngest.createFunction(
  {
    id: "extract-events",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { event: "classdojo/posts.fetched" },
  async ({ event, step }) => {
    const { tenantId, post } = event.data as {
      tenantId: string;
      post: ClassDojoPost;
    };

    const db = createServiceClient();

    // Call Python NLP service for extraction
    const extraction = await step.run("nlp-extract", async () => {
      const resp = await fetch(`${NLP_SERVICE_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post.body ?? "", post_id: post._id }),
      });

      if (!resp.ok) {
        throw new Error(`NLP service error: ${resp.status}`);
      }

      return (await resp.json()) as NLPExtractionResult;
    });

    // Store extracted events
    const storedEvents = await step.run("store-events", async () => {
      const events = extraction.events.map((e) => ({
        tenant_id: tenantId,
        source_post_id: post._id,
        title: e.title,
        iso_date: e.iso_date,
        raw_date_text: e.raw_date_text,
        is_all_day: e.is_all_day,
        category: e.category,
        status: "pending" as const,
        event_hash: computeEventHash(e.title, e.iso_date),
        raw_body: (post.body ?? "").slice(0, 500),
      }));

      if (!events.length) return [];

      const { data, error } = await db
        .from("sync_events")
        .upsert(events, { onConflict: "tenant_id,event_hash", ignoreDuplicates: true })
        .select();

      if (error) throw new Error(`DB error: ${error.message}`);
      return data ?? [];
    });

    // Store photo references for download
    const storedPhotos = await step.run("store-photos", async () => {
      const attachments = post.contents?.attachments ?? [];
      const photoUrls = attachments
        .filter((a) => !a.type || a.type.startsWith("image"))
        .map((a) => a.path);

      if (!photoUrls.length) return [];

      const photos = photoUrls.map((url) => ({
        tenant_id: tenantId,
        source_post_id: post._id,
        classdojo_url: url,
        album_name: monthlyAlbumName(new Date(post.time)),
        status: "pending" as const,
      }));

      const { data, error } = await db
        .from("photo_downloads")
        .insert(photos)
        .select();

      if (error) throw new Error(`DB error: ${error.message}`);
      return data ?? [];
    });

    // Emit events for Discord approval and photo download
    const sendEvents: Array<{ name: string; data: Record<string, unknown> }> = [];

    if (storedEvents.length) {
      sendEvents.push({
        name: "classdojo/events.extracted",
        data: { tenantId, eventIds: storedEvents.map((e) => e.id) },
      });
    }

    if (storedPhotos.length) {
      sendEvents.push({
        name: "classdojo/photos.queued",
        data: { tenantId, photoIds: storedPhotos.map((p) => p.id) },
      });
    }

    if (sendEvents.length) {
      await step.sendEvent("dispatch", sendEvents);
    }

    return {
      eventsExtracted: storedEvents.length,
      photosQueued: storedPhotos.length,
    };
  },
);
