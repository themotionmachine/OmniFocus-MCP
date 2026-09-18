import { describe, it, expect } from 'vitest';
import { schema } from './queryOmnifocus.js';

describe('queryOmnifocus schema', () => {
  describe('date filter union types', () => {
    const dateFields = [
      'dueWithin', 'deferredUntil', 'plannedWithin', 'dueOn', 'deferOn', 'plannedOn',
      'addedWithin', 'addedOn', 'completedWithin', 'completedOn', 'droppedWithin', 'droppedOn',
    ];

    for (const field of dateFields) {
      it(`${field} accepts a number`, () => {
        const input = { entity: 'tasks', filters: { [field]: 7 } };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it(`${field} accepts a named string`, () => {
        const input = { entity: 'tasks', filters: { [field]: 'today' } };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it(`${field} accepts an ISO date string`, () => {
        const input = { entity: 'tasks', filters: { [field]: '2026-04-01' } };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });
    }

    it('still rejects non-string non-number types', () => {
      const input = { entity: 'tasks', filters: { dueWithin: true } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewDue filter', () => {
    it('accepts boolean true', () => {
      const input = { entity: 'projects', filters: { reviewDue: true } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts boolean false', () => {
      const input = { entity: 'projects', filters: { reviewDue: false } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects non-boolean types', () => {
      const input = { entity: 'projects', filters: { reviewDue: 'yes' } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('status filter enum', () => {
    it('accepts valid task status values', () => {
      const input = { entity: 'tasks', filters: { status: ['Next', 'Available', 'Overdue'] } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid project status values', () => {
      const input = { entity: 'projects', filters: { status: ['Active', 'OnHold', 'Done', 'Dropped'] } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects a misspelled status value', () => {
      const input = { entity: 'tasks', filters: { status: ['NextAction'] } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects a lowercase status value (case matters)', () => {
      const input = { entity: 'tasks', filters: { status: ['next'] } };
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
