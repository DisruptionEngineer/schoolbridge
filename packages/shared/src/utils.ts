import { createHash } from "crypto";

/** Deterministic event hash for deduplication across syncs */
export function computeEventHash(title: string, isoDate: string | null): string {
  return createHash("sha256")
    .update(`${title}:${isoDate ?? "no-date"}`)
    .digest("hex")
    .slice(0, 16);
}

/** Format a date as a monthly album name for Immich */
export function monthlyAlbumName(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `ClassDojo - ${month} ${year}`;
}

/** Check if a ClassDojo session cookie looks valid */
export function isValidSessionCookie(cookie: string): boolean {
  if (typeof cookie !== "string" || cookie.length < 20) return false;
  // Signed express cookies start with s: followed by base64.signature
  return /^s:[A-Za-z0-9+/=_-]+\.[A-Za-z0-9+/=_-]+$/.test(cookie.trim());
}

/**
 * Extract dojo_home_login.sid value from Set-Cookie header(s).
 * ClassDojo returns multiple set-cookie headers; we need the login sid.
 */
export function extractSessionCookie(setCookieHeader: string): string | null {
  // set-cookie can be a single header with multiple cookies separated by commas,
  // or the raw header value for dojo_home_login.sid
  const match = setCookieHeader.match(/dojo_home_login\.sid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Build a ClassDojo feed URL with optional student filter */
export function buildFeedUrl(studentId?: string): string {
  const base =
    "https://home.classdojo.com/api/storyFeed?withStudentCommentsAndLikes=true&withArchived=false";
  return studentId ? `${base}&studentId=${studentId}` : base;
}
