import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import { computeEventHash } from "@schoolbridge/shared";

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL ?? "http://localhost:8000";

/**
 * Process a PDF document submitted via Discord.
 *
 * Flow:
 *   1. Download the PDF from the Discord CDN URL
 *   2. Send to NLP service /extract-pdf for text extraction + event parsing
 *   3. Store extracted events in sync_events with status "pending"
 *   4. Emit "classdojo/events.extracted" to trigger the approval flow
 *
 * Triggered by: "schoolbridge/pdf.submitted"
 * Event data: { tenantId, pdfUrl, fileName, submittedBy, channelId }
 */
export const processPdf = inngest.createFunction(
  {
    id: "process-pdf-submission",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "schoolbridge/pdf.submitted" },
  async ({ event, step }) => {
    const { tenantId, pdfUrl, fileName, submittedBy, channelId } = event.data as {
      tenantId: string;
      pdfUrl: string;
      fileName: string;
      submittedBy: string;
      channelId?: string;
    };

    const db = createServiceClient();

    // Step 1: Download the PDF from Discord's CDN
    const pdfBuffer = await step.run("download-pdf", async () => {
      const resp = await fetch(pdfUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download PDF: ${resp.status} ${resp.statusText}`);
      }
      const arrayBuffer = await resp.arrayBuffer();
      // Return as base64 so it's serializable across steps
      return Buffer.from(arrayBuffer).toString("base64");
    });

    // Step 2: Send to NLP service for text extraction + event parsing
    const extraction = await step.run("extract-pdf-events", async () => {
      const formData = new FormData();
      const pdfBlob = new Blob(
        [Buffer.from(pdfBuffer, "base64")],
        { type: "application/pdf" }
      );
      formData.append("file", pdfBlob, fileName);
      formData.append("source_id", `pdf-discord-${Date.now()}`);

      const resp = await fetch(`${NLP_SERVICE_URL}/extract-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`NLP PDF extraction error: ${resp.status} — ${errText}`);
      }

      return (await resp.json()) as {
        text: string;
        page_count: number;
        events: Array<{
          title: string;
          raw_date_text: string;
          iso_date: string | null;
          is_all_day: boolean;
          category: string;
        }>;
      };
    });

    if (!extraction.events.length) {
      return {
        status: "no_events_found",
        pageCount: extraction.page_count,
        textLength: extraction.text.length,
      };
    }

    // Step 3: Store extracted events in database
    const storedEvents = await step.run("store-pdf-events", async () => {
      const events = extraction.events.map((e) => ({
        tenant_id: tenantId,
        source_post_id: `pdf:${fileName}`,
        title: e.title,
        iso_date: e.iso_date,
        raw_date_text: e.raw_date_text,
        is_all_day: e.is_all_day,
        category: e.category,
        status: "pending" as const,
        event_hash: computeEventHash(e.title, e.iso_date),
        raw_body: `[PDF: ${fileName}] ${extraction.text.slice(0, 400)}`,
      }));

      const { data, error } = await db
        .from("sync_events")
        .upsert(events, { onConflict: "tenant_id,event_hash", ignoreDuplicates: true })
        .select();

      if (error) throw new Error(`DB error: ${error.message}`);
      return data ?? [];
    });

    // Step 4: Trigger the approval flow (reuses existing pipeline)
    if (storedEvents.length) {
      await step.sendEvent("trigger-approval", {
        name: "classdojo/events.extracted",
        data: {
          tenantId,
          eventIds: storedEvents.map((e) => e.id),
          source: "pdf",
          fileName,
          submittedBy,
        },
      });
    }

    return {
      status: "processed",
      fileName,
      pageCount: extraction.page_count,
      eventsExtracted: storedEvents.length,
    };
  },
);
