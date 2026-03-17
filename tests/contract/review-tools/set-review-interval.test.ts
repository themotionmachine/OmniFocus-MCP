import { describe, expect, it } from 'vitest';
import {
  SetReviewIntervalErrorSchema,
  SetReviewIntervalInputSchema,
  SetReviewIntervalResponseSchema,
  SetReviewIntervalSuccessSchema
} from '../../../src/contracts/review-tools/set-review-interval.js';

// T012: Contract tests for set_review_interval schemas

describe('SetReviewIntervalInputSchema', () => {
  describe('Valid interval configurations', () => {
    it('should accept valid interval with id-identified project', () => {
      const input = {
        projects: [{ id: 'abc' }],
        interval: { steps: 2, unit: 'weeks' }
      };
      const result = SetReviewIntervalInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept null interval to disable reviews', () => {
      const input = {
        projects: [{ id: 'proj-123' }],
        interval: null
      };
      const result = SetReviewIntervalInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBeNull();
      }
    });

    it('should accept unit: days', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 7, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept unit: weeks', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 2, unit: 'weeks' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept unit: months', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1, unit: 'months' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept unit: years', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1, unit: 'years' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept all 4 valid units together', () => {
      const units = ['days', 'weeks', 'months', 'years'];
      for (const unit of units) {
        const input = {
          projects: [{ id: 'proj-1' }],
          interval: { steps: 1, unit }
        };
        expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
      }
    });

    it('should accept project identified by name', () => {
      const input = {
        projects: [{ name: 'My Project' }],
        interval: { steps: 14, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept recalculateNextReview: true', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: true
      };
      const result = SetReviewIntervalInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recalculateNextReview).toBe(true);
      }
    });

    it('should default recalculateNextReview to false', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 7, unit: 'days' }
      };
      const result = SetReviewIntervalInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recalculateNextReview).toBe(false);
      }
    });

    it('should accept steps at minimum boundary (1)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept steps at maximum boundary (365)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 365, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept exactly 1 project (minimum)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 7, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept 100 projects (maximum)', () => {
      const projects = Array.from({ length: 100 }, (_, i) => ({ id: `proj-${i}` }));
      const input = { projects, interval: { steps: 7, unit: 'days' } };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('Invalid interval configurations', () => {
    it('should reject unit: hours', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1, unit: 'hours' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject unit: minutes', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1, unit: 'minutes' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject steps: 0 (below minimum)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 0, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject steps: -1 (negative)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: -1, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject steps: 366 (above maximum)', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 366, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject non-integer steps: 1.5', () => {
      const input = {
        projects: [{ id: 'proj-1' }],
        interval: { steps: 1.5, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject empty projects array (minimum 1)', () => {
      const input = {
        projects: [],
        interval: { steps: 7, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject more than 100 projects (maximum 100)', () => {
      const projects = Array.from({ length: 101 }, (_, i) => ({ id: `proj-${i}` }));
      const input = { projects, interval: { steps: 7, unit: 'days' } };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject project with neither id nor name', () => {
      const input = {
        projects: [{}],
        interval: { steps: 7, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject missing projects field', () => {
      const input = {
        interval: { steps: 7, unit: 'days' }
      };
      expect(SetReviewIntervalInputSchema.safeParse(input).success).toBe(false);
    });
  });
});

describe('SetReviewIntervalSuccessSchema', () => {
  it('should accept valid success response with summary', () => {
    const response = {
      success: true as const,
      results: [
        {
          projectId: 'proj-123',
          projectName: 'My Project',
          success: true,
          previousInterval: { steps: 7, unit: 'days' as const },
          newInterval: { steps: 2, unit: 'weeks' as const }
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    };
    const result = SetReviewIntervalSuccessSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept empty results with summary', () => {
    const response = {
      success: true as const,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(true);
  });

  it('should accept mixed success and failure results', () => {
    const response = {
      success: true as const,
      results: [
        {
          projectId: 'proj-1',
          projectName: 'Success Project',
          success: true,
          previousInterval: null,
          newInterval: { steps: 1, unit: 'weeks' as const }
        },
        {
          projectId: 'proj-2',
          projectName: '',
          success: false,
          error: 'Project not found: proj-2',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(true);
  });

  it('should accept result with null interval (disabled)', () => {
    const response = {
      success: true as const,
      results: [
        {
          projectId: 'proj-123',
          projectName: 'My Project',
          success: true,
          previousInterval: { steps: 7, unit: 'days' as const },
          newInterval: null
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(true);
  });

  it('should reject when success is false', () => {
    const response = {
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(false);
  });

  it('should reject missing results field', () => {
    const response = {
      success: true,
      summary: { total: 0, succeeded: 0, failed: 0 }
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(false);
  });

  it('should reject missing summary field', () => {
    const response = {
      success: true,
      results: []
    };
    expect(SetReviewIntervalSuccessSchema.safeParse(response).success).toBe(false);
  });
});

describe('SetReviewIntervalErrorSchema', () => {
  it('should accept valid error response', () => {
    const response = {
      success: false as const,
      error: 'OmniFocus is not running'
    };
    expect(SetReviewIntervalErrorSchema.safeParse(response).success).toBe(true);
  });

  it('should reject when success is true', () => {
    const response = {
      success: true,
      error: 'some error'
    };
    expect(SetReviewIntervalErrorSchema.safeParse(response).success).toBe(false);
  });

  it('should reject missing error field', () => {
    const response = { success: false };
    expect(SetReviewIntervalErrorSchema.safeParse(response).success).toBe(false);
  });
});

describe('SetReviewIntervalResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const response = {
      success: true as const,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    };
    expect(SetReviewIntervalResponseSchema.safeParse(response).success).toBe(true);
  });

  it('should accept error response', () => {
    const response = {
      success: false as const,
      error: 'Script execution failed'
    };
    expect(SetReviewIntervalResponseSchema.safeParse(response).success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const response = {
      status: 'ok',
      message: 'done'
    };
    expect(SetReviewIntervalResponseSchema.safeParse(response).success).toBe(false);
  });
});
