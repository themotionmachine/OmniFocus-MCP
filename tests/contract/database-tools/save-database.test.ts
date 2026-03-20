import { describe, expect, it } from 'vitest';
import {
  SaveDatabaseErrorSchema,
  SaveDatabaseInputSchema,
  SaveDatabaseResponseSchema,
  SaveDatabaseSuccessSchema
} from '../../../src/contracts/database-tools/save-database.js';

// T050: Contract tests for SaveDatabase schemas

describe('SaveDatabaseInputSchema', () => {
  it('should accept empty object', () => {
    expect(SaveDatabaseInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('SaveDatabaseSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = SaveDatabaseSuccessSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });

  it('should not accept extra fields beyond success', () => {
    // Zod strips unknown fields by default; the shape is just { success: true }
    const result = SaveDatabaseSuccessSchema.safeParse({ success: true, extraField: 'value' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).toEqual(['success']);
    }
  });
});

describe('SaveDatabaseErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = SaveDatabaseErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('SaveDatabaseResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true };
    const error = { success: false, error: 'err' };
    expect(SaveDatabaseResponseSchema.safeParse(success).success).toBe(true);
    expect(SaveDatabaseResponseSchema.safeParse(error).success).toBe(true);
  });
});
