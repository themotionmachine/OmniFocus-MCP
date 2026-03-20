/**
 * Integration tests for the TaskPaper Import/Export/Validate workflow.
 *
 * These tests require OmniFocus to be running on the test machine.
 * They verify the complete tool chain: validate -> import -> export round-trip.
 *
 * NOTE: Integration tests are skipped by default (describe.skip).
 * Remove `.skip` to run with a live OmniFocus instance.
 */
import { describe, expect, it } from 'vitest';
import { exportTaskpaper } from '../../../src/tools/primitives/exportTaskpaper.js';
import { importTaskpaper } from '../../../src/tools/primitives/importTaskpaper.js';
import { validateTransportText } from '../../../src/tools/primitives/validateTransportText.js';

// Integration tests require a running OmniFocus instance
// Use describe.skip for CI, remove .skip for local integration testing
describe.skip('TaskPaper Workflow Integration Tests (requires OmniFocus)', () => {
  // Validate -> Import round-trip
  it('should validate transport text before importing', () => {
    const text = '- Integration Test Task @flagged @tags(test-tag) @due(2026-12-31)';
    const validation = validateTransportText({ text });

    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(validation.items).toHaveLength(1);
      expect(validation.items[0].name).toBe('Integration Test Task');
      expect(validation.items[0].flagged).toBe(true);
      expect(validation.items[0].tags).toContain('test-tag');
      expect(validation.items[0].dueDate).toBe('2026-12-31');
      expect(validation.warnings).toHaveLength(0);
    }
  });

  // Import creates items in OmniFocus
  it('should import transport text and return created item IDs', async () => {
    const text = '- TaskPaper Integration Test Item @tags(integration-test)';
    const result = await importTaskpaper({ text });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].name).toBe('TaskPaper Integration Test Item');
      expect(result.items[0].type).toBe('task');
      expect(result.items[0].id).toBeDefined();
      expect(result.summary.totalCreated).toBe(1);
      expect(result.summary.tasks).toBe(1);
      expect(result.summary.movedToProject).toBe(false);
    }
  });

  // Import with nested tasks
  it('should import nested tasks and collect all IDs recursively', async () => {
    const text = '- Parent Task\n\t- Child Task 1\n\t- Child Task 2\n\t\t- Grandchild Task';
    const result = await importTaskpaper({ text });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items.length).toBeGreaterThanOrEqual(4);
      expect(result.summary.totalCreated).toBeGreaterThanOrEqual(4);
    }
  });

  // Export by task IDs
  it('should export tasks by ID to transport text', async () => {
    // First import a known task
    const importResult = await importTaskpaper({
      text: '- Export Round-Trip Test @flagged @due(2026-06-15)'
    });

    expect(importResult.success).toBe(true);
    if (!importResult.success) return;

    const taskId = importResult.items[0].id;

    // Export that task
    const exportResult = await exportTaskpaper({
      taskIds: [taskId],
      status: 'active'
    });

    expect(exportResult.success).toBe(true);
    if (exportResult.success) {
      expect(exportResult.transportText).toContain('Export Round-Trip Test');
      expect(exportResult.transportText).toContain('@flagged');
      expect(exportResult.summary.totalItems).toBe(1);
      expect(exportResult.summary.tasks).toBe(1);
    }
  });

  // Whitespace rejection
  it('should reject whitespace-only import text', async () => {
    const result = await importTaskpaper({ text: '   \n\t\n  ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('empty');
    }
  });

  // Validate returns zero-item for empty input
  it('should return zero-item report for empty validation input', () => {
    const result = validateTransportText({ text: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toHaveLength(0);
      expect(result.summary.tasks).toBe(0);
      expect(result.summary.projects).toBe(0);
    }
  });

  // Validate detects warnings
  it('should detect warnings for unrecognized syntax', () => {
    const result = validateTransportText({ text: '??? unknown\n- Valid task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.items).toHaveLength(1);
    }
  });
});
