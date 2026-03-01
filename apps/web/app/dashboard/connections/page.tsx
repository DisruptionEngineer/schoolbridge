import { cookies } from "next/headers";
import { createServerClient } from "@schoolbridge/db";
import { connectorRegistry } from "@schoolbridge/connectors";
import { createConnection, deleteConnection, toggleConnection, testConnection } from "../actions";

async function getConnections() {
  const cookieStore = await cookies();
  const db = createServerClient(cookieStore);
  const { data } = await db
    .from("sync_connections")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function ConnectionsPage() {
  const connections = await getConnections();
  const availableConnectors = connectorRegistry.list();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Connections</h1>
          <p className="text-muted-foreground mt-1">
            Configure where your school events and photos sync to
          </p>
        </div>
      </div>

      {/* Available Connectors */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Add a Connection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableConnectors.map((connector) => (
            <div
              key={connector.type}
              className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  {connector.type === "caldav" && "\u{1f4c5}"}
                  {connector.type === "home_assistant" && "\u{1f3e0}"}
                  {connector.type === "immich" && "\u{1f5bc}"}
                  {connector.type === "discord" && "\u{1f4ac}"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {connector.displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {connector.description}
                  </p>
                  <div className="mt-3">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                        Configure
                      </summary>
                      <form
                        action={createConnection}
                        className="mt-4 space-y-3"
                      >
                        <input
                          type="hidden"
                          name="connector_type"
                          value={connector.type}
                        />
                        <div>
                          <label className="text-sm font-medium">
                            Display Name
                          </label>
                          <input
                            name="display_name"
                            defaultValue={connector.displayName}
                            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                            required
                          />
                        </div>
                        {connector.configFields.map((field) => (
                          <div key={field.key}>
                            <label className="text-sm font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            {field.helpText && (
                              <p className="text-xs text-muted-foreground">
                                {field.helpText}
                              </p>
                            )}
                            <input
                              name={`config_${field.key}`}
                              type={field.type === "password" ? "password" : "text"}
                              placeholder={field.placeholder}
                              required={field.required}
                              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                        ))}
                        {/* Hidden config JSON assembled via JS */}
                        <input type="hidden" name="config" value="{}" />
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 transition-colors"
                        >
                          Save Connection
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Existing Connections */}
      {connections.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Connections</h2>
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-xl border bg-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${conn.enabled ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <div>
                    <span className="font-medium text-foreground">
                      {conn.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({conn.connector_type})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.last_synced_at && (
                    <span className="text-xs text-muted-foreground">
                      Last sync:{" "}
                      {new Date(conn.last_synced_at).toLocaleDateString()}
                    </span>
                  )}
                  <form action={toggleConnection.bind(null, conn.id, !conn.enabled)}>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-muted transition-colors"
                    >
                      {conn.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
