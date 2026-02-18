import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getCacheManager, resetCacheManager } from './cacheManager.js';

// Mock executeOmniFocusScript to avoid requiring OmniFocus
vi.mock('./scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn().mockResolvedValue({ checksum: 'mock-checksum' }),
}));

describe('OmniFocusCacheManager', () => {
  beforeEach(() => {
    resetCacheManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getCacheManager returns a singleton', () => {
    const cm1 = getCacheManager();
    const cm2 = getCacheManager();
    expect(cm1).toBe(cm2);
  });

  it('resetCacheManager creates a fresh instance', () => {
    const cm1 = getCacheManager();
    resetCacheManager();
    const cm2 = getCacheManager();
    expect(cm1).not.toBe(cm2);
  });

  it('get returns null for unknown key', async () => {
    const cm = getCacheManager({ useChecksum: false });
    const result = await cm.get('nonexistent');
    expect(result).toBeNull();
  });

  it('set then get returns the stored data', async () => {
    const cm = getCacheManager({ useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    await cm.set('test-key', data);
    const result = await cm.get('test-key');
    expect(result).toEqual(data);
  });

  it('data expires after TTL', async () => {
    vi.useFakeTimers();
    const cm = getCacheManager({ ttlSeconds: 1, useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    await cm.set('key', data);
    expect(await cm.get('key')).toEqual(data);

    // Advance time beyond TTL
    vi.advanceTimersByTime(2000);
    expect(await cm.get('key')).toBeNull();

    vi.useRealTimers();
  });

  it('invalidate removes a specific entry', async () => {
    const cm = getCacheManager({ useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    await cm.set('key1', data);
    await cm.set('key2', data);

    cm.invalidate('key1');
    expect(await cm.get('key1')).toBeNull();
    expect(await cm.get('key2')).toEqual(data);
  });

  it('clear removes all entries', async () => {
    const cm = getCacheManager({ useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    await cm.set('key1', data);
    await cm.set('key2', data);

    cm.clear();
    expect(await cm.get('key1')).toBeNull();
    expect(await cm.get('key2')).toBeNull();
  });

  it('getStats returns correct entry count', async () => {
    const cm = getCacheManager({ useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    expect(cm.getStats().entries).toBe(0);

    await cm.set('key1', data);
    expect(cm.getStats().entries).toBe(1);

    await cm.set('key2', data);
    expect(cm.getStats().entries).toBe(2);
  });

  it('trackHit and trackMiss affect hit rate', () => {
    const cm = getCacheManager({ useChecksum: false });
    expect(cm.getStats().hitRate).toBe(0);

    cm.trackHit();
    cm.trackHit();
    cm.trackMiss();
    // 2 hits out of 3 total = 66.67%
    expect(cm.getStats().hitRate).toBeCloseTo(66.67, 0);
  });

  it('getStats returns null oldestEntry when empty', () => {
    const cm = getCacheManager({ useChecksum: false });
    expect(cm.getStats().oldestEntry).toBeNull();
  });

  it('getStats returns correct oldestEntry', async () => {
    vi.useFakeTimers();
    const cm = getCacheManager({ useChecksum: false });
    const data = {
      exportDate: '2024-01-01',
      tasks: [],
      projects: {},
      folders: {},
      tags: {},
    };

    const now = new Date('2024-06-01T00:00:00');
    vi.setSystemTime(now);
    await cm.set('key1', data);

    vi.advanceTimersByTime(1000);
    await cm.set('key2', data);

    const stats = cm.getStats();
    expect(stats.oldestEntry).toEqual(now);

    vi.useRealTimers();
  });
});
