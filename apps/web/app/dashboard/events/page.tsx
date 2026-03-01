import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { approveEvent, skipEvent } from "../actions";

async function getEvents() {
  const cookieStore = await cookies();
  const db = createServerClient(cookieStore);
  const { data } = await db
    .from("sync_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  edited: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  skipped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  synced: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  dismissal: "Early Dismissal",
  closure: "School Closure",
  special: "Special Event",
  admin: "Admin/Conference",
  general: "General",
};

export default async function EventsPage() {
  const events = await getEvents();
  const pendingEvents = events.filter((e) => e.status === "pending");
  const processedEvents = events.filter((e) => e.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage extracted school events
        </p>
      </div>

      {/* Pending Events */}
      {pendingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Pending Approval ({pendingEvents.length})
          </h2>
          <div className="space-y-3">
            {pendingEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {event.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md ${STATUS_COLORS[event.status]}`}
                      >
                        {event.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {CATEGORY_LABELS[event.category] ?? event.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {event.raw_body}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-foreground">
                        {event.iso_date
                          ? new Date(event.iso_date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              },
                            )
                          : "No date detected"}
                      </span>
                      {event.is_all_day && (
                        <span className="text-muted-foreground">All Day</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <form action={approveEvent.bind(null, event.id)}>
                      <button
                        type="submit"
                        className="rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={skipEvent.bind(null, event.id)}>
                      <button
                        type="submit"
                        className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Skip
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Events */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Event History</h2>
        {processedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No processed events yet.
          </p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Event</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {processedEvents.map((event) => (
                  <tr key={event.id} className="border-t border-border/50">
                    <td className="p-3 text-foreground">{event.title}</td>
                    <td className="p-3 text-muted-foreground">
                      {event.iso_date
                        ? new Date(event.iso_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted">
                        {CATEGORY_LABELS[event.category] ?? event.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md ${STATUS_COLORS[event.status]}`}
                      >
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
