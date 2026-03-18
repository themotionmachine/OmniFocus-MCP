import { describe, expect, it } from 'vitest';
import {
  SetProjectTypeErrorSchema,
  SetProjectTypeInputSchema,
  SetProjectTypeResponseSchema,
  SetProjectTypeSuccessSchema
} from '../../../src/contracts/status-tools/set-project-type.js';

// US4: Contract tests for SetProjectType schemas

describe('SetProjectTypeInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id with sequential type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123',
        projectType: 'sequential'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with parallel type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123',
        projectType: 'parallel'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with single-actions type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123',
        projectType: 'single-actions'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with sequential type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        name: 'My Project',
        projectType: 'sequential'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with parallel type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        name: 'My Project',
        projectType: 'parallel'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with single-actions type', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        name: 'My Project',
        projectType: 'single-actions'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123',
        name: 'My Project',
        projectType: 'parallel'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required field validation', () => {
    it('should reject when neither id nor name is provided', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });

    it('should reject when both id and name are empty strings', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: '',
        name: '',
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });

    it('should reject when id is empty and name is missing', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: '',
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });

    it('should reject when name is empty and id is missing', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        name: '',
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing projectType', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid projectType value', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 'proj-123',
        projectType: 'invalid-type'
      });
      expect(result.success).toBe(false);
    });

    it('should reject all 3 invalid project type strings', () => {
      const invalidTypes = ['Sequential', 'PARALLEL', 'singleton', 'none', ''];
      for (const type of invalidTypes) {
        const result = SetProjectTypeInputSchema.safeParse({
          id: 'proj-123',
          projectType: type
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('type validation', () => {
    it('should reject non-string id', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        id: 123,
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = SetProjectTypeInputSchema.safeParse({
        name: 123,
        projectType: 'sequential'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetProjectTypeSuccessSchema', () => {
  describe('valid success responses', () => {
    it('should accept sequential success response', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sequential).toBe(true);
        expect(result.data.containsSingletonActions).toBe(false);
        expect(result.data.projectType).toBe('sequential');
      }
    });

    it('should accept parallel success response', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'parallel',
        sequential: false,
        containsSingletonActions: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sequential).toBe(false);
        expect(result.data.containsSingletonActions).toBe(false);
        expect(result.data.projectType).toBe('parallel');
      }
    });

    it('should accept single-actions success response', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'single-actions',
        sequential: false,
        containsSingletonActions: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sequential).toBe(false);
        expect(result.data.containsSingletonActions).toBe(true);
        expect(result.data.projectType).toBe('single-actions');
      }
    });
  });

  describe('required fields', () => {
    it('should reject missing sequential field', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing containsSingletonActions field', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        sequential: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        name: 'My Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing projectType', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: false', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: false,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid projectType in success response', () => {
      const result = SetProjectTypeSuccessSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'invalid',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetProjectTypeErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept standard error with error string', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false,
        error: "Project 'proj-123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false,
        error: "Multiple projects match 'My Project'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj-1', 'proj-2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with 3+ matching IDs', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj-1', 'proj-2', 'proj-3']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('disambiguation validation', () => {
    it('should reject disambiguation with fewer than 2 IDs', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['only-one']
      });
      expect(result.success).toBe(false);
    });

    it('should reject disambiguation with empty matchingIds', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: []
      });
      expect(result.success).toBe(false);
    });
  });

  describe('required fields', () => {
    it('should reject missing error field in standard error', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: true', () => {
      const result = SetProjectTypeErrorSchema.safeParse({
        success: true,
        error: 'Error message'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetProjectTypeResponseSchema', () => {
  describe('valid responses', () => {
    it('should accept sequential success response', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        sequential: true,
        containsSingletonActions: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept parallel success response', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'parallel',
        sequential: false,
        containsSingletonActions: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept single-actions success response', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: true,
        id: 'proj-456',
        name: 'Singleton Project',
        projectType: 'single-actions',
        sequential: false,
        containsSingletonActions: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept standard error response', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: false,
        error: "Project 'proj-123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error response', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: false,
        error: "Multiple projects match 'My Project'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj-1', 'proj-2']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid responses', () => {
    it('should reject success response missing sequential', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: true,
        id: 'proj-123',
        name: 'My Project',
        projectType: 'sequential',
        containsSingletonActions: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject error response missing error field', () => {
      const result = SetProjectTypeResponseSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = SetProjectTypeResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = SetProjectTypeResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
