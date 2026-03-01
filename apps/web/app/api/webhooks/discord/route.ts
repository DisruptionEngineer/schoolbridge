import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@schoolbridge/db";
import { inngest } from "@schoolbridge/jobs";
import { DISCORD_REACTIONS } from "@schoolbridge/shared";

/**
 * Discord webhook receiver for reaction-based event approval.
 *
 * This endpoint is called by a Discord bot listener (or Discord webhook)
 * when a user reacts to an approval embed. It updates the event status
 * and triggers downstream sync if approved.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { eventId, tenantId, reaction, userId, editedFields } = body as {
    eventId: string;
    tenantId: string;
    reaction: string;
    userId: string;
    editedFields?: { title?: string; iso_date?: string; is_all_day?: boolean };
  };

  if (!eventId || !tenantId || !reaction) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = createServiceClient();

  // Map reaction to status
  let status: "approved" | "edited" | "skipped";
  if (reaction === DISCORD_REACTIONS.APPROVE) {
    status = "approved";
  } else if (reaction === DISCORD_REACTIONS.EDIT) {
    status = "edited";
  } else if (reaction === DISCORD_REACTIONS.SKIP) {
    status = "skipped";
  } else {
    return NextResponse.json({ error: "Unknown reaction" }, { status: 400 });
  }

  // Update event status
  const updatePayload: Record<string, unknown> = { status };
  if (status === "edited" && editedFields) {
    if (editedFields.title) updatePayload.title = editedFields.title;
    if (editedFields.iso_date) updatePayload.iso_date = editedFields.iso_date;
    if (editedFields.is_all_day !== undefined) updatePayload.is_all_day = editedFields.is_all_day;
  }

  const { error } = await db
    .from("sync_events")
    .update(updatePayload as never)
    .eq("id", eventId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If approved or edited, trigger sync to other destinations
  if (status === "approved" || status === "edited") {
    await inngest.send({
      name: "classdojo/events.approved",
      data: { tenantId, eventIds: [eventId] },
    });
  }

  return NextResponse.json({ status: "ok", eventStatus: status });
}
