import { describe, it, expect } from "vitest";
import { connectorRegistry } from "./registry";

describe("ConnectorRegistry", () => {
  it("has 4 registered connectors", () => {
    expect(connectorRegistry.list()).toHaveLength(4);
  });

  it("can retrieve caldav connector", () => {
    const connector = connectorRegistry.get("caldav");
    expect(connector.type).toBe("caldav");
    expect(connector.displayName).toContain("CalDAV");
  });

  it("can retrieve home_assistant connector", () => {
    const connector = connectorRegistry.get("home_assistant");
    expect(connector.type).toBe("home_assistant");
  });

  it("can retrieve immich connector", () => {
    const connector = connectorRegistry.get("immich");
    expect(connector.type).toBe("immich");
  });

  it("can retrieve discord connector", () => {
    const connector = connectorRegistry.get("discord");
    expect(connector.type).toBe("discord");
  });

  it("throws for unknown connector type", () => {
    expect(() => connectorRegistry.get("nonexistent")).toThrow(
      "Unknown connector type",
    );
  });

  it("reports has() correctly", () => {
    expect(connectorRegistry.has("caldav")).toBe(true);
    expect(connectorRegistry.has("nonexistent")).toBe(false);
  });
});

describe("CalDAV connector validation", () => {
  const caldav = connectorRegistry.get("caldav");

  it("rejects invalid server URL", () => {
    const result = caldav.validateConfig({
      serverUrl: "not-a-url",
      username: "user",
      password: "pass",
      calendarPath: "/path/",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects missing username", () => {
    const result = caldav.validateConfig({
      serverUrl: "https://nextcloud.example.com",
      username: "",
      password: "pass",
      calendarPath: "/path/",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid config", () => {
    const result = caldav.validateConfig({
      serverUrl: "https://nextcloud.example.com/remote.php/dav",
      username: "admin",
      password: "app-password-here",
      calendarPath: "/remote.php/dav/calendars/admin/personal/",
    });
    expect(result.valid).toBe(true);
  });
});

describe("Home Assistant connector validation", () => {
  const ha = connectorRegistry.get("home_assistant");

  it("rejects non-http URL", () => {
    const result = ha.validateConfig({
      baseUrl: "ftp://ha.local",
      accessToken: "a".repeat(50),
      calendarEntityId: "calendar.test",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects short token", () => {
    const result = ha.validateConfig({
      baseUrl: "http://ha.local:8123",
      accessToken: "short",
      calendarEntityId: "calendar.test",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid entity ID prefix", () => {
    const result = ha.validateConfig({
      baseUrl: "http://ha.local:8123",
      accessToken: "a".repeat(50),
      calendarEntityId: "sensor.temperature",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid config", () => {
    const result = ha.validateConfig({
      baseUrl: "http://homeassistant.local:8123",
      accessToken: "a".repeat(50),
      calendarEntityId: "calendar.schoolbridge",
    });
    expect(result.valid).toBe(true);
  });
});

describe("Immich connector validation", () => {
  const immich = connectorRegistry.get("immich");

  it("rejects non-http URL", () => {
    const result = immich.validateConfig({
      baseUrl: "not-url",
      apiKey: "a".repeat(30),
      defaultAlbumPrefix: "ClassDojo",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects short API key", () => {
    const result = immich.validateConfig({
      baseUrl: "http://immich.local:2283",
      apiKey: "short",
      defaultAlbumPrefix: "ClassDojo",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid config", () => {
    const result = immich.validateConfig({
      baseUrl: "http://immich.local:2283",
      apiKey: "a".repeat(30),
      defaultAlbumPrefix: "ClassDojo",
    });
    expect(result.valid).toBe(true);
  });
});

describe("Discord connector validation", () => {
  const discord = connectorRegistry.get("discord");

  it("rejects short bot token", () => {
    const result = discord.validateConfig({
      botToken: "short",
      channelId: "1234567890123456789",
      approverUserId: "9876543210987654321",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-numeric channel ID", () => {
    const result = discord.validateConfig({
      botToken: "a".repeat(60),
      channelId: "not-a-number",
      approverUserId: "9876543210987654321",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid config", () => {
    const result = discord.validateConfig({
      botToken: "a".repeat(60),
      channelId: "1234567890123456789",
      approverUserId: "9876543210987654321",
    });
    expect(result.valid).toBe(true);
  });
});
