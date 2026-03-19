import { describe, expect, it } from 'vitest';
import {
  GetDatabaseStatsErrorSchema,
  GetDatabaseStatsInputSchema,
  GetDatabaseStatsResponseSchema,
  GetDatabaseStatsSuccessSchema,
  ProjectStatsSchema,
  TaskStatsSchema
} from '../../../src/contracts/database-tools/get-database-stats.js';

// T036: Contract tests for GetDatabaseStats schemas

describe('GetDatabaseStatsInputSchema', () => {
  it('should accept empty object', () => {
    expect(GetDatabaseStatsInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('TaskStatsSchema', () => {
  it('should accept valid task stats', () => {
    const valid = { available: 10, blocked: 3, completed: 50, dropped: 2, total: 65 };
    const result = TaskStatsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.available).toBe(10);
      expect(result.data.total).toBe(65);
    }
  });

  it('should accept all-zero stats', () => {
    const valid = { available: 0, blocked: 0, completed: 0, dropped: 0, total: 0 };
    expect(TaskStatsSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject negative values', () => {
    const invalid = { available: -1, blocked: 0, completed: 0, dropped: 0, total: 0 };
    expect(TaskStatsSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject non-integer values', () => {
    const invalid = { available: 1.5, blocked: 0, completed: 0, dropped: 0, total: 1.5 };
    expect(TaskStatsSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject missing fields', () => {
    expect(TaskStatsSchema.safeParse({ available: 0 }).success).toBe(false);
  });
});

describe('ProjectStatsSchema', () => {
  it('should accept valid project stats', () => {
    const valid = { active: 5, onHold: 2, completed: 10, dropped: 1, total: 18 };
    const result = ProjectStatsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(5);
      expect(result.data.total).toBe(18);
    }
  });

  it('should accept all-zero stats', () => {
    const valid = { active: 0, onHold: 0, completed: 0, dropped: 0, total: 0 };
    expect(ProjectStatsSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject negative values', () => {
    const invalid = { active: 0, onHold: -1, completed: 0, dropped: 0, total: 0 };
    expect(ProjectStatsSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('GetDatabaseStatsSuccessSchema', () => {
  it('should accept valid success response', () => {
    const valid = {
      success: true,
      tasks: { available: 10, blocked: 3, completed: 50, dropped: 2, total: 65 },
      projects: { active: 5, onHold: 2, completed: 10, dropped: 1, total: 18 },
      folders: 8,
      tags: 15,
      inbox: 3
    };
    const result = GetDatabaseStatsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks.total).toBe(65);
      expect(result.data.projects.total).toBe(18);
      expect(result.data.folders).toBe(8);
      expect(result.data.tags).toBe(15);
      expect(result.data.inbox).toBe(3);
    }
  });

  it('should accept empty database stats', () => {
    const valid = {
      success: true,
      tasks: { available: 0, blocked: 0, completed: 0, dropped: 0, total: 0 },
      projects: { active: 0, onHold: 0, completed: 0, dropped: 0, total: 0 },
      folders: 0,
      tags: 0,
      inbox: 0
    };
    expect(GetDatabaseStatsSuccessSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject negative folder count', () => {
    const invalid = {
      success: true,
      tasks: { available: 0, blocked: 0, completed: 0, dropped: 0, total: 0 },
      projects: { active: 0, onHold: 0, completed: 0, dropped: 0, total: 0 },
      folders: -1,
      tags: 0,
      inbox: 0
    };
    expect(GetDatabaseStatsSuccessSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('GetDatabaseStatsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = GetDatabaseStatsErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('GetDatabaseStatsResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = {
      success: true,
      tasks: { available: 0, blocked: 0, completed: 0, dropped: 0, total: 0 },
      projects: { active: 0, onHold: 0, completed: 0, dropped: 0, total: 0 },
      folders: 0,
      tags: 0,
      inbox: 0
    };
    const error = { success: false, error: 'err' };
    expect(GetDatabaseStatsResponseSchema.safeParse(success).success).toBe(true);
    expect(GetDatabaseStatsResponseSchema.safeParse(error).success).toBe(true);
  });
});
