import { describe, expect, it } from 'vitest';
import { TagPositionSchema } from '../../../src/contracts/tag-tools/shared/position.js';

describe('TagPositionSchema', () => {
  describe('placement values', () => {
    it('should accept all valid placement values', () => {
      const placements = ['before', 'after', 'beginning', 'ending'];
      for (const placement of placements) {
        const position = { placement, relativeTo: 'tag-123' };
        const result = TagPositionSchema.safeParse(position);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid placement value', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'invalid',
        relativeTo: 'tag-123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('relativeTo requirement for before/after', () => {
    it('should require relativeTo for before placement', () => {
      const result = TagPositionSchema.safeParse({ placement: 'before' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('relativeTo');
      }
    });

    it('should require relativeTo for after placement', () => {
      const result = TagPositionSchema.safeParse({ placement: 'after' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('relativeTo');
      }
    });

    it('should reject empty relativeTo for before placement', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'before',
        relativeTo: ''
      });
      expect(result.success).toBe(false);
    });

    it('should accept before placement with relativeTo', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'before',
        relativeTo: 'tag-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept after placement with relativeTo', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'after',
        relativeTo: 'tag-456'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('relativeTo optional for beginning/ending', () => {
    it('should accept beginning without relativeTo', () => {
      const result = TagPositionSchema.safeParse({ placement: 'beginning' });
      expect(result.success).toBe(true);
    });

    it('should accept ending without relativeTo', () => {
      const result = TagPositionSchema.safeParse({ placement: 'ending' });
      expect(result.success).toBe(true);
    });

    it('should accept beginning with relativeTo (parent)', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'beginning',
        relativeTo: 'parent-tag-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept ending with relativeTo (parent)', () => {
      const result = TagPositionSchema.safeParse({
        placement: 'ending',
        relativeTo: 'parent-tag-456'
      });
      expect(result.success).toBe(true);
    });
  });
});
