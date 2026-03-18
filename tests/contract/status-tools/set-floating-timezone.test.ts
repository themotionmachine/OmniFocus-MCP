import { describe, expect, it } from 'vitest';
import {
  SetFloatingTimezoneErrorSchema,
  SetFloatingTimezoneInputSchema,
  SetFloatingTimezoneResponseSchema,
  SetFloatingTimezoneSuccessSchema
} from '../../../src/contracts/status-tools/set-floating-timezone.js';

// Contract tests for set-floating-timezone schemas

describe('SetFloatingTimezoneInputSchema', () => {
  describe('id / name (at least one required)', () => {
    it('should accept id only', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        enabled: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        name: 'My Task',
        enabled: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        name: 'My Task',
        enabled: true
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither id nor name provided', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        enabled: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty id and no name', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: '',
        enabled: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name and no id', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        name: '',
        enabled: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject both id and name as empty strings', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: '',
        name: '',
        enabled: true
      });
      expect(result.success).toBe(false);
    });
  });

  describe('enabled field (required boolean)', () => {
    it('should accept enabled=true', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        enabled: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should accept enabled=false', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        enabled: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });

    it('should reject missing enabled field', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc'
      });
      expect(result.success).toBe(false);
    });

    it('should reject enabled as string', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        enabled: 'true'
      });
      expect(result.success).toBe(false);
    });

    it('should reject enabled as null', () => {
      const result = SetFloatingTimezoneInputSchema.safeParse({
        id: 'task-abc',
        enabled: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetFloatingTimezoneSuccessSchema', () => {
  it('should accept valid task success response', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid project success response', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'proj-xyz',
      name: 'My Project',
      itemType: 'project',
      floatingTimezone: false
    });
    expect(result.success).toBe(true);
  });

  it('should require success to be literal true', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: false,
      id: 'task-abc',
      name: 'My Task',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });

  it('should require id field', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      name: 'My Task',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });

  it('should require name field', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'task-abc',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });

  it('should require itemType field', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid itemType', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task',
      itemType: 'folder',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });

  it('should require floatingTimezone field', () => {
    const result = SetFloatingTimezoneSuccessSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task',
      itemType: 'task'
    });
    expect(result.success).toBe(false);
  });
});

describe('SetFloatingTimezoneErrorSchema', () => {
  describe('standard error', () => {
    it('should accept valid standard error response', () => {
      const result = SetFloatingTimezoneErrorSchema.safeParse({
        success: false,
        error: "Item 'task-abc' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should require error field', () => {
      const result = SetFloatingTimezoneErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('disambiguation error', () => {
    it('should accept disambiguation error response', () => {
      const result = SetFloatingTimezoneErrorSchema.safeParse({
        success: false,
        error: "Multiple items match 'My Task'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1', 'task-2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error even with 1 matchingId (falls through to standard error)', () => {
      // The union tries DisambiguationErrorSchema first (fails min(2)), then
      // falls through to standard error which accepts any { success: false, error: string }.
      // This is intentional — the standard error branch is the safety net.
      const result = SetFloatingTimezoneErrorSchema.safeParse({
        success: false,
        error: "Multiple items match 'My Task'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with 3+ matchingIds', () => {
      const result = SetFloatingTimezoneErrorSchema.safeParse({
        success: false,
        error: "Multiple items match 'My Task'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1', 'task-2', 'task-3']
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('SetFloatingTimezoneResponseSchema', () => {
  it('should parse success=true correctly', () => {
    const result = SetFloatingTimezoneResponseSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('should parse success=false standard error correctly', () => {
    const result = SetFloatingTimezoneResponseSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('should parse disambiguation error correctly', () => {
    const result = SetFloatingTimezoneResponseSchema.safeParse({
      success: false,
      error: "Multiple items match 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task-1', 'task-2']
    });
    expect(result.success).toBe(true);
    if (result.success && !result.data.success) {
      expect('code' in result.data).toBe(true);
    }
  });

  it('should reject when success is missing', () => {
    const result = SetFloatingTimezoneResponseSchema.safeParse({
      id: 'task-abc',
      name: 'My Task',
      itemType: 'task',
      floatingTimezone: true
    });
    expect(result.success).toBe(false);
  });
});
