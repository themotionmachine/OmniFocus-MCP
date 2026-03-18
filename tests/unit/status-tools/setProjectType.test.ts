import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSetProjectTypeScript,
  setProjectType
} from '../../../src/tools/primitives/setProjectType.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// US4: Unit tests for setProjectType primitive

describe('setProjectType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('by project ID', () => {
    it('should set sequential type by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'Work Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });

      const result = await setProjectType({ id: 'proj-123', projectType: 'sequential' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('proj-123');
        expect(result.name).toBe('Work Project');
        expect(result.projectType).toBe('sequential');
        expect(result.sequential).toBe(true);
        expect(result.containsSingletonActions).toBe(false);
      }
    });

    it('should set parallel type by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'Work Project',
        projectType: 'parallel',
        sequential: false,
        containsSingletonActions: false
      });

      const result = await setProjectType({ id: 'proj-123', projectType: 'parallel' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.projectType).toBe('parallel');
        expect(result.sequential).toBe(false);
        expect(result.containsSingletonActions).toBe(false);
      }
    });

    it('should set single-actions type by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'Work Project',
        projectType: 'single-actions',
        sequential: false,
        containsSingletonActions: true
      });

      const result = await setProjectType({ id: 'proj-123', projectType: 'single-actions' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.projectType).toBe('single-actions');
        expect(result.sequential).toBe(false);
        expect(result.containsSingletonActions).toBe(true);
      }
    });
  });

  describe('by project name', () => {
    it('should set sequential type by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-456',
        name: 'Named Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });

      const result = await setProjectType({ name: 'Named Project', projectType: 'sequential' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('proj-456');
        expect(result.name).toBe('Named Project');
        expect(result.sequential).toBe(true);
      }
    });

    it('should return disambiguation error when multiple projects match', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Multiple projects match 'Duplicate Project'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj-1', 'proj-2']
      });

      const result = await setProjectType({
        name: 'Duplicate Project',
        projectType: 'sequential'
      });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
        expect(result.matchingIds).toEqual(['proj-1', 'proj-2']);
      }
    });

    it('should return error when project not found by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Project 'Nonexistent' not found"
      });

      const result = await setProjectType({ name: 'Nonexistent', projectType: 'parallel' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('error handling', () => {
    it('should return error when project not found by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Project 'bad-id' not found"
      });

      const result = await setProjectType({ id: 'bad-id', projectType: 'sequential' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should handle catastrophic OmniJS failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'Unexpected OmniJS error'
      });

      const result = await setProjectType({ id: 'proj-123', projectType: 'sequential' });

      expect(result.success).toBe(false);
    });

    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });

      await setProjectType({ id: 'proj-123', projectType: 'sequential' });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
      expect(executeOmniJS).toHaveBeenCalledWith(expect.any(String));
    });
  });
});

describe('generateSetProjectTypeScript', () => {
  it('should generate script with switch statement for sequential', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-123', projectType: 'sequential' });
    expect(script).toContain('switch');
    expect(script).toContain('sequential');
    expect(script).toContain('project.sequential = true');
    expect(script).toContain('project.containsSingletonActions = false');
  });

  it('should generate script with switch statement for parallel', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-123', projectType: 'parallel' });
    expect(script).toContain('switch');
    expect(script).toContain('parallel');
    expect(script).toContain('project.sequential = false');
    expect(script).toContain('project.containsSingletonActions = false');
  });

  it('should generate script with switch statement for single-actions', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-123', projectType: 'single-actions' });
    expect(script).toContain('switch');
    expect(script).toContain('single-actions');
    expect(script).toContain('project.containsSingletonActions = true');
    expect(script).toContain('project.sequential = false');
  });

  it('should embed project ID in script when id is provided', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-abc-123', projectType: 'sequential' });
    expect(script).toContain('proj-abc-123');
    expect(script).toContain('Project.byIdentifier');
  });

  it('should embed project name in script when name is provided', () => {
    const script = generateSetProjectTypeScript({
      name: 'My Work Project',
      projectType: 'parallel'
    });
    expect(script).toContain('My Work Project');
    expect(script).toContain('flattenedProjects');
  });

  it('should use ID lookup when both id and name are provided', () => {
    const script = generateSetProjectTypeScript({
      id: 'proj-123',
      name: 'My Project',
      projectType: 'sequential'
    });
    expect(script).toContain('Project.byIdentifier');
  });

  it('should include try-catch for error handling', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-123', projectType: 'sequential' });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should return IIFE structure', () => {
    const script = generateSetProjectTypeScript({ id: 'proj-123', projectType: 'sequential' });
    expect(script).toContain('(function()');
    expect(script).toContain('})()');
  });

  it('should handle names with special characters safely', () => {
    const script = generateSetProjectTypeScript({
      name: 'Project "with quotes" and \\backslash',
      projectType: 'sequential'
    });
    // Should not break the script with raw unescaped characters
    expect(script).toContain('Project');
    expect(script).toContain('with quotes');
  });

  it('should return mutual exclusion — sequential clears containsSingletonActions', () => {
    const script = generateSetProjectTypeScript({ id: 'p', projectType: 'sequential' });
    // Both flags must appear in the sequential case
    const sequentialCaseIdx = script.indexOf("case 'sequential'");
    const parallelCaseIdx = script.indexOf("case 'parallel'");
    const sequentialCase = script.substring(sequentialCaseIdx, parallelCaseIdx);
    expect(sequentialCase).toContain('project.sequential = true');
    expect(sequentialCase).toContain('project.containsSingletonActions = false');
  });

  it('should return mutual exclusion — single-actions sets containsSingletonActions and clears sequential', () => {
    const script = generateSetProjectTypeScript({ id: 'p', projectType: 'single-actions' });
    const singleActionsCaseIdx = script.indexOf("case 'single-actions'");
    const singleActionsCase = script.substring(singleActionsCaseIdx, singleActionsCaseIdx + 200);
    expect(singleActionsCase).toContain('project.containsSingletonActions = true');
    expect(singleActionsCase).toContain('project.sequential = false');
  });
});
