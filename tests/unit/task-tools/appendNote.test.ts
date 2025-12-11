import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendNote } from '../../../src/tools/primitives/appendNote.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T037: Unit tests for appendNote primitive
describe('appendNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should append note by task ID', async () => {
    const mockResponse = {
      success: true,
      id: 'task123',
      name: 'Test Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await appendNote({
      id: 'task123',
      text: 'Additional notes here'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task123');
      expect(result.name).toBe('Test Task');
    }
  });

  it('should append note by task name', async () => {
    const mockResponse = {
      success: true,
      id: 'task456',
      name: 'Named Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await appendNote({
      name: 'Named Task',
      text: 'More notes'
    });

    expect(result.success).toBe(true);
  });

  it('should handle multiline text', async () => {
    const mockResponse = {
      success: true,
      id: 'task123',
      name: 'Test Task'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await appendNote({
      id: 'task123',
      text: 'Line 1\nLine 2\nLine 3'
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();
  });

  it('should return error when task not found', async () => {
    const mockResponse = {
      success: false,
      error: "Task 'nonexistent' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await appendNote({
      id: 'nonexistent',
      text: 'Some text'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for multiple name matches', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple tasks match name 'Test'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2', 'task3']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await appendNote({
      name: 'Test',
      text: 'Some text'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toHaveLength(3);
    }
  });
});
