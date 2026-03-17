import { describe, expect, it } from 'vitest';
import {
  MarkReviewedItemResultSchema,
  ProjectIdentifierSchema,
  ReviewBatchItemResultSchema,
  ReviewProjectSummarySchema,
  SetReviewIntervalItemResultSchema
} from '../../../src/contracts/review-tools/shared/index.js';

// T001: Contract tests for shared review schemas

describe('ReviewProjectSummarySchema', () => {
  it('should accept valid complete summary with all fields populated', () => {
    const valid = {
      id: 'proj-123',
      name: 'Weekly GTD Review',
      status: 'Active',
      flagged: true,
      reviewInterval: { steps: 7, unit: 'days' },
      lastReviewDate: '2025-12-23T00:00:00.000Z',
      nextReviewDate: '2025-12-30T00:00:00.000Z',
      remainingCount: 5
    };
    const result = ReviewProjectSummarySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('proj-123');
      expect(result.data.name).toBe('Weekly GTD Review');
      expect(result.data.status).toBe('Active');
      expect(result.data.flagged).toBe(true);
      expect(result.data.reviewInterval).toEqual({ steps: 7, unit: 'days' });
      expect(result.data.lastReviewDate).toBe('2025-12-23T00:00:00.000Z');
      expect(result.data.nextReviewDate).toBe('2025-12-30T00:00:00.000Z');
      expect(result.data.remainingCount).toBe(5);
    }
  });

  it('should accept summary with nullable fields set to null', () => {
    const valid = {
      id: 'proj-456',
      name: 'No Review Config',
      status: 'OnHold',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };
    const result = ReviewProjectSummarySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewInterval).toBeNull();
      expect(result.data.lastReviewDate).toBeNull();
      expect(result.data.nextReviewDate).toBeNull();
    }
  });

  it('should reject missing required fields (id, name, status)', () => {
    const missingId = {
      name: 'Test',
      status: 'Active',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };
    expect(ReviewProjectSummarySchema.safeParse(missingId).success).toBe(false);

    const missingName = {
      id: 'proj-1',
      status: 'Active',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };
    expect(ReviewProjectSummarySchema.safeParse(missingName).success).toBe(false);

    const missingStatus = {
      id: 'proj-1',
      name: 'Test',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };
    expect(ReviewProjectSummarySchema.safeParse(missingStatus).success).toBe(false);
  });

  it('should validate status is a valid ProjectStatus enum value', () => {
    const validStatuses = ['Active', 'OnHold', 'Done', 'Dropped'];
    for (const status of validStatuses) {
      const valid = {
        id: 'proj-1',
        name: 'Test',
        status,
        flagged: false,
        reviewInterval: null,
        lastReviewDate: null,
        nextReviewDate: null,
        remainingCount: 0
      };
      expect(ReviewProjectSummarySchema.safeParse(valid).success).toBe(true);
    }

    const invalid = {
      id: 'proj-1',
      name: 'Test',
      status: 'InvalidStatus',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };
    expect(ReviewProjectSummarySchema.safeParse(invalid).success).toBe(false);
  });

  it('should validate remainingCount is non-negative integer', () => {
    const base = {
      id: 'proj-1',
      name: 'Test',
      status: 'Active',
      flagged: false,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null
    };

    expect(ReviewProjectSummarySchema.safeParse({ ...base, remainingCount: 0 }).success).toBe(true);
    expect(ReviewProjectSummarySchema.safeParse({ ...base, remainingCount: 100 }).success).toBe(
      true
    );
    expect(ReviewProjectSummarySchema.safeParse({ ...base, remainingCount: -1 }).success).toBe(
      false
    );
    expect(ReviewProjectSummarySchema.safeParse({ ...base, remainingCount: 1.5 }).success).toBe(
      false
    );
  });

  it('should validate flagged is boolean', () => {
    const base = {
      id: 'proj-1',
      name: 'Test',
      status: 'Active',
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      remainingCount: 0
    };

    expect(ReviewProjectSummarySchema.safeParse({ ...base, flagged: true }).success).toBe(true);
    expect(ReviewProjectSummarySchema.safeParse({ ...base, flagged: false }).success).toBe(true);
    expect(ReviewProjectSummarySchema.safeParse({ ...base, flagged: 'true' }).success).toBe(false);
  });
});

