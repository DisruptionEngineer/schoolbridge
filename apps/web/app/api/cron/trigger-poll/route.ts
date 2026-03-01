import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@schoolbridge/jobs";

export const dynamic = "force-dynamic";

/**
 * Vercel cron handler — triggers the ClassDojo polling job.
 * Configured in vercel.json to run every 15 minutes.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "classdojo/manual-sync", data: {} });

  return NextResponse.json({ triggered: true });
}
