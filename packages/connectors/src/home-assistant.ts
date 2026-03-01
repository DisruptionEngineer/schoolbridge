import type { Connector, SyncPayload, SyncResult, TestResult } from "./types";

interface HomeAssistantConfig {
  baseUrl: string;
  accessToken: string;
  calendarEntityId: string;
}

async function haFetch(
  config: HomeAssistantConfig,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export const homeAssistantConnector: Connector<HomeAssistantConfig> = {
  type: "home_assistant",
  displayName: "Home Assistant",
  description: "Push events to your Home Assistant local or CalDAV-synced calendar.",
  icon: "home",

  configFields: [
    {
      key: "baseUrl",
      label: "Home Assistant URL",
      type: "url",
      placeholder: "http://homeassistant.local:8123",
      required: true,
      helpText: "Your HA instance URL (local or Nabu Casa)",
    },
    {
      key: "accessToken",
      label: "Long-Lived Access Token",
      type: "password",
      required: true,
      helpText: "Create at Profile → Long-Lived Access Tokens (valid 10 years)",
    },
    {
      key: "calendarEntityId",
      label: "Calendar Entity ID",
      type: "text",
      placeholder: "calendar.schoolbridge",
      required: true,
      helpText: "The HA calendar entity to write events to",
    },
  ],

  validateConfig(config) {
    if (!config.baseUrl?.startsWith("http")) {
      return { valid: false, error: "URL must start with http:// or https://" };
    }
    if (!config.accessToken || config.accessToken.length < 20) {
      return { valid: false, error: "A valid Long-Lived Access Token is required" };
    }
    if (!config.calendarEntityId?.startsWith("calendar.")) {
      return { valid: false, error: "Calendar entity ID must start with 'calendar.'" };
    }
    return { valid: true };
  },

  async testConnection(config): Promise<TestResult> {
    try {
      const resp = await haFetch(config, "/api/calendars");
      if (!resp.ok) {
        return { connected: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
      }
      const calendars = (await resp.json()) as Array<{ entity_id: string; name: string }>;
      const found = calendars.find((c) => c.entity_id === config.calendarEntityId);
      if (!found) {
        return {
          connected: true,
          error: `Calendar '${config.calendarEntityId}' not found. Available: ${calendars.map((c) => c.entity_id).join(", ")}`,
        };
      }
      return { connected: true, details: `Connected to "${found.name}"` };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  },

  async sync(config, payload): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const event of payload.events) {
      if (!event.iso_date) {
        result.skipped++;
        continue;
      }

      try {
        const body: Record<string, unknown> = {
          entity_id: config.calendarEntityId,
          summary: event.title,
          description: event.raw_body,
        };

        if (event.is_all_day) {
          body.start_date = event.iso_date;
          // All-day events need end_date = start + 1 day
          const end = new Date(event.iso_date);
          end.setDate(end.getDate() + 1);
          body.end_date = end.toISOString().split("T")[0];
        } else {
          body.start_date_time = event.iso_date;
          const end = new Date(event.iso_date);
          end.setHours(end.getHours() + 1);
          body.end_date_time = end.toISOString();
        }

        const resp = await haFetch(config, "/api/services/calendar/create_event", {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const text = await resp.text();
          result.errors.push({ id: event.id, error: `HTTP ${resp.status}: ${text}` });
        } else {
          result.created++;
        }
      } catch (err) {
        result.errors.push({
          id: event.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return result;
  },
};
