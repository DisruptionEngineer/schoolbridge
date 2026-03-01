import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  type TextChannel,
} from "discord.js";
import {
  DISCORD_REACTIONS,
  EVENT_CATEGORY_COLORS,
} from "@schoolbridge/shared";
import type { Connector, SyncPayload, SyncResult, TestResult } from "./types";

interface DiscordConfig {
  botToken: string;
  channelId: string;
  approverUserId: string;
}

let sharedClient: Client | null = null;

async function getClient(config: DiscordConfig): Promise<Client> {
  if (sharedClient?.isReady()) return sharedClient;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
    ],
  });
  await client.login(config.botToken);
  sharedClient = client;
  return client;
}

function buildEmbed(event: {
  title: string;
  raw_body: string;
  raw_date_text: string;
  iso_date: string | null;
  category: string;
  is_all_day: boolean;
  event_hash: string;
  source_post_id: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`\u{1f4c5} ${event.title}`)
    .setDescription(event.raw_body.slice(0, 300))
    .setColor(EVENT_CATEGORY_COLORS[event.category] ?? 0x95a5a6)
    .addFields(
      { name: "Detected Date", value: event.raw_date_text, inline: true },
      { name: "ISO Date", value: event.iso_date ?? "\u26a0\ufe0f unparsed", inline: true },
      { name: "Category", value: event.category, inline: true },
      { name: "All-Day", value: event.is_all_day ? "Yes" : "No", inline: true },
    )
    .setFooter({ text: `Post: ${event.source_post_id} | Hash: ${event.event_hash}` })
    .setTimestamp();
}

export const discordConnector: Connector<DiscordConfig> = {
  type: "discord",
  displayName: "Discord Approval",
  description: "Post events to a Discord channel for approval via reactions before syncing to other destinations.",
  icon: "message-circle",

  configFields: [
    {
      key: "botToken",
      label: "Discord Bot Token",
      type: "password",
      required: true,
      helpText: "Create a bot at discord.com/developers and get the token",
    },
    {
      key: "channelId",
      label: "Approval Channel ID",
      type: "text",
      placeholder: "1234567890123456789",
      required: true,
      helpText: "Right-click a channel → Copy ID (enable Developer Mode first)",
    },
    {
      key: "approverUserId",
      label: "Approver User ID",
      type: "text",
      placeholder: "9876543210987654321",
      required: true,
      helpText: "The Discord user ID who can approve/edit/skip events",
    },
  ],

  validateConfig(config) {
    if (!config.botToken || config.botToken.length < 50) {
      return { valid: false, error: "A valid Discord bot token is required" };
    }
    if (!config.channelId || !/^\d+$/.test(config.channelId)) {
      return { valid: false, error: "Channel ID must be a numeric Discord snowflake" };
    }
    if (!config.approverUserId || !/^\d+$/.test(config.approverUserId)) {
      return { valid: false, error: "Approver User ID must be a numeric Discord snowflake" };
    }
    return { valid: true };
  },

  async testConnection(config): Promise<TestResult> {
    try {
      const client = await getClient(config);
      const channel = await client.channels.fetch(config.channelId);
      if (!channel || !channel.isTextBased()) {
        return { connected: false, error: "Channel not found or is not a text channel" };
      }
      return {
        connected: true,
        details: `Connected to #${(channel as TextChannel).name}`,
      };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  },

  async sync(config, payload): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    const client = await getClient(config);
    const channel = (await client.channels.fetch(config.channelId)) as TextChannel;

    if (!channel) {
      return { ...result, errors: [{ id: "channel", error: "Channel not found" }] };
    }

    for (const event of payload.events) {
      try {
        const embed = buildEmbed(event);
        const message = await channel.send({
          content: `<@${config.approverUserId}> Review this school event:`,
          embeds: [embed],
        });

        // Add reaction options
        await message.react(DISCORD_REACTIONS.APPROVE);
        await message.react(DISCORD_REACTIONS.EDIT);
        await message.react(DISCORD_REACTIONS.SKIP);

        result.created++;

        // Throttle to stay under Discord rate limits
        await new Promise((r) => setTimeout(r, 1500));
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
