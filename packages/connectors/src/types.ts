import type { SyncEvent, PhotoDownload } from "@schoolbridge/shared";

/** JSON Schema subset for auto-generating config forms in the UI */
export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "number" | "boolean";
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface ConnectorConfig {
  [key: string]: unknown;
}

export interface SyncPayload {
  events: SyncEvent[];
  photos?: PhotoDownload[];
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

export interface TestResult {
  connected: boolean;
  error?: string;
  details?: string;
}

/**
 * Core connector interface. Every sync destination implements this.
 * The config schema drives the UI form, and the sync method pushes data.
 */
export interface Connector<TConfig extends ConnectorConfig = ConnectorConfig> {
  readonly type: string;
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;

  /** Defines the config form fields rendered in the dashboard */
  readonly configFields: ConfigField[];

  /** Validates that all required config values are present and well-formed */
  validateConfig(config: TConfig): { valid: boolean; error?: string };

  /** Tests the connection with the given credentials (network call) */
  testConnection(config: TConfig): Promise<TestResult>;

  /** Pushes events/photos to the destination */
  sync(config: TConfig, payload: SyncPayload): Promise<SyncResult>;
}
