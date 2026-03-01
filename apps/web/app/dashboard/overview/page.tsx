import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";

async function getStats() {
  const cookieStore = await cookies();
  const db = createServerClient(cookieStore);

  const [events, connections, photos, recentLogs] = await Promise.all([
    db.from("sync_events").select("status", { count: "exact" }),
    db.from("sync_connections").select("*").eq("enabled", true),
    db.from("photo_downloads").select("status", { count: "exact" }),
    db
      .from("sync_logs")
      .select("*, sync_connections(display_name, connector_type)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    totalEvents: events.count ?? 0,
    pendingEvents:
      events.data?.filter((e) => e.status === "pending").length ?? 0,
    syncedEvents:
      events.data?.filter((e) => e.status === "synced").length ?? 0,
    activeConnections: connections.data?.length ?? 0,
    totalPhotos: photos.count ?? 0,
    recentLogs: recentLogs.data ?? [],
  };
}

export default async function OverviewPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your SchoolBridge sync overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Events"
          value={stats.pendingEvents}
          icon="clock"
          color="amber"
        />
        <StatCard
          label="Synced Events"
          value={stats.syncedEvents}
          icon="check"
          color="green"
        />
        <StatCard
          label="Active Connections"
          value={stats.activeConnections}
          icon="link"
          color="blue"
        />
        <StatCard
          label="Photos Saved"
          value={stats.totalPhotos}
          icon="image"
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {stats.recentLogs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sync activity yet. Configure your ClassDojo source and
            connections to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm border-b border-border/50 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      log.action === "created"
                        ? "bg-green-500"
                        : log.action === "failed"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <span className="text-foreground">
                    {log.action === "created" ? "Synced to" : log.action}{" "}
                    {(log as any).sync_connections?.display_name ?? "Unknown"}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  };

  return (
    <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${colorMap[color]}`}
        >
          {icon === "clock" && "\u{1f552}"}
          {icon === "check" && "\u2705"}
          {icon === "link" && "\u{1f517}"}
          {icon === "image" && "\u{1f5bc}"}
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
