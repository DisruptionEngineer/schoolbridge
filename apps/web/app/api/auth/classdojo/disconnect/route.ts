import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";

export const dynamic = "force-dynamic";

/**
 * Disconnects ClassDojo by disabling the source (keeps the row for re-connection).
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "No tenant assigned" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("classdojo_sources")
      .update({ enabled: false, session_cookie: "" })
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Disconnect]", err);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
