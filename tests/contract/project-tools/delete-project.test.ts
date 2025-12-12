import { describe, expect, it } from 'vitest';
import {
  DeleteProjectErrorSchema,
  DeleteProjectInputSchema,
  DeleteProjectResponseSchema,
  DeleteProjectSuccessSchema
} from '../../../src/contracts/project-tools/delete-project.js';

describe('DeleteProjectInputSchema', () => {
  it('should accept valid input with id', () => {
    const result = DeleteProjectInputSchema.safeParse({ id: 'project123' });
    expect(result.success).toBe(true);
  });

  it('should accept valid input with name', () => {
    const result = DeleteProjectInputSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('should accept input with both id and name', () => {
    const result = DeleteProjectInputSchema.safeParse({
      id: 'project123',
      name: 'My Project'
    });
    expect(result.success).toBe(true);
  });

  it('should reject input with neither id nor name', () => {
    const result = DeleteProjectInputSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('At least one of id or name is required');
    }
  });

  it('should reject empty id', () => {
    const result = DeleteProjectInputSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = DeleteProjectInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('DeleteProjectSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = DeleteProjectSuccessSchema.safeParse({
      success: true,
      id: 'project123',
      name: 'My Project',
      message:
        'Project "My Project" (project123) deleted successfully. All child tasks have been removed.'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = DeleteProjectSuccessSchema.safeParse({
      success: true,
      name: 'My Project',
      message: 'Project deleted'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = DeleteProjectSuccessSchema.safeParse({
      success: true,
      id: 'project123',
      message: 'Project deleted'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without message', () => {
    const result = DeleteProjectSuccessSchema.safeParse({
      success: true,
      id: 'project123',
      name: 'My Project'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response with success: false', () => {
    const result = DeleteProjectSuccessSchema.safeParse({
      success: false,
      id: 'project123',
      name: 'My Project',
      message: 'Project deleted'
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteProjectErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = DeleteProjectErrorSchema.safeParse({
      success: false,
      error: "Project 'project123' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = DeleteProjectErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = DeleteProjectErrorSchema.safeParse({
      success: true,
      error: 'Project not found'
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteProjectResponseSchema', () => {
  it('should accept success response', () => {
    const result = DeleteProjectResponseSchema.safeParse({
      success: true,
      id: 'project123',
      name: 'My Project',
      message:
        'Project "My Project" (project123) deleted successfully. All child tasks have been removed.'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = DeleteProjectResponseSchema.safeParse({
      success: false,
      error: "Project 'project123' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = DeleteProjectResponseSchema.safeParse({
      success: false,
      error:
        "Ambiguous project name 'My Project'. Found 2 matches: id1, id2. Please specify by ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid response', () => {
    const result = DeleteProjectResponseSchema.safeParse({
      invalid: 'data'
    });
    expect(result.success).toBe(false);
  });
});
