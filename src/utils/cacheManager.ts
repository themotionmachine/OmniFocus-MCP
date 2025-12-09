import type { OmnifocusDatabase } from '../types.js';
import { executeOmniFocusScript } from './scriptExecution.js';
import { writeSecureTempFile } from './secureTempFile.js';

interface CacheEntry {
  data: OmnifocusDatabase;
  timestamp: Date;
  checksum?: string | undefined;
}

interface CacheOptions {
  ttlSeconds?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in MB
  useChecksum?: boolean; // Whether to use checksum for validation
}

class OmniFocusCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  private totalSize: number = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttlSeconds: options.ttlSeconds ?? 300, // 5 minutes default
      maxSize: options.maxSize ?? 50, // 50MB default
      useChecksum: options.useChecksum ?? true
    };
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  async get(key: string): Promise<OmnifocusDatabase | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache has expired
    const age = Date.now() - entry.timestamp.getTime();
    if (age > this.options.ttlSeconds * 1000) {
      this.cache.delete(key);
      return null;
    }

    // If using checksums, validate the cache is still current
    if (this.options.useChecksum && entry.checksum) {
      try {
        const currentChecksum = await this.getDatabaseChecksum();
        if (currentChecksum !== entry.checksum) {
          this.cache.delete(key);
          return null;
        }
      } catch (error) {
        // If checksum validation fails, invalidate cache to be safe
        console.error('Error validating cache checksum:', error);
        this.cache.delete(key);
        return null;
      }
    }

    return entry.data;
  }

  /**
   * Store data in cache
   */
  async set(key: string, data: OmnifocusDatabase): Promise<void> {
    // Estimate size (rough approximation)
    const dataSize = JSON.stringify(data).length / (1024 * 1024); // Convert to MB

    // Check if adding this would exceed max size
    if (this.totalSize + dataSize > this.options.maxSize) {
      this.evictOldest();
    }

    let checksum: string | undefined;
    if (this.options.useChecksum) {
      try {
        checksum = await this.getDatabaseChecksum();
      } catch (error) {
        console.error('Error getting checksum for cache:', error);
        // Continue without checksum rather than failing the cache operation
        checksum = undefined;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      checksum
    });

    this.totalSize += dataSize;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    sizeEstimateMB: number;
    oldestEntry: Date | null;
    hitRate: number;
  } {
    let oldestEntry: Date | null = null;

    this.cache.forEach((entry) => {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    });

    return {
      entries: this.cache.size,
      sizeEstimateMB: this.totalSize,
      oldestEntry,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Get a lightweight checksum of the database state
   */
  private async getDatabaseChecksum(): Promise<string> {
    const script = `
      (() => {
        try {
          // Get counts and latest modification times as a simple checksum
          const taskCount = flattenedTasks.length;
          const projectCount = flattenedProjects.length;

          // Get the most recent modification time
          let latestMod = new Date(0);

          flattenedTasks.forEach(task => {
            if (task.modificationDate && task.modificationDate > latestMod) {
              latestMod = task.modificationDate;
            }
          });

          flattenedProjects.forEach(project => {
            if (project.modificationDate && project.modificationDate > latestMod) {
              latestMod = project.modificationDate;
            }
          });

          // Create a simple checksum string
          const checksum = taskCount + "-" + projectCount + "-" + latestMod.getTime();

          return JSON.stringify({ checksum });
        } catch (error) {
          return JSON.stringify({ checksum: "error-" + Date.now() });
        }
      })();
    `;

    // Write to secure temp file and execute
    const tempFile = writeSecureTempFile(script, 'omnifocus_checksum', '.js');

    try {
      const result = (await executeOmniFocusScript(tempFile.path)) as { checksum?: string };
      if (!result || !result.checksum) {
        throw new Error('Invalid checksum result from script');
      }
      return result.checksum;
    } catch (error) {
      console.error('Error getting database checksum:', error);
      // Re-throw with context instead of returning fallback
      throw new Error(
        `Failed to get database checksum: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      tempFile.cleanup();
    }
  }

  /**
   * Evict oldest cache entries when size limit is reached
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      // Recalculate total size (simplified for now)
      this.totalSize *= 0.9;
    }
  }

  // Tracking for hit rate calculation
  private hits = 0;
  private misses = 0;

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }

  trackHit(): void {
    this.hits++;
  }

  trackMiss(): void {
    this.misses++;
  }
}

// Singleton instance
let cacheManager: OmniFocusCacheManager | null = null;

/**
 * Get or create the cache manager instance
 */
export function getCacheManager(options?: CacheOptions): OmniFocusCacheManager {
  if (!cacheManager) {
    cacheManager = new OmniFocusCacheManager(options);
  }
  return cacheManager;
}

/**
 * Reset the cache manager (useful for testing)
 */
export function resetCacheManager(): void {
  if (cacheManager) {
    cacheManager.clear();
  }
  cacheManager = null;
}
