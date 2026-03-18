import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSetFloatingTimezoneScript,
  setFloatingTimezone
} from '../../../src/tools/primitives/setFloatingTimezone.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// Unit tests for setFloatingTimezone primitive

describe('setFloatingTimezone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enable floating timezone', () => {
    it('should enable floating timezone on a task by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task-abc',
        name: 'My Task',
        itemType: 'task',
        floatingTimezone: true
      });

      const result = await setFloatingTimezone({ id: 'task-abc', enabled: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task-abc');
        expect(result.name).toBe('My Task');
        expect(result.itemType).toBe('task');
        expect(result.floatingTimezone).toBe(true);
      }
    });

    it('should enable floating timezone on a project by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-xyz',
        name: 'My Project',
        itemType: 'project',
        floatingTimezone: true
      });

      const result = await setFloatingTimezone({ id: 'proj-xyz', enabled: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('proj-xyz');
        expect(result.itemType).toBe('project');
        expect(result.floatingTimezone).toBe(true);
      }
    });
  });

  describe('disable floating timezone', () => {
    it('should disable floating timezone (enabled=false)', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task-abc',
        name: 'My Task',
        itemType: 'task',
        floatingTimezone: false
      });

      const result = await setFloatingTimezone({ id: 'task-abc', enabled: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.floatingTimezone).toBe(false);
      }
    });
  });

  describe('name-based lookup', () => {
    it('should find and update item by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task-resolved',
        name: 'Named Task',
        itemType: 'task',
        floatingTimezone: true
      });

      const result = await setFloatingTimezone({ name: 'Named Task', enabled: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task-resolved');
        expect(result.name).toBe('Named Task');
      }
    });

    it('should return disambiguation error for multiple name matches', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Multiple items match 'Duplicate'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1', 'task-2']
      });

      const result = await setFloatingTimezone({ name: 'Duplicate', enabled: true });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
        expect(result.matchingIds).toEqual(['task-1', 'task-2']);
      }
    });
  });

  describe('error cases', () => {
    it('should return error when item not found by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Item 'nonexistent' not found"
      });

      const result = await setFloatingTimezone({ id: 'nonexistent', enabled: true });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return error when item not found by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Item 'No Such Task' not found"
      });

      const result = await setFloatingTimezone({ name: 'No Such Task', enabled: true });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should handle catastrophic failure (OmniJS throws)', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not running'
      });

      const result = await setFloatingTimezone({ id: 'task-abc', enabled: true });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('task with no dates', () => {
    it('should apply floating timezone setting even when task has no dates', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task-nodates',
        name: 'Task Without Dates',
        itemType: 'task',
        floatingTimezone: true
      });

      const result = await setFloatingTimezone({ id: 'task-nodates', enabled: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.floatingTimezone).toBe(true);
      }
    });
  });

  describe('executeOmniJS call', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task-abc',
        name: 'My Task',
        itemType: 'task',
        floatingTimezone: true
      });

      await setFloatingTimezone({ id: 'task-abc', enabled: true });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
      expect(executeOmniJS).toHaveBeenCalledWith(expect.any(String));
    });
  });
});

describe('generateSetFloatingTimezoneScript', () => {
  it('should contain shouldUseFloatingTimeZone assignment', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'task-abc', enabled: true });
    expect(script).toContain('shouldUseFloatingTimeZone');
  });

  it('should contain true when enabled=true', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'task-abc', enabled: true });
    expect(script).toContain('true');
    expect(script).toContain('task-abc');
  });

  it('should contain false when enabled=false', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'task-abc', enabled: false });
    expect(script).toContain('false');
  });

  it('should search by name when id not provided', () => {
    const script = generateSetFloatingTimezoneScript({ name: 'My Task', enabled: true });
    expect(script).toContain('My Task');
    expect(script).toContain('flattenedTasks');
    expect(script).toContain('flattenedProjects');
  });

  it('should prefer id over name when both provided', () => {
    const script = generateSetFloatingTimezoneScript({
      id: 'task-abc',
      name: 'My Task',
      enabled: true
    });
    expect(script).toContain('task-abc');
    expect(script).toContain('Task.byIdentifier');
  });

  it('should check both tasks and projects when looking up by ID', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'item-abc', enabled: true });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
  });

  it('should return itemType in response', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'task-abc', enabled: true });
    expect(script).toContain('itemType');
  });

  it('should wrap in try-catch with JSON error return', () => {
    const script = generateSetFloatingTimezoneScript({ id: 'task-abc', enabled: true });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should escape special characters in ID', () => {
    const script = generateSetFloatingTimezoneScript({
      id: 'task-with-"quotes"',
      enabled: true
    });
    expect(script).not.toContain('"task-with-"quotes"');
    expect(script).toContain('\\"quotes\\"');
  });
});
