import { describe, expect, it } from 'vitest';
import { DisambiguationErrorSchema } from '../../../src/contracts/tag-tools/shared/disambiguation.js';

describe('DisambiguationErrorSchema', () => {
  it('should accept valid disambiguation error', () => {
    const validError = {
      success: false,
      error: "Ambiguous tag name 'Work'. Found 2 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-123', 'tag-456']
    };
    const result = DisambiguationErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation with more than 2 matching IDs', () => {
    const validError = {
      success: false,
      error: "Ambiguous tag name 'Context'. Found 3 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-1', 'tag-2', 'tag-3']
    };
    const result = DisambiguationErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should reject when success is true', () => {
    const invalidError = {
      success: true,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-123', 'tag-456']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when code is not DISAMBIGUATION_REQUIRED', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'OTHER_CODE',
      matchingIds: ['tag-123', 'tag-456']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when matchingIds has less than 2 items', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-123']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when matchingIds is empty', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: []
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = DisambiguationErrorSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
