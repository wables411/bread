/**
 * Server-side key-value storage on Netlify Blobs.
 * Falls back to a local JSON directory during `next dev` (no Netlify context).
 */
import { getStore } from "@netlify/blobs";

export interface KvStore {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}

function netlifyKv(name: string): KvStore {
  const store = getStore({ name, consistency: "strong" });
  return {
    async getJSON<T>(key: string): Promise<T | null> {
      const val = await store.get(key, { type: "json" });
      return (val as T) ?? null;
    },
    async setJSON(key, value) {
      await store.setJSON(key, value);
    },
    async listKeys(prefix) {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key);
    },
    async delete(key) {
      await store.delete(key);
    },
  };
}

/** Local filesystem fallback so `next dev` works without Netlify credentials. */
function localKv(name: string): KvStore {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const dir = path.join(process.cwd(), ".netlify", "dev-blobs", name);
  const fileFor = (key: string) =>
    path.join(dir, encodeURIComponent(key) + ".json");
  return {
    async getJSON<T>(key: string): Promise<T | null> {
      try {
        return JSON.parse(fs.readFileSync(fileFor(key), "utf8")) as T;
      } catch {
        return null;
      }
    },
    async setJSON(key, value) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fileFor(key), JSON.stringify(value));
    },
    async listKeys(prefix) {
      try {
        return fs
          .readdirSync(dir)
          .map((f) => decodeURIComponent(f.replace(/\.json$/, "")))
          .filter((k) => k.startsWith(prefix));
      } catch {
        return [];
      }
    },
    async delete(key) {
      try {
        fs.unlinkSync(fileFor(key));
      } catch {
        // already gone
      }
    },
  };
}

export function kv(name: string): KvStore {
  try {
    return netlifyKv(name);
  } catch {
    return localKv(name);
  }
}
