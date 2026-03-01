import type { Connector } from "./types";
import { caldavConnector } from "./caldav";
import { homeAssistantConnector } from "./home-assistant";
import { immichConnector } from "./immich";
import { discordConnector } from "./discord";

class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(connector: Connector) {
    this.connectors.set(connector.type, connector);
  }

  get(type: string): Connector {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new Error(`Unknown connector type: ${type}`);
    }
    return connector;
  }

  list(): Connector[] {
    return Array.from(this.connectors.values());
  }

  has(type: string): boolean {
    return this.connectors.has(type);
  }
}

export const connectorRegistry = new ConnectorRegistry();

// Register all built-in connectors
connectorRegistry.register(caldavConnector);
connectorRegistry.register(homeAssistantConnector);
connectorRegistry.register(immichConnector);
connectorRegistry.register(discordConnector);
