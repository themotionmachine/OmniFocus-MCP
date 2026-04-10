import { describe, it, expect } from 'vitest';
import { schema } from './queryOmnifocus.js';

describe('queryOmnifocus schema', () => {
  describe('date filter union types', () => {
    const dateFields = ['dueWithin', 'deferredUntil', 'plannedWithin', 'dueOn', 'deferOn', 'plannedOn'];

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
});
