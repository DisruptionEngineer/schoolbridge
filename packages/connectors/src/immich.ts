import type { Connector, SyncPayload, SyncResult, TestResult } from "./types";
import { IMMICH_DEVICE_ID, monthlyAlbumName } from "@schoolbridge/shared";

interface ImmichConfig {
  baseUrl: string;
  apiKey: string;
  defaultAlbumPrefix: string;
}

async function immichFetch(
  config: ImmichConfig,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "x-api-key": config.apiKey,
      Accept: "application/json",
      ...options.headers,
    },
  });
}

async function findOrCreateAlbum(
  config: ImmichConfig,
  albumName: string,
): Promise<string> {
  // List existing albums and check for match
  const listResp = await immichFetch(config, "/api/albums");
  if (!listResp.ok) throw new Error(`Failed to list albums: ${listResp.status}`);
  const albums = (await listResp.json()) as Array<{ id: string; albumName: string }>;
  const existing = albums.find((a) => a.albumName === albumName);
  if (existing) return existing.id;

  // Create new album
  const createResp = await immichFetch(config, "/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumName, description: `Auto-created by SchoolBridge` }),
  });
  if (!createResp.ok) throw new Error(`Failed to create album: ${createResp.status}`);
  const album = (await createResp.json()) as { id: string };
  return album.id;
}

export const immichConnector: Connector<ImmichConfig> = {
  type: "immich",
  displayName: "Immich",
  description: "Upload ClassDojo photos to your self-hosted Immich library with automatic album organization.",
  icon: "image",

  configFields: [
    {
      key: "baseUrl",
      label: "Immich Server URL",
      type: "url",
      placeholder: "http://immich.local:2283",
      required: true,
      helpText: "Your Immich instance URL (usually port 2283)",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Create at Account Settings → API Keys (needs asset.upload + album.create permissions)",
    },
    {
      key: "defaultAlbumPrefix",
      label: "Album Prefix",
      type: "text",
      placeholder: "ClassDojo",
      required: true,
      helpText: "Albums will be named: '{prefix} - March 2026'",
    },
  ],

  validateConfig(config) {
    if (!config.baseUrl?.startsWith("http")) {
      return { valid: false, error: "URL must start with http:// or https://" };
    }
    if (!config.apiKey || config.apiKey.length < 10) {
      return { valid: false, error: "A valid Immich API key is required" };
    }
    if (!config.defaultAlbumPrefix) {
      return { valid: false, error: "Album prefix is required" };
    }
    return { valid: true };
  },

  async testConnection(config): Promise<TestResult> {
    try {
      const resp = await immichFetch(config, "/api/auth/validateToken", {
        method: "POST",
      });
      if (!resp.ok) {
        return { connected: false, error: `HTTP ${resp.status}: Invalid API key` };
      }
      const data = (await resp.json()) as { authStatus: boolean };
      return {
        connected: data.authStatus === true,
        details: "API key validated successfully",
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

    if (!payload.photos?.length) return result;

    for (const photo of payload.photos) {
      try {
        // Download the image from ClassDojo CDN
        const imgResp = await fetch(photo.classdojo_url);
        if (!imgResp.ok) {
          result.errors.push({ id: photo.id, error: `Download failed: ${imgResp.status}` });
          continue;
        }
        const blob = await imgResp.blob();
        const filename = photo.classdojo_url.split("/").pop() || "photo.jpg";
        const now = new Date().toISOString();

        // Upload to Immich
        const formData = new FormData();
        formData.append("assetData", blob, filename);
        formData.append("deviceAssetId", `${photo.source_post_id}-${filename}`);
        formData.append("deviceId", IMMICH_DEVICE_ID);
        formData.append("fileCreatedAt", now);
        formData.append("fileModifiedAt", now);
        formData.append("isFavorite", "false");

        const uploadResp = await immichFetch(config, "/api/assets", {
          method: "POST",
          body: formData,
          headers: {}, // Let browser set Content-Type for FormData
        });

        if (!uploadResp.ok) {
          result.errors.push({ id: photo.id, error: `Upload failed: ${uploadResp.status}` });
          continue;
        }

        const uploadResult = (await uploadResp.json()) as {
          id: string;
          duplicate: boolean;
        };

        if (uploadResult.duplicate) {
          result.skipped++;
          continue;
        }

        // Add to monthly album
        const albumName = photo.album_name || monthlyAlbumName(new Date());
        const albumId = await findOrCreateAlbum(config, albumName);
        await immichFetch(config, `/api/albums/${albumId}/assets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [uploadResult.id] }),
        });

        // Update description with ClassDojo context
        await immichFetch(config, "/api/assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: [uploadResult.id],
            description: `Imported from ClassDojo (post: ${photo.source_post_id})`,
          }),
        });

        result.created++;
      } catch (err) {
        result.errors.push({
          id: photo.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return result;
  },
};
