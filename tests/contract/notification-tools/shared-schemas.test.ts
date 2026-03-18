import { describe, expect, it } from 'vitest';
import {
  NotificationKindSchema,
  NotificationOutputSchema,
  TaskIdentifierSchema
} from '../../../src/contracts/notification-tools/shared/index.js';

// T003: TaskIdentifierSchema contract tests
describe('TaskIdentifierSchema', () => {
  it('should accept taskId only', () => {
    const result = TaskIdentifierSchema.safeParse({ taskId: 'task-123' });
    expect(result.success).toBe(true);
  });

  it('should accept taskName only', () => {
    const result = TaskIdentifierSchema.safeParse({ taskName: 'Buy groceries' });
    expect(result.success).toBe(true);
  });

  it('should accept both taskId and taskName', () => {
    const result = TaskIdentifierSchema.safeParse({
      taskId: 'task-123',
      taskName: 'Buy groceries'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty object (at-least-one refinement)', () => {
    const result = TaskIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject both undefined', () => {
    const result = TaskIdentifierSchema.safeParse({
      taskId: undefined,
      taskName: undefined
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty string taskId (.min(1))', () => {
    const result = TaskIdentifierSchema.safeParse({ taskId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty string taskName (.min(1))', () => {
    const result = TaskIdentifierSchema.safeParse({ taskName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject non-string taskId', () => {
    const result = TaskIdentifierSchema.safeParse({ taskId: 42 });
    expect(result.success).toBe(false);
  });
});

// T004: NotificationKindSchema contract tests
describe('NotificationKindSchema', () => {
  it('should accept "Absolute"', () => {
    expect(NotificationKindSchema.safeParse('Absolute').success).toBe(true);
  });

  it('should accept "DueRelative"', () => {
    expect(NotificationKindSchema.safeParse('DueRelative').success).toBe(true);
  });

  it('should accept "DeferRelative"', () => {
    expect(NotificationKindSchema.safeParse('DeferRelative').success).toBe(true);
  });

  it('should accept "Unknown"', () => {
    expect(NotificationKindSchema.safeParse('Unknown').success).toBe(true);
  });

  it('should reject invalid kind values', () => {
    expect(NotificationKindSchema.safeParse('Invalid').success).toBe(false);
    expect(NotificationKindSchema.safeParse('absolute').success).toBe(false);
    expect(NotificationKindSchema.safeParse('').success).toBe(false);
  });
});

// T004: NotificationOutputSchema contract tests (discriminated union)
describe('NotificationOutputSchema', () => {
  const baseFields = {
    index: 0,
    initialFireDate: '2026-04-01T09:00:00.000Z',
    nextFireDate: '2026-04-01T09:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null
  };

  describe('Absolute variant', () => {
    it('should accept Absolute notification with absoluteFireDate', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Absolute',
        absoluteFireDate: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe('Absolute');
        expect(result.data.absoluteFireDate).toBe('2026-04-01T09:00:00.000Z');
      }
    });

    it('should reject Absolute notification without absoluteFireDate', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Absolute'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DueRelative variant', () => {
    it('should accept DueRelative notification with relativeFireOffset', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'DueRelative',
        relativeFireOffset: -3600
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe('DueRelative');
        expect(result.data.relativeFireOffset).toBe(-3600);
      }
    });

    it('should reject DueRelative without relativeFireOffset', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'DueRelative'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DeferRelative variant', () => {
    it('should accept DeferRelative notification with relativeFireOffset', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'DeferRelative',
        relativeFireOffset: -86400
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe('DeferRelative');
        expect(result.data.relativeFireOffset).toBe(-86400);
      }
    });
  });

  describe('Unknown variant', () => {
    it('should accept Unknown notification with base fields only', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Unknown'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe('Unknown');
      }
    });
  });

  describe('cross-variant validation', () => {
    it('should reject negative index', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        index: -1,
        kind: 'Absolute',
        absoluteFireDate: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should accept null nextFireDate (already fired)', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Absolute',
        absoluteFireDate: '2026-04-01T09:00:00.000Z',
        nextFireDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept null repeatInterval (non-repeating)', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Absolute',
        absoluteFireDate: '2026-04-01T09:00:00.000Z',
        repeatInterval: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept numeric repeatInterval (repeating)', () => {
      const result = NotificationOutputSchema.safeParse({
        ...baseFields,
        kind: 'Absolute',
        absoluteFireDate: '2026-04-01T09:00:00.000Z',
        repeatInterval: 86400
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing required base fields', () => {
      expect(
        NotificationOutputSchema.safeParse({
          kind: 'Absolute',
          absoluteFireDate: '2026-04-01T09:00:00.000Z'
        }).success
      ).toBe(false);
    });
  });
});
