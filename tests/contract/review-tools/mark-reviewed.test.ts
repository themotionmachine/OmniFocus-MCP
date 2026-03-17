import { describe, expect, it } from 'vitest';
import {
  MarkReviewedInputSchema,
  MarkReviewedResponseSchema,
  MarkReviewedSuccessSchema
} from '../../../src/contracts/review-tools/mark-reviewed.js';
import { MarkReviewedItemResultSchema } from '../../../src/contracts/review-tools/shared/batch.js';

// T007: Contract tests for mark-reviewed schemas

describe('MarkReviewedInputSchema', () => {
  describe('projects array (required, min 1, max 100)', () => {
    it('should accept single-project array with id', () => {
      const result = MarkReviewedInputSchema.safeParse({
        projects: [{ id: 'abc' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept multi-project array with id and name', () => {
      const result = MarkReviewedInputSchema.safeParse({
        projects: [{ id: 'a' }, { name: 'B' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept project with both id and name', () => {
      const result = MarkReviewedInputSchema.safeParse({
        projects: [{ id: 'abc', name: 'My Project' }]
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty projects array (min 1)', () => {
      const result = MarkReviewedInputSchema.safeParse({ projects: [] });
      expect(result.success).toBe(false);
    });

    it('should reject projects array with more than 100 items (max 100)', () => {
      const projects = Array.from({ length: 101 }, (_, i) => ({ id: `proj-${i}` }));
      const result = MarkReviewedInputSchema.safeParse({ projects });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 100 projects (boundary)', () => {
      const projects = Array.from({ length: 100 }, (_, i) => ({ id: `proj-${i}` }));
      const result = MarkReviewedInputSchema.safeParse({ projects });
      expect(result.success).toBe(true);
    });

    it('should reject projects with neither id nor name (ProjectIdentifier refinement)', () => {
      const result = MarkReviewedInputSchema.safeParse({
        projects: [{}]
      });
      expect(result.success).toBe(false);
    });

    it('should reject projects with empty id and empty name', () => {
      const result = MarkReviewedInputSchema.safeParse({
        projects: [{ id: '', name: '' }]
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing projects field', () => {
      const result = MarkReviewedInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('MarkReviewedSuccessSchema', () => {
  const validSummary = {
    total: 2,
    succeeded: 1,
    failed: 1
  };

  const validResult = {
    projectId: 'proj-123',
    projectName: 'My Project',
    success: true,
    previousNextReviewDate: '2025-12-23T00:00:00.000Z',
    newNextReviewDate: '2025-12-30T00:00:00.000Z'
  };

  it('should accept valid response with results array and summary', () => {
    const result = MarkReviewedSuccessSchema.safeParse({
      success: true,
      results: [validResult],
      summary: validSummary
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty results array', () => {
    const result = MarkReviewedSuccessSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should require success to be literal true', () => {
    const result = MarkReviewedSuccessSchema.safeParse({
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  describe('summary fields (all non-negative integers)', () => {
    it('should accept summary with total, succeeded, failed as non-negative integers', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 3, succeeded: 2, failed: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept summary with all zeros', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: 0, failed: 0 }
      });
      expect(result.success).toBe(true);
    });

    it('should reject summary with negative total', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: -1, succeeded: 0, failed: 0 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject summary with negative succeeded', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: -1, failed: 0 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject summary with negative failed', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: 0, failed: -1 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing summary field', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: []
      });
      expect(result.success).toBe(false);
    });
  });

  describe('results containing MarkReviewedItemResult objects', () => {
    it('should accept results with success items containing date fields', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [
          {
            projectId: 'proj-1',
            projectName: 'Project One',
            success: true,
            previousNextReviewDate: '2025-12-16T00:00:00.000Z',
            newNextReviewDate: '2025-12-23T00:00:00.000Z'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept results with error items without date fields', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [
          {
            projectId: 'proj-999',
            projectName: '',
            success: false,
            error: 'Project not found: proj-999',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept mixed success and failure results', () => {
      const result = MarkReviewedSuccessSchema.safeParse({
        success: true,
        results: [
          {
            projectId: 'proj-1',
            projectName: 'Good Project',
            success: true,
            previousNextReviewDate: null,
            newNextReviewDate: '2025-12-30T00:00:00.000Z'
          },
          {
            projectId: '',
            projectName: 'Ambiguous',
            success: false,
            error: "Multiple projects match 'Ambiguous'. Use ID for precision.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'proj-2', name: 'Ambiguous A' },
              { id: 'proj-3', name: 'Ambiguous B' }
            ]
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('MarkReviewedItemResultSchema', () => {
  it('should accept success result with date fields', () => {
    const result = MarkReviewedItemResultSchema.safeParse({
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousNextReviewDate: '2025-12-23T00:00:00.000Z',
      newNextReviewDate: '2025-12-30T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBe('2025-12-23T00:00:00.000Z');
      expect(result.data.newNextReviewDate).toBe('2025-12-30T00:00:00.000Z');
    }
  });

  it('should accept null for previousNextReviewDate (first-time review)', () => {
    const result = MarkReviewedItemResultSchema.safeParse({
      projectId: 'proj-123',
      projectName: 'My Project',
      success: true,
      previousNextReviewDate: null,
      newNextReviewDate: '2025-12-30T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBeNull();
    }
  });

  it('should accept error result without date fields', () => {
    const result = MarkReviewedItemResultSchema.safeParse({
      projectId: 'proj-123',
      projectName: '',
      success: false,
      error: 'Project not found',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousNextReviewDate).toBeUndefined();
      expect(result.data.newNextReviewDate).toBeUndefined();
    }
  });

  it('should accept disambiguation error with candidates', () => {
    const result = MarkReviewedItemResultSchema.safeParse({
      projectId: '',
      projectName: 'Ambiguous',
      success: false,
      error: "Multiple projects match 'Ambiguous'. Use ID for precision.",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { id: 'proj-1', name: 'Ambiguous 1' },
        { id: 'proj-2', name: 'Ambiguous 2' }
      ]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2);
    }
  });

  it('should accept NO_REVIEW_INTERVAL error code', () => {
    const result = MarkReviewedItemResultSchema.safeParse({
      projectId: 'proj-123',
      projectName: 'No Interval',
      success: false,
      error: "Project 'No Interval' has no review interval configured",
      code: 'NO_REVIEW_INTERVAL'
    });
    expect(result.success).toBe(true);
  });
});

describe('MarkReviewedResponseSchema (discriminated union)', () => {
  it('should parse success=true correctly', () => {
    const result = MarkReviewedResponseSchema.safeParse({
      success: true,
      results: [
        {
          projectId: 'proj-123',
          projectName: 'My Project',
          success: true,
          previousNextReviewDate: '2025-12-23T00:00:00.000Z',
          newNextReviewDate: '2025-12-30T00:00:00.000Z'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('should parse success=false correctly', () => {
    const result = MarkReviewedResponseSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      if (!result.data.success) {
        expect(result.data.error).toBe('OmniFocus is not running');
      }
    }
  });

  it('should reject when success is missing', () => {
    const result = MarkReviewedResponseSchema.safeParse({
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=true without required success fields', () => {
    const result = MarkReviewedResponseSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=false without error field', () => {
    const result = MarkReviewedResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});