describe('ProjectIdentifierSchema', () => {
  it('should accept identifier with id only', () => {
    const result = ProjectIdentifierSchema.safeParse({ id: 'proj-123' });
    expect(result.success).toBe(true);
  });

  it('should accept identifier with name only', () => {
    const result = ProjectIdentifierSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('should accept identifier with both id and name', () => {
    const result = ProjectIdentifierSchema.safeParse({ id: 'proj-123', name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('should reject empty object (refinement: at least one required)', () => {
    const result = ProjectIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject both id and name as empty strings', () => {
    const result = ProjectIdentifierSchema.safeParse({ id: '', name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept id as empty string with valid name', () => {
    const result = ProjectIdentifierSchema.safeParse({ id: '', name: 'Valid Name' });
    expect(result.success).toBe(true);
  });
});

describe('ReviewBatchItemResultSchema', () => {
  it('should accept valid success result', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true
    };
    const result = ReviewBatchItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should accept valid error result with code', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: '',
      success: false,
      error: 'Project not found: proj-123',
      code: 'NOT_FOUND'
    };
    const result = ReviewBatchItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation result with candidates array of {id, name} objects', () => {
    const valid = {
      projectId: '',
      projectName: 'Ambiguous',
      success: false,
      error: "Multiple projects match 'Ambiguous'. Use ID for precision.",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { id: 'proj-1', name: 'Ambiguous Project 1' },
        { id: 'proj-2', name: 'Ambiguous Project 2' }
      ]
    };
    const result = ReviewBatchItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2);
      expect(result.data.candidates?.[0]).toEqual({ id: 'proj-1', name: 'Ambiguous Project 1' });
    }
  });

  it('should accept all valid error codes', () => {
    const codes = [
      'NOT_FOUND',
      'DISAMBIGUATION_REQUIRED',
      'NO_REVIEW_INTERVAL',
      'INVALID_INTERVAL'
    ];
    for (const code of codes) {
      const valid = {
        projectId: 'proj-1',
        projectName: 'Test',
        success: false,
        error: 'Error message',
        code
      };
      expect(ReviewBatchItemResultSchema.safeParse(valid).success).toBe(true);
    }
  });

  it('should allow optional fields to be omitted on success', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true
    };
    const result = ReviewBatchItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBeUndefined();
      expect(result.data.code).toBeUndefined();
      expect(result.data.candidates).toBeUndefined();
    }
  });
});

describe('MarkReviewedItemResultSchema', () => {
  it('should extend base with previousNextReviewDate and newNextReviewDate', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousNextReviewDate: '2025-12-23T00:00:00.000Z',
      newNextReviewDate: '2025-12-30T00:00:00.000Z'
    };
    const result = MarkReviewedItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBe('2025-12-23T00:00:00.000Z');
      expect(result.data.newNextReviewDate).toBe('2025-12-30T00:00:00.000Z');
    }
  });

  it('should accept nullable ISO 8601 date strings', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousNextReviewDate: null,
      newNextReviewDate: '2025-12-30T00:00:00.000Z'
    };
    const result = MarkReviewedItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBeNull();
    }
  });

  it('should allow date fields to be optional (not present on error results)', () => {
    const errorResult = {
      projectId: 'proj-123',
      projectName: '',
      success: false,
      error: 'Project not found',
      code: 'NOT_FOUND'
    };
    const result = MarkReviewedItemResultSchema.safeParse(errorResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBeUndefined();
      expect(result.data.newNextReviewDate).toBeUndefined();
    }
  });
});

describe('SetReviewIntervalItemResultSchema', () => {
  it('should extend base with previousInterval and newInterval', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousInterval: { steps: 7, unit: 'days' as const },
      newInterval: { steps: 2, unit: 'weeks' as const }
    };
    const result = SetReviewIntervalItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousInterval).toEqual({ steps: 7, unit: 'days' });
      expect(result.data.newInterval).toEqual({ steps: 2, unit: 'weeks' });
    }
  });

  it('should accept null for disabled reviews', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousInterval: { steps: 7, unit: 'days' as const },
      newInterval: null
    };
    const result = SetReviewIntervalItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newInterval).toBeNull();
    }
  });

  it('should accept both intervals as null', () => {
    const valid = {
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousInterval: null,
      newInterval: { steps: 1, unit: 'months' as const }
    };
    const result = SetReviewIntervalItemResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should allow interval fields to be optional on error results', () => {
    const errorResult = {
      projectId: '',
      projectName: 'Test',
      success: false,
      error: 'Project not found',
      code: 'NOT_FOUND'
    };
    const result = SetReviewIntervalItemResultSchema.safeParse(errorResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousInterval).toBeUndefined();
      expect(result.data.newInterval).toBeUndefined();
    }
  });
});
