import type { StringCache } from "../../core/interfaces/cache";

type Entry = { value: string; expiresAtMs: number };

export class MemoryStringCache implements StringCache {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() >= e.expiresAtMs) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAtMs = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAtMs });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
