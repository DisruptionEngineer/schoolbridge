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

/** Check if a ClassDojo session cookie looks valid (non-empty, reasonable length) */
export function isValidSessionCookie(cookie: string): boolean {
  return typeof cookie === "string" && cookie.length >= 20;
}

/** Build a ClassDojo feed URL with optional student filter */
export function buildFeedUrl(studentId?: string): string {
  const base =
    "https://home.classdojo.com/api/storyFeed?withStudentCommentsAndLikes=true&withArchived=false";
  return studentId ? `${base}&studentId=${studentId}` : base;
}
