/**
 * Integration tests for the Review System round-trip workflow.
 *
 * These tests require OmniFocus to be running on the test machine.
 * They verify the complete tool chain: set interval → mark reviewed → get for review.
 *
 * NOTE: Integration tests are skipped by default (describe.skip).
 * Remove `.skip` to run with a live OmniFocus instance.
 */
import { describe, expect, it } from 'vitest';
import { getProjectsForReview } from '../../../src/tools/primitives/getProjectsForReview.js';
import { markReviewed } from '../../../src/tools/primitives/markReviewed.js';
import { setReviewInterval } from '../../../src/tools/primitives/setReviewInterval.js';

// Integration tests require a running OmniFocus instance
// Use describe.skip for CI, remove .skip for local integration testing
describe.skip('Review Workflow Integration Tests (requires OmniFocus)', () => {
  // SC-007: Round-trip verification
  it('should complete a full review workflow: set interval → mark reviewed → get for review', async () => {
    // Step 1: Get a known project (adjust ID for your OmniFocus database)
    const testProjectId = 'TEST_PROJECT_ID'; // Replace with a real project ID

    // Step 2: Set review interval to 1 week
    const setResult = await setReviewInterval({
      projects: [{ id: testProjectId }],
      interval: { steps: 1, unit: 'weeks' },
      recalculateNextReview: true
    });

    expect(setResult.success).toBe(true);
    if (setResult.success) {
      expect(setResult.results[0].success).toBe(true);
      expect(setResult.results[0].newInterval).toEqual({ steps: 1, unit: 'weeks' });
    }

    // Step 3: Mark project as reviewed
    const markResult = await markReviewed({
      projects: [{ id: testProjectId }]
    });

    expect(markResult.success).toBe(true);
    if (markResult.success) {
      expect(markResult.results[0].success).toBe(true);
      expect(markResult.results[0].newNextReviewDate).toBeDefined();
    }

    // Step 4: Verify project appears in upcoming reviews (7 days out)
    const getResult = await getProjectsForReview({
      includeFuture: true,
      futureDays: 7
    });

    expect(getResult.success).toBe(true);
    if (getResult.success) {
      const found = getResult.projects.find((p) => p.id === testProjectId);
      expect(found).toBeDefined();
    }
  });

  // SC-002: Date calculation accuracy for all interval units
  it('should calculate nextReviewDate correctly for days interval', async () => {
    const testProjectId = 'TEST_PROJECT_ID';

    await setReviewInterval({
      projects: [{ id: testProjectId }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: true
    });

    const result = await markReviewed({
      projects: [{ id: testProjectId }]
    });

    expect(result.success).toBe(true);
    if (result.success && result.results[0].success) {
      const newDate = new Date(result.results[0].newNextReviewDate ?? '');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + 7);

      // Allow 1-day tolerance for timezone/midnight edge cases
      const diffMs = Math.abs(newDate.getTime() - expectedDate.getTime());
      expect(diffMs).toBeLessThan(2 * 24 * 60 * 60 * 1000);
    }
  });

  // SC-003: Batch mark_reviewed with mixed valid/invalid projects
  it('should handle batch mark_reviewed with mixed valid/invalid projects', async () => {
    const result = await markReviewed({
      projects: [
        { id: 'VALID_PROJECT_ID' }, // Replace with a real ID
        { id: 'nonexistent-project-id-12345' },
        { name: 'Nonexistent Project Name 99999' }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(3);
      // First should succeed (if valid ID used), others should fail
      expect(result.summary.total).toBe(3);
      expect(result.summary.failed).toBeGreaterThanOrEqual(2);
    }
  });

  // SC-006: Disable reviews with null interval
  it('should exclude project from review after disabling reviews', async () => {
    const testProjectId = 'TEST_PROJECT_ID';

    // Disable reviews
    const disableResult = await setReviewInterval({
      projects: [{ id: testProjectId }],
      interval: null
    });

    expect(disableResult.success).toBe(true);
    if (disableResult.success) {
      expect(disableResult.results[0].success).toBe(true);
      expect(disableResult.results[0].newInterval).toBeNull();
    }

    // Verify excluded from review query
    const getResult = await getProjectsForReview({ includeAll: true });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      const found = getResult.projects.find((p) => p.id === testProjectId);
      expect(found).toBeUndefined(); // Should not appear — no reviewInterval
    }
  });

  // SC-001: Performance check (structure only — manual verification for 500+ projects)
  it('should return response with correct structure', async () => {
    const result = await getProjectsForReview({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('dueCount');
      expect(result).toHaveProperty('upcomingCount');
      expect(Array.isArray(result.projects)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    }
  });

  // SC-005: Disambiguation test
  it('should return disambiguation error when name matches multiple projects', async () => {
    // This test requires two projects with the same name in OmniFocus
    const result = await markReviewed({
      projects: [{ name: 'DUPLICATE_PROJECT_NAME' }] // Replace with actual duplicate name
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.results[0].candidates).toBeDefined();
      expect(result.results[0].candidates?.length).toBeGreaterThan(1);
    }
  });
});
