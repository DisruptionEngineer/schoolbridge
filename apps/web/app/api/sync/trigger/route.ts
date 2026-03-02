import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeEventHash } from "@schoolbridge/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL ?? "http://localhost:8000";

interface ClassDojoFeedItem {
  _id: string;
  type: string;
  time: string;
  body?: string;
  senderName?: string;
  contents?: {
    body?: string;
    attachments?: Array<{
      path: string;
      type?: string;
    }>;
  };
}

interface NLPEvent {
  title: string;
  raw_date_text: string;
  iso_date: string | null;
  is_all_day: boolean;
  category: string;
}

/**
 * Direct sync trigger — bypasses Inngest for immediate results.
 * Fetches ClassDojo → NLP extraction → stores events → posts to Discord.
 *
 * Auth: CRON_SECRET as Bearer token, or Supabase session cookie.
 */
export async function POST(request: NextRequest) {
  // Auth: accept CRON_SECRET or user session
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Create service client for DB operations
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let tenantId: string;

  if (isCron) {
    // Cron or API key auth — process all tenants or a specific one
    const body = await request.json().catch(() => ({}));
    tenantId = body.tenantId ?? "";

    if (!tenantId) {
      // Process first enabled source
      const { data: sources } = await db
        .from("classdojo_sources")
        .select("tenant_id")
        .eq("enabled", true)
        .limit(1);
      if (!sources?.length) {
        return NextResponse.json({ error: "No active sources" }, { status: 404 });
      }
      tenantId = sources[0].tenant_id;
    }
  } else {
    // User session auth
    const cookieHeader = request.headers.get("cookie") ?? "";
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { cookie: cookieHeader },
        },
      },
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
    }
  }

  try {
    const result = await runSyncPipeline(db, tenantId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Sync Trigger]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

async function runSyncPipeline(
  db: ReturnType<typeof createClient>,
  tenantId: string,
) {
  const log: string[] = [];

  // 1. Load ClassDojo source
  const { data: source, error: srcErr } = await db
    .from("classdojo_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("enabled", true)
    .single();

  if (srcErr || !source) {
    throw new Error("No active ClassDojo source found");
  }

  log.push(`Source found: ${source.id}`);

  // 2. Fetch ClassDojo feed
  const feedUrl =
    "https://home.classdojo.com/api/storyFeed?withStudentCommentsAndLikes=true&withArchived=false";
  const feedResp = await fetch(feedUrl, {
    headers: {
      accept: "*/*",
      "x-client-identifier": "Web",
      "x-sign-attachment-urls": "true",
      cookie: `dojo_home_login.sid=${source.session_cookie}`,
    },
  });

  if (feedResp.status === 401 || feedResp.status === 403) {
    await db
      .from("classdojo_sources")
      .update({ enabled: false })
      .eq("id", source.id);
    throw new Error("ClassDojo session expired — source disabled");
  }

  if (!feedResp.ok) {
    throw new Error(`ClassDojo API error: ${feedResp.status}`);
  }

  const feed = await feedResp.json();
  const items: ClassDojoFeedItem[] = feed._items ?? [];
  log.push(`Feed fetched: ${items.length} items`);

  // 3. Deduplicate against processed_posts
  const { data: processed } = await db
    .from("processed_posts")
    .select("post_id")
    .eq("tenant_id", tenantId);

  const seenIds = new Set((processed ?? []).map((p: { post_id: string }) => p.post_id));
  const newItems = items.filter((item) => !seenIds.has(item._id));
  log.push(`New posts: ${newItems.length} (${items.length - newItems.length} already processed)`);

  if (!newItems.length) {
    // Update last_polled_at even if no new posts
    await db
      .from("classdojo_sources")
      .update({ last_polled_at: new Date().toISOString() })
      .eq("id", source.id);
    return { success: true, log, events: 0, posts: 0 };
  }

  // 4. Process each new post through NLP
  let totalEvents = 0;
  const allEventIds: string[] = [];

  for (const item of newItems) {
    // Extract body text — ClassDojo puts it in contents.body, not top-level body
    const bodyText = item.contents?.body ?? item.body ?? "";

    if (!bodyText.trim()) {
      log.push(`Post ${item._id}: empty body, skipping NLP`);
    } else {
      log.push(`Post ${item._id}: "${bodyText.slice(0, 60)}..." (${bodyText.length} chars)`);

      // Call NLP service
      try {
        const nlpResp = await fetch(`${NLP_SERVICE_URL}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: bodyText, post_id: item._id }),
        });

        if (!nlpResp.ok) {
          log.push(`  NLP error: ${nlpResp.status}`);
        } else {
          const nlpResult = (await nlpResp.json()) as {
            events: NLPEvent[];
            photos: Array<{ url: string; timestamp: string | null }>;
          };

          log.push(`  NLP extracted: ${nlpResult.events.length} events`);

          // Store extracted events
          if (nlpResult.events.length) {
            const eventRows = nlpResult.events.map((e) => ({
              tenant_id: tenantId,
              source_post_id: item._id,
              title: e.title,
              iso_date: e.iso_date,
              raw_date_text: e.raw_date_text,
              is_all_day: e.is_all_day,
              category: e.category,
              status: "pending" as const,
              event_hash: computeEventHash(e.title, e.iso_date),
              raw_body: bodyText.slice(0, 500),
            }));

            const { data: inserted, error: insertErr } = await db
              .from("sync_events")
              .upsert(eventRows, {
                onConflict: "tenant_id,event_hash",
                ignoreDuplicates: true,
              })
              .select();

            if (insertErr) {
              log.push(`  DB error storing events: ${insertErr.message}`);
            } else {
              const ids = (inserted ?? []).map(
                (e: { id: string }) => e.id,
              );
              allEventIds.push(...ids);
              totalEvents += ids.length;
              log.push(`  Stored ${ids.length} events in sync_events`);
            }
          }
        }
      } catch (nlpErr) {
        log.push(
          `  NLP call failed: ${nlpErr instanceof Error ? nlpErr.message : "Unknown"}`,
        );
      }
    }

    // Mark post as processed
    await db.from("processed_posts").insert({
      tenant_id: tenantId,
      post_id: item._id,
    });
  }

  // 5. Update last_polled_at
  await db
    .from("classdojo_sources")
    .update({ last_polled_at: new Date().toISOString() })
    .eq("id", source.id);

  // 6. Post events to Discord for approval (if Discord connection exists)
  let discordResult = null;
  if (allEventIds.length) {
    const { data: discordConn } = await db
      .from("sync_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("connector_type", "discord")
      .eq("enabled", true)
      .single();

    if (discordConn) {
      log.push(`Discord connection found: ${discordConn.display_name}`);
      try {
        discordResult = await postEventsToDiscord(
          db,
          allEventIds,
          discordConn.config as {
            botToken: string;
            channelId: string;
            approverUserId: string;
          },
          log,
        );
      } catch (discordErr) {
        log.push(
          `Discord error: ${discordErr instanceof Error ? discordErr.message : "Unknown"}`,
        );
      }
    } else {
      // No Discord — auto-approve all events
      log.push("No Discord connection — auto-approving events");
      await db
        .from("sync_events")
        .update({ status: "approved" })
        .in("id", allEventIds);
    }
  }

  return {
    success: true,
    log,
    postsProcessed: newItems.length,
    eventsExtracted: totalEvents,
    discordResult,
  };
}

/**
 * Post events to Discord using the REST API directly (no discord.js dependency).
 */
async function postEventsToDiscord(
  db: ReturnType<typeof createClient>,
  eventIds: string[],
  config: { botToken: string; channelId: string; approverUserId: string },
  log: string[],
) {
  // Load events from DB
  const { data: events } = await db
    .from("sync_events")
    .select("*")
    .in("id", eventIds);

  if (!events?.length) {
    log.push("No events to post to Discord");
    return { posted: 0 };
  }

  const CATEGORY_COLORS: Record<string, number> = {
    dismissal: 0xff9900,
    closure: 0xff0000,
    special: 0x9b59b6,
    admin: 0x3498db,
    general: 0x2ecc71,
  };

  let posted = 0;
  const errors: string[] = [];

  for (const event of events) {
    const embed = {
      title: `\ud83d\udcc5 ${event.title}`,
      description: (event.raw_body ?? "").slice(0, 300),
      color: CATEGORY_COLORS[event.category] ?? 0x95a5a6,
      fields: [
        { name: "Detected Date", value: event.raw_date_text, inline: true },
        {
          name: "ISO Date",
          value: event.iso_date ?? "\u26a0\ufe0f unparsed",
          inline: true,
        },
        { name: "Category", value: event.category, inline: true },
        {
          name: "All-Day",
          value: event.is_all_day ? "Yes" : "No",
          inline: true,
        },
      ],
      footer: {
        text: `Post: ${event.source_post_id} | Hash: ${event.event_hash}`,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Send message via Discord REST API
      const msgResp = await fetch(
        `https://discord.com/api/v10/channels/${config.channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${config.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `<@${config.approverUserId}> Review this school event:`,
            embeds: [embed],
          }),
        },
      );

      if (!msgResp.ok) {
        const errBody = await msgResp.text();
        errors.push(`Event ${event.id}: Discord ${msgResp.status} - ${errBody}`);
        log.push(`  Discord post failed for "${event.title}": ${msgResp.status}`);
        continue;
      }

      const msg = await msgResp.json();
      log.push(
        `  Posted to Discord: "${event.title}" (msg: ${msg.id})`,
      );

      // Add reaction emojis (approve/edit/skip)
      for (const emoji of [
        "%E2%9C%85",
        "%E2%9C%8F%EF%B8%8F",
        "%E2%9D%8C",
      ]) {
        await fetch(
          `https://discord.com/api/v10/channels/${config.channelId}/messages/${msg.id}/reactions/${emoji}/@me`,
          {
            method: "PUT",
            headers: { Authorization: `Bot ${config.botToken}` },
          },
        );
        // Throttle to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      }

      posted++;
    } catch (err) {
      errors.push(
        `Event ${event.id}: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }

    // Throttle between messages
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { posted, errors };
}
