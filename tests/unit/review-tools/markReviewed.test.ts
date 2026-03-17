import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateMarkReviewedScript,
  markReviewed
} from '../../../src/tools/primitives/markReviewed.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T008: Unit tests for markReviewed primitive

describe('markReviewed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single project by ID', () => {
    it('should mark a single project reviewed by ID successfully', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-abc',
            projectName: 'Work Projects',
            success: true,
            previousNextReviewDate: '2025-12-09T00:00:00.000Z',
            newNextReviewDate: '2025-12-16T00:00:00.000Z'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markReviewed({ projects: [{ id: 'proj-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].projectId).toBe('proj-abc');
        expect(result.summary.total).toBe(1);
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(0);
      }
    });

    it('should call executeOmniJS with generated script', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await markReviewed({ projects: [{ id: 'proj-abc' }] });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(typeof calledScript).toBe('string');
      expect(calledScript).toContain('proj-abc');
    });
  });

  describe('single project by name', () => {
    it('should mark a single project reviewed by name when name is unique', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-resolved',
            projectName: 'Work Projects',
            success: true,
            previousNextReviewDate: null,
            newNextReviewDate: '2025-12-16T00:00:00.000Z'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markReviewed({ projects: [{ name: 'Work Projects' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].projectName).toBe('Work Projects');
        expect(result.results[0].success).toBe(true);
      }
    });
  });

  describe('batch with 3 projects', () => {
    it('should return per-item results for batch operation', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-1',
            projectName: 'Alpha',
            success: true,
            previousNextReviewDate: '2025-12-02T00:00:00.000Z',
            newNextReviewDate: '2025-12-09T00:00:00.000Z'
          },
          {
            projectId: 'proj-2',
            projectName: 'Beta',
            success: true,
            previousNextReviewDate: null,
            newNextReviewDate: '2025-12-23T00:00:00.000Z'
          },
          {
            projectId: 'proj-3',
            projectName: 'Gamma',
            success: true,
            previousNextReviewDate: '2025-11-09T00:00:00.000Z',
            newNextReviewDate: '2025-12-09T00:00:00.000Z'
          }
        ],
        summary: { total: 3, succeeded: 3, failed: 0 }
      });

      const result = await markReviewed({
        projects: [{ id: 'proj-1' }, { id: 'proj-2' }, { id: 'proj-3' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(3);
        expect(result.summary.total).toBe(3);
        expect(result.summary.succeeded).toBe(3);
        expect(result.summary.failed).toBe(0);
      }
    });
  });

  describe('error conditions', () => {
    it('should return NOT_FOUND error when project ID does not exist', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
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

      const result = await markReviewed({ projects: [{ id: 'proj-999' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.results[0].error).toContain('not found');
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should return DISAMBIGUATION_REQUIRED with candidates when name matches multiple projects', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: '',
            projectName: 'Home',
            success: false,
            error: "Multiple projects match 'Home'. Use ID for precision.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'proj-home-1', name: 'Home' },
              { id: 'proj-home-2', name: 'Home' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await markReviewed({ projects: [{ name: 'Home' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        const itemResult = result.results[0];
        expect(itemResult.success).toBe(false);
        expect(itemResult.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(itemResult.candidates).toHaveLength(2);
        expect(itemResult.candidates?.[0].id).toBe('proj-home-1');
      }
    });

    it('should return NO_REVIEW_INTERVAL error when project has no reviewInterval', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-no-interval',
            projectName: 'No Review',
            success: false,
            error: "Project 'No Review' has no review interval configured",
            code: 'NO_REVIEW_INTERVAL'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await markReviewed({ projects: [{ id: 'proj-no-interval' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('NO_REVIEW_INTERVAL');
        expect(result.results[0].success).toBe(false);
      }
    });
  });

  describe('partial batch failure', () => {
    it('should return success for valid projects and failure for invalid ones', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: 'proj-good',
            projectName: 'Good Project',
            success: true,
            previousNextReviewDate: '2025-12-09T00:00:00.000Z',
            newNextReviewDate: '2025-12-16T00:00:00.000Z'
          },
          {
            projectId: 'proj-missing',
            projectName: '',
            success: false,
            error: 'Project not found: proj-missing',
            code: 'NOT_FOUND'
          },
          {
            projectId: 'proj-no-interval',
            projectName: 'No Interval',
            success: false,
            error: "Project 'No Interval' has no review interval configured",
            code: 'NO_REVIEW_INTERVAL'
          }
        ],
        summary: { total: 3, succeeded: 1, failed: 2 }
      });

      const result = await markReviewed({
        projects: [{ id: 'proj-good' }, { id: 'proj-missing' }, { id: 'proj-no-interval' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(3);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.results[2].success).toBe(false);
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(2);
      }
    });

    it('should preserve original array indices in results', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            projectId: '',
            projectName: 'NotFound',
            success: false,
            error: 'Project not found: NotFound',
            code: 'NOT_FOUND'
          },
          {
            projectId: 'proj-2',
            projectName: 'Found Project',
            success: true,
            previousNextReviewDate: null,
            newNextReviewDate: '2026-01-16T00:00:00.000Z'
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await markReviewed({
        projects: [{ name: 'NotFound' }, { id: 'proj-2' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Index 0 = failure, index 1 = success
        expect(result.results[0].success).toBe(false);
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].projectId).toBe('proj-2');
      }
    });
  });

  describe('OmniJS error handling', () => {
    it('should return structured error on OmniJS failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not running'
      });

      const result = await markReviewed({ projects: [{ id: 'proj-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('OmniFocus is not running');
      }
    });

    it('should propagate errors from executeOmniJS rejection', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(markReviewed({ projects: [{ id: 'proj-abc' }] })).rejects.toThrow(
        'Script execution failed'
      );
    });
  });
});

describe('generateMarkReviewedScript', () => {
  it('should produce a valid OmniJS script string', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include Calendar API calls for date math', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('Calendar.current.startOfDay');
    expect(script).toContain('Calendar.current.dateByAddingDateComponents');
    expect(script).toContain('DateComponents');
  });

  it('should include try-catch error handling', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should embed project identifiers in the script', () => {
    const script = generateMarkReviewedScript({
      projects: [{ id: 'proj-abc' }, { name: 'My Work' }]
    });
    expect(script).toContain('proj-abc');
    expect(script).toContain('My Work');
  });

  it('should include all four interval unit mappings (days, weeks, months, years)', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('days');
    expect(script).toContain('weeks');
    expect(script).toContain('months');
    expect(script).toContain('years');
    // Verify DateComponents property assignments
    // Note: OmniJS DateComponents has no 'week' property; weeks use dc.day = steps * 7
    expect(script).toContain('dc.day');
    expect(script).toContain('* 7');
    expect(script).toContain('dc.month');
    expect(script).toContain('dc.year');
  });

  it('should include IIFE wrapper', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include nextReviewDate assignment', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('project.nextReviewDate');
  });

  it('should include Project.byIdentifier for ID lookup', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('Project.byIdentifier');
  });

  it('should include flattenedProjects filter for name lookup', () => {
    const script = generateMarkReviewedScript({ projects: [{ name: 'My Project' }] });
    expect(script).toContain('flattenedProjects');
  });

  it('should include error codes for all error conditions', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('NOT_FOUND');
    expect(script).toContain('DISAMBIGUATION_REQUIRED');
    expect(script).toContain('NO_REVIEW_INTERVAL');
  });

  it('should include summary object in return', () => {
    const script = generateMarkReviewedScript({ projects: [{ id: 'proj-abc' }] });
    expect(script).toContain('summary');
    expect(script).toContain('succeeded');
    expect(script).toContain('failed');
  });

  it('should properly escape special characters in project names', () => {
    const script = generateMarkReviewedScript({
      projects: [{ name: 'Project "Alpha" & Beta' }]
    });
    // Should not have unescaped double quotes that would break the JS
    expect(typeof script).toBe('string');
    // The script should contain the escaped version
    expect(script).toContain('Project \\"Alpha\\" & Beta');
  });
});
