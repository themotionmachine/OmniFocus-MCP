import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSetReviewIntervalScript,
  setReviewInterval
} from '../../../src/tools/primitives/setReviewInterval.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T013: Unit tests for setReviewInterval primitive

describe('setReviewInterval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Setting a new interval', () => {
    it('should set new interval on project with existing interval', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-123',
            projectName: 'My Project',
            success: true,
            previousInterval: { steps: 7, unit: 'days' },
            newInterval: { steps: 2, unit: 'weeks' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: { steps: 2, unit: 'weeks' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].newInterval).toEqual({ steps: 2, unit: 'weeks' });
        expect(result.results[0].previousInterval).toEqual({ steps: 7, unit: 'days' });
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(0);
      }
    });

    it('should set initial nextReviewDate when project has no interval', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-456',
            projectName: 'New Project',
            success: true,
            previousInterval: null,
            newInterval: { steps: 1, unit: 'months' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-456' }],
        interval: { steps: 1, unit: 'months' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].previousInterval).toBeNull();
        expect(result.results[0].newInterval).toEqual({ steps: 1, unit: 'months' });
      }
    });

    it('should return updated project data with new reviewInterval', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-789',
            projectName: 'Updated Project',
            success: true,
            previousInterval: { steps: 14, unit: 'days' },
            newInterval: { steps: 1, unit: 'years' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-789' }],
        interval: { steps: 1, unit: 'years' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].projectId).toBe('proj-789');
        expect(result.results[0].projectName).toBe('Updated Project');
        expect(result.results[0].newInterval).toEqual({ steps: 1, unit: 'years' });
      }
    });
  });

  describe('Disabling reviews (null interval)', () => {
    it('should set null interval to disable reviews, clearing reviewInterval and nextReviewDate', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-123',
            projectName: 'My Project',
            success: true,
            previousInterval: { steps: 7, unit: 'days' },
            newInterval: null
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: null,
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].newInterval).toBeNull();
        expect(result.results[0].previousInterval).toEqual({ steps: 7, unit: 'days' });
      }
    });
  });

  describe('recalculateNextReview behavior', () => {
    it('should preserve existing nextReviewDate when recalculateNextReview is false', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-123',
            projectName: 'My Project',
            success: true,
            previousInterval: { steps: 7, unit: 'days' },
            newInterval: { steps: 14, unit: 'days' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: { steps: 14, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      expect(executeOmniJS).toHaveBeenCalledOnce();
      const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(scriptArg).toContain('recalculateNextReview');
      expect(scriptArg).toContain('false');
    });

    it('should recalculate nextReviewDate to today + interval when recalculateNextReview is true', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-123',
            projectName: 'My Project',
            success: true,
            previousInterval: { steps: 7, unit: 'days' },
            newInterval: { steps: 14, unit: 'days' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: { steps: 14, unit: 'days' },
        recalculateNextReview: true
      });

      expect(result.success).toBe(true);
      expect(executeOmniJS).toHaveBeenCalledOnce();
      const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(scriptArg).toContain('true');
    });
  });

  describe('Project lookup', () => {
    it('should look up project by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-123',
            projectName: 'Project by ID',
            success: true,
            previousInterval: null,
            newInterval: { steps: 7, unit: 'days' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].projectId).toBe('proj-123');
      }
    });

    it('should look up project by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-456',
            projectName: 'My Named Project',
            success: true,
            previousInterval: null,
            newInterval: { steps: 7, unit: 'days' }
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ name: 'My Named Project' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].projectName).toBe('My Named Project');
      }
    });

    it('should return disambiguation error with candidates when name matches multiple projects', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: '',
            projectName: 'Ambiguous Project',
            success: false,
            error: "Multiple projects match 'Ambiguous Project'. Use ID for precision.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'proj-1', name: 'Ambiguous Project' },
              { id: 'proj-2', name: 'Ambiguous Project' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await setReviewInterval({
        projects: [{ name: 'Ambiguous Project' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.results[0].candidates).toHaveLength(2);
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should return NOT_FOUND error when project does not exist', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'nonexistent-id',
            projectName: '',
            success: false,
            error: 'Project not found: nonexistent-id',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'nonexistent-id' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
      }
    });
  });

  describe('Batch operations', () => {
    it('should apply the same interval to multiple projects', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-1',
            projectName: 'Project 1',
            success: true,
            previousInterval: null,
            newInterval: { steps: 7, unit: 'days' }
          },
          {
            projectId: 'proj-2',
            projectName: 'Project 2',
            success: true,
            previousInterval: { steps: 14, unit: 'days' },
            newInterval: { steps: 7, unit: 'days' }
          }
        ],
        summary: { total: 2, succeeded: 2, failed: 0 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-1' }, { id: 'proj-2' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].newInterval).toEqual({ steps: 7, unit: 'days' });
        expect(result.results[1].newInterval).toEqual({ steps: 7, unit: 'days' });
        expect(result.summary.total).toBe(2);
        expect(result.summary.succeeded).toBe(2);
      }
    });

    it('should handle partial batch failure without failing entire batch', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-1',
            projectName: 'Success Project',
            success: true,
            previousInterval: null,
            newInterval: { steps: 7, unit: 'days' }
          },
          {
            projectId: 'missing-proj',
            projectName: '',
            success: false,
            error: 'Project not found: missing-proj',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-1' }, { id: 'missing-proj' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should preserve original array indices in per-item results', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: '',
            projectName: 'Ambiguous',
            success: false,
            error: 'DISAMBIGUATION_REQUIRED',
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [{ id: 'p1', name: 'Ambiguous' }]
          },
          {
            projectId: 'proj-good',
            projectName: 'Good Project',
            success: true,
            previousInterval: null,
            newInterval: { steps: 7, unit: 'days' }
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await setReviewInterval({
        projects: [{ name: 'Ambiguous' }, { id: 'proj-good' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Index 0 is the failed disambiguation
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
        // Index 1 is the success
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].projectId).toBe('proj-good');
      }
    });
  });

  describe('OmniJS error handling', () => {
    it('should return structured error on OmniJS failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not responding'
      });

      const result = await setReviewInterval({
        projects: [{ id: 'proj-123' }],
        interval: { steps: 7, unit: 'days' },
        recalculateNextReview: false
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('OmniFocus is not responding');
      }
    });

    it('should propagate OmniJS execution errors', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(
        setReviewInterval({
          projects: [{ id: 'proj-123' }],
          interval: { steps: 7, unit: 'days' },
          recalculateNextReview: false
        })
      ).rejects.toThrow('Script execution failed');
    });
  });
});

