import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, createServiceClient } from "@schoolbridge/db";
import {
  CLASSDOJO_SESSION_URL,
  CLASSDOJO_HEADERS,
  CLASSDOJO_COOKIE_NAME,
} from "@schoolbridge/shared";
import { extractSessionCookie } from "@schoolbridge/shared/utils";

export const dynamic = "force-dynamic";

type ErrorCode =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "OTC_REQUIRED"
  | "ACCOUNT_LOCKED"
  | "UNKNOWN";

interface AuthResult {
  success: boolean;
  error?: { code: ErrorCode; message: string; remainingAttempts?: number };
}

/**
 * Server-side proxy login for ClassDojo.
 *
 * 1. User sends their ClassDojo email/password to this endpoint
 * 2. We POST to ClassDojo's /api/session with those credentials
 * 3. Extract the dojo_home_login.sid cookie from ClassDojo's response
 * 4. Verify the cookie works by GETting /api/session
 * 5. Store it in classdojo_sources — credentials are NEVER stored
 * 6. Return success/failure to the client — cookie NEVER sent to browser
 */
export async function POST(request: NextRequest) {
  try {
    const { login, password } = (await request.json()) as {
      login: string;
      password: string;
    };

    if (!login || !password) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email and password are required.",
          },
        },
        { status: 400 },
      );
    }

    // Get the authenticated SchoolBridge user's tenant
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: { code: "UNKNOWN", message: "Not authenticated." },
        },
        { status: 401 },
      );
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: { code: "UNKNOWN", message: "No tenant assigned." },
        },
        { status: 403 },
      );
    }

    // ── POST credentials to ClassDojo ──────────────────────────
    const dojoRes = await fetch(CLASSDOJO_SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...CLASSDOJO_HEADERS,
      },
      body: JSON.stringify({ login, password, resumeAddChild: false }),
    });

    // Handle ClassDojo errors
    if (!dojoRes.ok) {
      const remaining = dojoRes.headers.get("remaining-attempts");
      let body: { error?: { code?: string; extras?: { remainingAttempts?: number } } } = {};
      try {
        body = await dojoRes.json();
      } catch {
        // non-JSON response
      }

      const errorCode = mapError(dojoRes.status, body);
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: {
            code: errorCode,
            message: humanMessage(errorCode),
            remainingAttempts: remaining
              ? parseInt(remaining, 10)
              : body.error?.extras?.remainingAttempts,
          },
        },
        { status: dojoRes.status === 429 ? 429 : 401 },
      );
    }

    // ── Extract session cookie from Set-Cookie headers ─────────
    // fetch() in Node concatenates multiple set-cookie into comma-separated
    const rawCookies = dojoRes.headers.get("set-cookie") ?? "";
    const sessionCookie = extractSessionCookie(rawCookies);

    if (!sessionCookie) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: {
            code: "UNKNOWN",
            message: "ClassDojo didn't return a session. Please try again.",
          },
        },
        { status: 502 },
      );
    }

    // ── Verify cookie works ────────────────────────────────────
    const verifyRes = await fetch(
      `${CLASSDOJO_SESSION_URL}?includeExtras=location`,
      {
        headers: {
          ...CLASSDOJO_HEADERS,
          cookie: `${CLASSDOJO_COOKIE_NAME}=${sessionCookie}`,
        },
      },
    );

    if (!verifyRes.ok) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: {
            code: "UNKNOWN",
            message: "Session could not be verified. Please try again.",
          },
        },
        { status: 502 },
      );
    }

    // ── Store cookie in database (service client to bypass RLS) ─
    const db = createServiceClient();
    const { error: dbError } = await db.from("classdojo_sources").upsert(
      {
        tenant_id: tenantId,
        session_cookie: sessionCookie,
        student_ids: [],
        enabled: true,
      },
      { onConflict: "tenant_id" },
    );

    if (dbError) {
      return NextResponse.json<AuthResult>(
        {
          success: false,
          error: {
            code: "UNKNOWN",
            message: "Failed to save session. Please try again.",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json<AuthResult>({ success: true });
  } catch (err) {
    console.error("[ClassDojo Auth] Error:", err);
    return NextResponse.json<AuthResult>(
      {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500 },
    );
  }
}

function mapError(
  status: number,
  body: { error?: { code?: string; extras?: { remainingAttempts?: number } } },
): ErrorCode {
  if (status === 429) return "RATE_LIMITED";
  if (status === 401) {
    const code = body.error?.code;
    if (code === "OTC_REQUIRED" || code === "ERR_OTC_REQUIRED")
      return "OTC_REQUIRED";
    if (body.error?.extras?.remainingAttempts === 0) return "ACCOUNT_LOCKED";
    return "INVALID_CREDENTIALS";
  }
  return "UNKNOWN";
}

function humanMessage(code: ErrorCode): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect. Please check and try again.";
    case "RATE_LIMITED":
      return "Too many login attempts. Please wait a few minutes.";
    case "OTC_REQUIRED":
      return "ClassDojo requires a verification code. Please use the Manual Cookie method below instead.";
    case "ACCOUNT_LOCKED":
      return "Account temporarily locked due to too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
