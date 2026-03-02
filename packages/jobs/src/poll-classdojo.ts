import { inngest } from "./client";
import { createServiceClient } from "@schoolbridge/db";
import {
  CLASSDOJO_FEED_URL,
  CLASSDOJO_HEADERS,
  type ClassDojoFeedResponse,
} from "@schoolbridge/shared";

/**
 * Cron job: polls ClassDojo for every enabled tenant source.
 * Runs every 15 minutes, fetches new posts, and emits events for processing.
 */
export const pollClassDojo = inngest.createFunction(
  {
    id: "poll-classdojo",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const db = createServiceClient();

    // Fetch all enabled ClassDojo sources across all tenants
    const sources = await step.run("fetch-sources", async () => {
      const { data, error } = await db
        .from("classdojo_sources")
        .select("*, tenants!inner(id, slug)")
        .eq("enabled", true);
      if (error) throw new Error(`DB error: ${error.message}`);
      return data ?? [];
    });

    if (!sources.length) return { message: "No active sources" };

    let totalNewPosts = 0;

    for (const source of sources) {
      const newPosts = await step.run(
        `poll-${source.tenant_id}`,
        async () => {
          // Fetch ClassDojo feed
          const params = new URLSearchParams({
            withStudentCommentsAndLikes: "true",
            withArchived: "false",
          });

          const resp = await fetch(`${CLASSDOJO_FEED_URL}?${params}`, {
            headers: {
              ...CLASSDOJO_HEADERS,
              cookie: `dojo_home_login.sid=${source.session_cookie}`,
            },
          });

          if (resp.status === 401 || resp.status === 403) {
            // Session expired — disable the source and notify
            await db
              .from("classdojo_sources")
              .update({ enabled: false })
              .eq("id", source.id);
            throw new Error("ClassDojo session expired — source disabled");
          }

          if (!resp.ok) {
            throw new Error(`ClassDojo API error: ${resp.status}`);
          }

          const feed = (await resp.json()) as ClassDojoFeedResponse;

          // Filter to unprocessed posts
          const { data: processed } = await db
            .from("processed_posts")
            .select("post_id")
            .eq("tenant_id", source.tenant_id);

          const seenIds = new Set((processed ?? []).map((p) => p.post_id));
          const newItems = feed._items.filter((item) => !seenIds.has(item._id));

          // Mark posts as processed
          if (newItems.length) {
            await db.from("processed_posts").insert(
              newItems.map((item) => ({
                tenant_id: source.tenant_id,
                post_id: item._id,
              })),
            );
          }

          // Update last_polled_at
          await db
            .from("classdojo_sources")
            .update({ last_polled_at: new Date().toISOString() })
            .eq("id", source.id);

          return newItems;
        },
      );

      totalNewPosts += newPosts.length;

      // Emit extraction events for new posts
      if (newPosts.length) {
        await step.sendEvent(
          "send-extraction",
          newPosts.map((post) => ({
            name: "classdojo/posts.fetched" as const,
            data: {
              tenantId: source.tenant_id,
              post,
            },
          })),
        );
      }
    }

    return { sourcesPolled: sources.length, newPosts: totalNewPosts };
  },
);