describe('generateSetReviewIntervalScript', () => {
  it('should produce a valid OmniJS IIFE string', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-123' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\}\)\(\);$/);
    expect(script).toContain('try {');
    expect(script).toContain('catch (e)');
  });

  it('should embed project identifiers as JSON', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-abc', name: 'My Project' }],
      interval: { steps: 2, unit: 'weeks' },
      recalculateNextReview: false
    });

    expect(script).toContain('"proj-abc"');
    expect(script).toContain('"My Project"');
  });

  it('should embed interval as JSON when not null', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 14, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('"steps"');
    expect(script).toContain('"days"');
    expect(script).toContain('14');
  });

  it('should use workaround for disabling reviews (OmniJS cannot set reviewInterval to null)', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: null,
      recalculateNextReview: false
    });

    // OmniJS limitation: reviewInterval can't be null, so we set to 365 years
    // and push nextReviewDate far into the future
    expect(script).toContain('var interval = null');
    expect(script).toContain('riDisable.steps = 365');
    expect(script).toContain("riDisable.unit = 'years'");
    expect(script).toContain('project.reviewInterval = riDisable');
  });

  it('should include Calendar and DateComponents API calls', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('Calendar.current');
    expect(script).toContain('DateComponents');
  });

  it('should use read-modify-write pattern for reviewInterval (OmniJS value object)', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    // OmniJS ReviewInterval is a value object: read existing, modify, write back
    expect(script).toContain('var ri = project.reviewInterval');
    expect(script).toContain('ri.steps = interval.steps');
    expect(script).toContain('ri.unit = interval.unit');
    expect(script).toContain('project.reviewInterval = ri');
  });

  it('should use direct assignment fallback when project has no existing reviewInterval', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    // When ri is null, falls back to direct object assignment
    expect(script).toContain(
      'project.reviewInterval = { steps: interval.steps, unit: interval.unit }'
    );
  });

  it('should include recalculateNextReview flag in script', () => {
    const scriptFalse = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });
    expect(scriptFalse).toContain('false');

    const scriptTrue = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: true
    });
    expect(scriptTrue).toContain('true');
  });

  it('should use dc.day for days unit', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain("case 'days'");
    expect(script).toContain('dc.day');
  });

  it('should use dc.day * 7 for weeks unit (OmniJS DateComponents has no week property)', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 2, unit: 'weeks' },
      recalculateNextReview: false
    });

    expect(script).toContain("case 'weeks'");
    expect(script).toContain('* 7');
  });

  it('should use dc.month for months unit', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 1, unit: 'months' },
      recalculateNextReview: false
    });

    expect(script).toContain("case 'months'");
    expect(script).toContain('dc.month');
  });

  it('should use dc.year for years unit', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 1, unit: 'years' },
      recalculateNextReview: false
    });

    expect(script).toContain("case 'years'");
    expect(script).toContain('dc.year');
  });

  it('should use Calendar.current.startOfDay for today calculation', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('Calendar.current.startOfDay');
  });

  it('should return JSON.stringify with success, results, and summary', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('success: true');
    expect(script).toContain('results');
    expect(script).toContain('summary');
  });

  it('should handle multiple projects', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-1' }, { id: 'proj-2' }, { name: 'Named Project' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('proj-1');
    expect(script).toContain('proj-2');
    expect(script).toContain('Named Project');
  });

  it('should use Project.byIdentifier for id lookup', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ id: 'proj-123' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('Project.byIdentifier');
  });

  it('should use flattenedProjects.filter for name lookup', () => {
    const script = generateSetReviewIntervalScript({
      projects: [{ name: 'My Project' }],
      interval: { steps: 7, unit: 'days' },
      recalculateNextReview: false
    });

    expect(script).toContain('flattenedProjects');
  });
});
