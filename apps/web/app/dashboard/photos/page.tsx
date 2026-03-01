import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";

export const metadata = { title: "Photos – SchoolBridge" };

export default async function PhotosPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: user } = await supabase.auth.getUser();
  const tenantId = user.user?.app_metadata?.tenant_id;

  const { data: photos } = await supabase
    .from("photo_downloads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const uploaded = photos?.filter((p) => p.status === "uploaded") ?? [];
  const pending = photos?.filter((p) => p.status === "pending") ?? [];
  const failed = photos?.filter((p) => p.status === "failed") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Photos</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          ClassDojo photos synced to your Immich library
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Uploaded" value={uploaded.length} color="success" />
        <StatCard label="Pending" value={pending.length} color="warning" />
        <StatCard label="Failed" value={failed.length} color="danger" />
      </div>

      {/* Photo grid */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Photos</h2>
        {(photos?.length ?? 0) === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
            No photos synced yet. Photos from ClassDojo posts will appear here
            once your source is connected and an Immich connection is configured.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos?.map((photo) => (
              <div
                key={photo.id}
                className="relative rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--muted))] aspect-square flex items-center justify-center"
              >
                <div className="text-center p-3">
                  <PhotoIcon />
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 truncate">
                    {photo.original_url?.split("/").pop() ?? "photo"}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      photo.status === "uploaded"
                        ? "bg-emerald-100 text-emerald-700"
                        : photo.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {photo.status}
                  </span>
                </div>
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
  color,
}: {
  label: string;
  value: number;
  color: "success" | "warning" | "danger";
}) {
  const colorMap = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

function PhotoIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="mx-auto text-[hsl(var(--muted-foreground))]"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
