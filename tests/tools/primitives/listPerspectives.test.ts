import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

import { listPerspectives } from '../../../src/tools/primitives/listPerspectives.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('listPerspectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPerspectives = [
    { id: 'inbox', name: 'Inbox', type: 'builtin' as const, isBuiltIn: true, canModify: false },
    {
      id: 'projects',
      name: 'Projects',
      type: 'builtin' as const,
      isBuiltIn: true,
      canModify: false
    },
    {
      id: 'forecast',
      name: 'Forecast',
      type: 'builtin' as const,
      isBuiltIn: true,
      canModify: false
    },
    {
      id: 'custom-1',
      name: 'My Perspective',
      type: 'custom' as const,
      isBuiltIn: false,
      canModify: true
    },
    {
      id: 'custom-2',
      name: 'Work Focus',
      type: 'custom' as const,
      isBuiltIn: false,
      canModify: true
    }
  ];

  describe('successful listing', () => {
    it('should list all perspectives by default', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives();

      expect(result.success).toBe(true);
      expect(result.perspectives).toHaveLength(5);
    });

    it('should list with default parameters when called with empty object', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(true);
      expect(result.perspectives).toHaveLength(5);
    });

    it('should include both builtin and custom when both true', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives({
        includeBuiltIn: true,
        includeCustom: true
      });

      expect(result.success).toBe(true);
      expect(result.perspectives).toHaveLength(5);
    });
  });

  describe('filtering', () => {
    it('should filter out built-in perspectives when includeBuiltIn is false', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives({ includeBuiltIn: false });

      expect(result.success).toBe(true);
      expect(result.perspectives?.every((p) => p.type !== 'builtin')).toBe(true);
      expect(result.perspectives).toHaveLength(2);
    });

    it('should filter out custom perspectives when includeCustom is false', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives({ includeCustom: false });

      expect(result.success).toBe(true);
      expect(result.perspectives?.every((p) => p.type !== 'custom')).toBe(true);
      expect(result.perspectives).toHaveLength(3);
    });

    it('should return empty array when both filters are false', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: mockPerspectives
      });

      const result = await listPerspectives({
        includeBuiltIn: false,
        includeCustom: false
      });

      expect(result.success).toBe(true);
      expect(result.perspectives).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle script errors', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Failed to list perspectives'
      });

      const result = await listPerspectives();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to list perspectives');
    });

    it('should handle execution exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('Connection failed'));

      const result = await listPerspectives();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await listPerspectives();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle missing perspectives array', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({});

      const result = await listPerspectives();

      expect(result.success).toBe(true);
      expect(result.perspectives).toEqual([]);
    });
  });

  describe('perspective metadata', () => {
    it('should preserve perspective properties', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectives: [
          {
            id: 'custom-perspective',
            name: 'My Custom Perspective',
            type: 'custom' as const,
            isBuiltIn: false,
            canModify: true,
            filterRules: {
              availability: ['Available'],
              flagged: true,
              dueWithin: 7
            }
          }
        ]
      });

      const result = await listPerspectives();

      expect(result.success).toBe(true);
      expect(result.perspectives?.[0]).toMatchObject({
        id: 'custom-perspective',
        name: 'My Custom Perspective',
        type: 'custom',
        isBuiltIn: false,
        canModify: true
      });
    });
  });
});
