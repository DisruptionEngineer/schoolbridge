import { createDAVClient, type DAVClient } from "tsdav";
import ICalGenerator from "ical-generator";
import type { Connector, SyncPayload, SyncResult, TestResult } from "./types";
import { computeEventHash } from "@schoolbridge/shared";

interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath: string;
}

async function getClient(config: CalDAVConfig): Promise<DAVClient> {
  return createDAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: config.password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

export const caldavConnector: Connector<CalDAVConfig> = {
  type: "caldav",
  displayName: "CalDAV (Nextcloud)",
  description: "Sync events to any CalDAV server — Nextcloud, Apple Calendar, Baikal, etc.",
  icon: "calendar",

  configFields: [
    {
      key: "serverUrl",
      label: "CalDAV Server URL",
      type: "url",
      placeholder: "https://nextcloud.example.com/remote.php/dav",
      required: true,
      helpText: "For Nextcloud: https://your-domain/remote.php/dav",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
    },
    {
      key: "password",
      label: "Password or App Password",
      type: "password",
      required: true,
      helpText: "If 2FA is enabled, use an app password from Nextcloud settings",
    },
    {
      key: "calendarPath",
      label: "Calendar Path",
      type: "text",
      placeholder: "/remote.php/dav/calendars/user/personal/",
      required: true,
      helpText: "Full path to the target calendar",
    },
  ],

  validateConfig(config) {
    if (!config.serverUrl?.startsWith("http")) {
      return { valid: false, error: "Server URL must start with http:// or https://" };
    }
    if (!config.username || !config.password) {
      return { valid: false, error: "Username and password are required" };
    }
    if (!config.calendarPath) {
      return { valid: false, error: "Calendar path is required" };
    }
    return { valid: true };
  },

  async testConnection(config): Promise<TestResult> {
    try {
      const client = await getClient(config);
      const calendars = await client.fetchCalendars();
      return {
        connected: true,
        details: `Found ${calendars.length} calendar(s)`,
      };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  },

  async sync(config, payload): Promise<SyncResult> {
    const client = await getClient(config);
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const event of payload.events) {
      try {
        const uid = `${event.event_hash}@schoolbridge`;
        const cal = ICalGenerator({ name: "SchoolBridge" });
        const icalEvent = cal.createEvent({
          id: uid,
          summary: event.title,
          description: event.raw_body,
          stamp: new Date(),
        });

        if (event.is_all_day && event.iso_date) {
          icalEvent.allDay(true);
          icalEvent.start(new Date(event.iso_date));
        } else if (event.iso_date) {
          icalEvent.start(new Date(event.iso_date));
          // Default 1-hour duration if no end time specified
          const end = new Date(event.iso_date);
          end.setHours(end.getHours() + 1);
          icalEvent.end(end);
        } else {
          result.skipped++;
          continue;
        }

        const icsData = cal.toString();
        const eventUrl = `${config.calendarPath}${uid}.ics`;

        await client.createCalendarObject({
          calendar: { url: config.calendarPath },
          filename: `${uid}.ics`,
          iCalString: icsData,
        });

        result.created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        // If it already exists (412 or duplicate), count as skipped
        if (msg.includes("412") || msg.includes("already exists")) {
          result.skipped++;
        } else {
          result.errors.push({ id: event.id, error: msg });
        }
      }
    }

    return result;
  },
};
