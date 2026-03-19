import { describe, expect, it } from 'vitest';
import {
  CleanupDatabaseErrorSchema,
  CleanupDatabaseInputSchema,
  CleanupDatabaseResponseSchema,
  CleanupDatabaseSuccessSchema
} from '../../../src/contracts/database-tools/cleanup-database.js';

// T057: Contract tests for CleanupDatabase schemas

describe('CleanupDatabaseInputSchema', () => {
  it('should accept empty object', () => {
    expect(CleanupDatabaseInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('CleanupDatabaseSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = CleanupDatabaseSuccessSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });
});

describe('CleanupDatabaseErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = CleanupDatabaseErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('CleanupDatabaseResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true };
    const error = { success: false, error: 'err' };
    expect(CleanupDatabaseResponseSchema.safeParse(success).success).toBe(true);
    expect(CleanupDatabaseResponseSchema.safeParse(error).success).toBe(true);
  });
});
