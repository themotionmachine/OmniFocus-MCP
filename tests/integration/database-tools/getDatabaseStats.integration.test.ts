import { describe, expect, it } from 'vitest';
import { getDatabaseStats } from '../../../src/tools/primitives/getDatabaseStats.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('getDatabaseStats integration', () => {
  skipIfOmniFocusUnavailable();

  it('should return a well-formed response with all required fields', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      // Top-level fields
      expect(typeof result.tasks).toBe('object');
      expect(typeof result.projects).toBe('object');
      expect(typeof result.folders).toBe('number');
      expect(typeof result.tags).toBe('number');
      expect(typeof result.inbox).toBe('number');
    }
  });

  it('should return non-negative counts for all task stats', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks.available).toBeGreaterThanOrEqual(0);
      expect(result.tasks.blocked).toBeGreaterThanOrEqual(0);
      expect(result.tasks.completed).toBeGreaterThanOrEqual(0);
      expect(result.tasks.dropped).toBeGreaterThanOrEqual(0);
      expect(result.tasks.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return non-negative counts for all project stats', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects.active).toBeGreaterThanOrEqual(0);
      expect(result.projects.onHold).toBeGreaterThanOrEqual(0);
      expect(result.projects.completed).toBeGreaterThanOrEqual(0);
      expect(result.projects.dropped).toBeGreaterThanOrEqual(0);
      expect(result.projects.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have task total equal to sum of available + blocked + completed + dropped', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      const expectedTotal =
        result.tasks.available +
        result.tasks.blocked +
        result.tasks.completed +
        result.tasks.dropped;
      expect(result.tasks.total).toBe(expectedTotal);
    }
  });

  it('should have project total equal to sum of active + onHold + completed + dropped', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      const expectedTotal =
        result.projects.active +
        result.projects.onHold +
        result.projects.completed +
        result.projects.dropped;
      expect(result.projects.total).toBe(expectedTotal);
    }
  });

  it('should return non-negative folder, tag, and inbox counts', async () => {
    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.folders).toBeGreaterThanOrEqual(0);
      expect(result.tags).toBeGreaterThanOrEqual(0);
      expect(result.inbox).toBeGreaterThanOrEqual(0);
    }
  });
});
