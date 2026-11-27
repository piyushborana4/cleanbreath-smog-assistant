interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Bounded in-memory TTL cache for AQI snapshots and identical daily plan requests.
 * Prevents unbounded memory growth by evicting the oldest entry when full.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  /**
   * @param defaultTtlMs Default time-to-live in milliseconds.
   * @param maxEntries Maximum number of entries retained in memory.
   */
  constructor(defaultTtlMs: number, maxEntries = 250) {
    this.defaultTtlMs = Math.max(1000, defaultTtlMs);
    this.maxEntries = Math.max(10, maxEntries);
  }

  /**
   * Retrieves a non-expired entry or undefined.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Stores a value with optional custom TTL, evicting oldest entries when over capacity.
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
    });
  }

  /**
   * Clears all cached items (useful for tests).
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns current number of stored keys (including unpruned entries).
   */
  get size(): number {
    return this.store.size;
  }
}
