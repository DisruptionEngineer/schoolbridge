import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@schoolbridge/db";

/**
 * Server-side signup that auto-confirms users.
 *
 * Supabase requires email confirmation by default. Since we don't have
 * SMTP configured, this route uses the admin API (service role) to
 * create users with email_confirm: true, then creates their tenant.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantName } = (await request.json()) as {
      email: string;
      password: string;
      tenantName: string;
    };

    if (!email || !password || !tenantName) {
      return NextResponse.json(
        { error: "Email, password, and tenant name are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const db = createServiceClient();

    // Create user with auto-confirmed email via admin API
    const { data: userData, error: createError } =
      await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { tenant_name: tenantName },
      });

    if (createError) {
      // Handle duplicate email
      if (createError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 400 },
      );
    }

    const user = userData.user;
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // Create tenant
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: tenant, error: tenantError } = await db
      .from("tenants")
      .insert({ name: tenantName, slug, plan: "free" })
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json(
        { error: `Failed to create tenant: ${tenantError.message}` },
        { status: 500 },
      );
    }

    // Create membership
    await db.from("tenant_memberships").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "owner",
    });

    // Update user metadata with tenant_id so RLS policies work
    await db.auth.admin.updateUserById(user.id, {
      app_metadata: { tenant_id: tenant.id },
    });

    return NextResponse.json({
      status: "ok",
      userId: user.id,
      tenantId: tenant.id,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
