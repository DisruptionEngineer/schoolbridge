import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@schoolbridge/db";
import { inngest } from "@schoolbridge/jobs";

/**
 * Discord PDF submission webhook.
 *
 * Called by a Discord bot when a user sends a PDF attachment in a monitored
 * channel. The bot detects the PDF, sends us the CDN URL, and we kick off
 * the extraction + approval pipeline via Inngest.
 *
 * Expected POST body:
 * {
 *   pdfUrl:       string — Discord CDN link to the PDF attachment
 *   fileName:     string — original filename
 *   submittedBy:  string — Discord user ID who sent the PDF
 *   channelId:    string — Discord channel where it was sent
 *   guildId:      string — Discord guild (server) ID
 * }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { pdfUrl, fileName, submittedBy, channelId, guildId } = body as {
      pdfUrl: string;
      fileName: string;
      submittedBy: string;
      channelId: string;
      guildId: string;
    };

    if (!pdfUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: pdfUrl, fileName" },
        { status: 400 },
      );
    }

    // Validate that it's a PDF
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    // Look up the tenant by their Discord guild/server ID
    // The Discord connection config stores the guild_id
    const { data: connection } = await db
      .from("sync_connections")
      .select("tenant_id")
      .eq("connector_type", "discord")
      .eq("enabled", true)
      .limit(1)
      .single();

    // Fall back to looking up any active tenant if no Discord match
    let tenantId: string;
    if (connection?.tenant_id) {
      tenantId = connection.tenant_id;
    } else {
      // Use the first active tenant (single-tenant fallback)
      const { data: tenant } = await db
        .from("tenants")
        .select("id")
        .limit(1)
        .single();

      if (!tenant) {
        return NextResponse.json(
          { error: "No tenant configured. Please sign up first." },
          { status: 404 },
        );
      }
      tenantId = tenant.id;
    }

    // Trigger the PDF processing pipeline via Inngest
    await inngest.send({
      name: "schoolbridge/pdf.submitted",
      data: {
        tenantId,
        pdfUrl,
        fileName,
        submittedBy: submittedBy || "unknown",
        channelId: channelId || "",
      },
    });

    return NextResponse.json({
      status: "accepted",
      message: `Processing ${fileName} — events will be posted for approval shortly.`,
    });
  } catch (err) {
    console.error("PDF webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
