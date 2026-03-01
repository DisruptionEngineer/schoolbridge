import { describe, it, expect } from "vitest";
import {
  computeEventHash,
  monthlyAlbumName,
  isValidSessionCookie,
  buildFeedUrl,
} from "./utils";

describe("computeEventHash", () => {
  it("produces a 16-char hex string", () => {
    const hash = computeEventHash("Picture Day", "2026-03-07");
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("is deterministic for same inputs", () => {
    const a = computeEventHash("Picture Day", "2026-03-07");
    const b = computeEventHash("Picture Day", "2026-03-07");
    expect(a).toBe(b);
  });

  it("differs for different titles", () => {
    const a = computeEventHash("Picture Day", "2026-03-07");
    const b = computeEventHash("Spirit Week", "2026-03-07");
    expect(a).not.toBe(b);
  });

  it("differs for different dates", () => {
    const a = computeEventHash("Picture Day", "2026-03-07");
    const b = computeEventHash("Picture Day", "2026-03-08");
    expect(a).not.toBe(b);
  });

  it("handles null date", () => {
    const hash = computeEventHash("Picture Day", null);
    expect(hash).toHaveLength(16);
  });
});

describe("monthlyAlbumName", () => {
  it("formats March 2026 correctly", () => {
    const name = monthlyAlbumName(new Date("2026-03-15"));
    expect(name).toBe("ClassDojo - March 2026");
  });

  it("formats January 2025 correctly", () => {
    const name = monthlyAlbumName(new Date("2025-01-15T12:00:00"));
    expect(name).toBe("ClassDojo - January 2025");
  });
});

describe("isValidSessionCookie", () => {
  it("rejects empty string", () => {
    expect(isValidSessionCookie("")).toBe(false);
  });

  it("rejects short strings", () => {
    expect(isValidSessionCookie("abc")).toBe(false);
  });

  it("accepts reasonable cookie values", () => {
    expect(isValidSessionCookie("a1b2c3d4e5f6g7h8i9j0k1l2")).toBe(true);
  });
});

describe("buildFeedUrl", () => {
  it("returns base URL without student ID", () => {
    const url = buildFeedUrl();
    expect(url).toContain("storyFeed");
    expect(url).not.toContain("studentId");
  });

  it("includes student ID when provided", () => {
    const url = buildFeedUrl("student123");
    expect(url).toContain("studentId=student123");
  });
});
