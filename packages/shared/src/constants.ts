export const CLASSDOJO_FEED_URL =
  "https://home.classdojo.com/api/storyFeed";

export const CLASSDOJO_HEADERS = {
  accept: "*/*",
  "x-client-identifier": "Web",
  "x-sign-attachment-urls": "true",
} as const;

export const POLL_INTERVAL_MINUTES = 15;

export const DISCORD_REACTIONS = {
  APPROVE: "\u2705",
  EDIT: "\u270f\ufe0f",
  SKIP: "\u274c",
} as const;

export const EVENT_CATEGORY_COLORS: Record<string, number> = {
  dismissal: 0xff9900,
  closure: 0xff0000,
  special: 0x9b59b6,
  admin: 0x3498db,
  general: 0x2ecc71,
};

export const IMMICH_DEVICE_ID = "schoolbridge-sync";

export const SCHOOL_EVENT_TERMS: Record<string, string[]> = {
  dismissal: ["early dismissal", "early release", "half day"],
  closure: ["school closed", "snow day", "weather closure", "no school"],
  special: [
    "spirit week", "field trip", "field day", "picture day",
    "class photo", "pajama day", "hat day", "assembly", "pep rally",
  ],
  admin: [
    "parent conference", "parent-teacher conference", "ptc",
    "parent night", "open house", "back to school night",
  ],
};
