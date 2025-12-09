import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/listPerspectives.js', () => ({
  listPerspectives: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/listPerspectives.js';
import { listPerspectives } from '../../../src/tools/primitives/listPerspectives.js';

const mockListPerspectives = vi.mocked(listPerspectives);

describe('listPerspectives definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate empty object (all defaults)', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with includeBuiltIn', () => {
      const result = schema.safeParse({ includeBuiltIn: false });
      expect(result.success).toBe(true);
    });

    it('should validate with includeCustom', () => {
      const result = schema.safeParse({ includeCustom: false });
      expect(result.success).toBe(true);
    });

    it('should validate with both options', () => {
      const result = schema.safeParse({ includeBuiltIn: true, includeCustom: false });
      expect(result.success).toBe(true);
    });
  });

  describe('handler success cases', () => {
    it('should return formatted perspective list', async () => {
      mockListPerspectives.mockResolvedValue({
        success: true,
        perspectives: [
          { id: 'inbox', name: 'Inbox', type: 'builtin', isBuiltIn: true, canModify: false },
          { id: 'projects', name: 'Projects', type: 'builtin', isBuiltIn: true, canModify: false },
          { id: 'custom-1', name: 'My View', type: 'custom', isBuiltIn: false, canModify: true }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Available Perspectives');
      expect(result.content[0]?.text).toContain('Inbox');
      expect(result.content[0]?.text).toContain('Projects');
      expect(result.content[0]?.text).toContain('My View');
      expect(result.content[0]?.text).toContain('Built-in Perspectives');
      expect(result.content[0]?.text).toContain('Custom Perspectives');
    });

    it('should return only built-in perspectives', async () => {
      mockListPerspectives.mockResolvedValue({
        success: true,
        perspectives: [
          { id: 'inbox', name: 'Inbox', type: 'builtin', isBuiltIn: true, canModify: false }
        ]
      });

      const result = await handler({ includeBuiltIn: true, includeCustom: false }, mockExtra);

      expect(result.content[0]?.text).toContain('Inbox');
    });

    it('should return only custom perspectives', async () => {
      mockListPerspectives.mockResolvedValue({
        success: true,
        perspectives: [
          { id: 'custom-1', name: 'My View', type: 'custom', isBuiltIn: false, canModify: true }
        ]
      });

      const result = await handler({ includeBuiltIn: false, includeCustom: true }, mockExtra);

      expect(result.content[0]?.text).toContain('My View');
    });

    it('should handle empty perspectives list', async () => {
      mockListPerspectives.mockResolvedValue({
        success: true,
        perspectives: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('No perspectives found');
    });
  });

  describe('handler error cases', () => {
    it('should return error when listing fails', async () => {
      mockListPerspectives.mockResolvedValue({
        success: false,
        error: 'Failed to list perspectives'
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Failed to list perspectives');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockListPerspectives.mockRejectedValue(new Error('Connection error'));

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Error');
      expect(result.isError).toBe(true);
    });
  });
});
