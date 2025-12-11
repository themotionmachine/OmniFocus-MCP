import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setPlannedDate } from '../../../src/tools/primitives/setPlannedDate.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T027: Unit tests for setPlannedDate primitive
describe('setPlannedDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set planned date by task ID', async () => {
    const mockResponse = {
      success: true,
      id: 'task123',
      name: 'Test Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      id: 'task123',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task123');
      expect(result.name).toBe('Test Task');
    }
  });

  it('should set planned date by task name', async () => {
    const mockResponse = {
      success: true,
      id: 'task456',
      name: 'Named Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      name: 'Named Task',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task456');
      expect(result.name).toBe('Named Task');
    }
  });

  it('should clear planned date when null', async () => {
    const mockResponse = {
      success: true,
      id: 'task789',
      name: 'Task to Clear'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      id: 'task789',
      plannedDate: null
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task789');
      expect(result.name).toBe('Task to Clear');
    }
  });

  it('should handle ISO 8601 date formats', async () => {
    const mockResponse = {
      success: true,
      id: 'task123',
      name: 'Test Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    // Test with different ISO 8601 formats
    const result = await setPlannedDate({
      id: 'task123',
      plannedDate: '2025-12-15T14:30:00-08:00'
    });

    expect(result.success).toBe(true);
  });

  it('should return error when task not found by ID', async () => {
    const mockResponse = {
      success: false,
      error: "Task 'nonexistent' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      id: 'nonexistent',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error when task not found by name', async () => {
    const mockResponse = {
      success: false,
      error: "Task 'Nonexistent Task' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      name: 'Nonexistent Task',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return version error for OmniFocus < 4.7', async () => {
    const mockResponse = {
      success: false,
      error: 'Planned date requires OmniFocus v4.7 or later'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      id: 'task123',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Planned date requires OmniFocus v4.7 or later');
    }
  });

  it('should return migration error when not migrated', async () => {
    const mockResponse = {
      success: false,
      error:
        'Planned date requires database migration. Please open OmniFocus preferences to migrate.'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      id: 'task123',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('database migration');
    }
  });

  it('should return disambiguation error for multiple name matches', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple tasks match name 'Test'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      name: 'Test',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toHaveLength(2);
      expect(result.matchingIds).toEqual(['task1', 'task2']);
    }
  });

  it('should handle disambiguation when clearing date', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple tasks match name 'Ambiguous'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2', 'task3']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await setPlannedDate({
      name: 'Ambiguous',
      plannedDate: null
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should call executeOmniFocusScript with correct parameters', async () => {
    const mockResponse = {
      success: true,
      id: 'task123',
      name: 'Test Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    await setPlannedDate({
      id: 'task123',
      plannedDate: '2025-12-15T09:00:00Z'
    });

    expect(executeOmniFocusScript).toHaveBeenCalledTimes(1);
    expect(executeOmniFocusScript).toHaveBeenCalledWith(expect.any(String));
  });
});
