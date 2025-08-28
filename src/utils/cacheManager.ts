import { OmnifocusDatabase } from '../types.js';
import { executeOmniFocusScript } from './scriptExecution.js';

interface CacheEntry {
  data: OmnifocusDatabase;
  timestamp: Date;
  checksum?: string;
}

interface CacheOptions {
  ttlSeconds?: number;  // Time to live in seconds
  maxSize?: number;     // Maximum cache size in MB
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
      const currentChecksum = await this.getDatabaseChecksum();
      if (currentChecksum !== entry.checksum) {
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
    
    const checksum = this.options.useChecksum ? await this.getDatabaseChecksum() : undefined;
    
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
    
    this.cache.forEach(entry => {
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
    try {
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
      
      // Write to temp file and execute
      const fs = await import('fs');
      const tempFile = `/tmp/omnifocus_checksum_${Date.now()}.js`;
      fs.writeFileSync(tempFile, script);
      
      const result = await executeOmniFocusScript(tempFile);
      fs.unlinkSync(tempFile);
      
      return result.checksum || `fallback-${Date.now()}`;
    } catch (error) {
      console.error('Error getting database checksum:', error);
      return `error-${Date.now()}`;
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