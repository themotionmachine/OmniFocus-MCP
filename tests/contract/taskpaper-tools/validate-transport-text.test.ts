import { describe, expect, it } from 'vitest';
import {
  ParsedItemSchema,
  ValidationSummarySchema,
  ValidationWarningSchema
} from '../../../src/contracts/taskpaper-tools/shared/index.js';
import {
  ValidateTransportTextErrorSchema,
  ValidateTransportTextInputSchema,
  ValidateTransportTextResponseSchema,
  ValidateTransportTextSuccessSchema
} from '../../../src/contracts/taskpaper-tools/validate-transport-text.js';

// T021: Contract tests for validate_transport_text schemas

describe('ValidateTransportTextInputSchema', () => {
  it('should accept any non-empty string', () => {
    const result = ValidateTransportTextInputSchema.safeParse({ text: '- Buy milk' });
    expect(result.success).toBe(true);
  });

  it('should accept whitespace-only string (validator returns zero-item report)', () => {
    const result = ValidateTransportTextInputSchema.safeParse({ text: '   \n\t' });
    expect(result.success).toBe(true);
  });

  it('should accept empty string (schema allows it, validator handles it)', () => {
    const result = ValidateTransportTextInputSchema.safeParse({ text: '' });
    expect(result.success).toBe(true);
  });

  it('should reject missing text', () => {
    const result = ValidateTransportTextInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string text', () => {
    const result = ValidateTransportTextInputSchema.safeParse({ text: 123 });
    expect(result.success).toBe(false);
  });
});

describe('ParsedItemSchema (recursive)', () => {
  it('should accept valid parsed item with no children', () => {
    const result = ParsedItemSchema.safeParse({
      name: 'Buy milk',
      type: 'task',
      depth: 0,
      tags: ['errands'],
      dueDate: '2026-03-20',
      deferDate: null,
      doneDate: null,
      flagged: false,
      estimate: '15m',
      note: null,
      projectName: null,
      children: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept parsed item with nested children', () => {
    const result = ParsedItemSchema.safeParse({
      name: 'Parent',
      type: 'task',
      depth: 0,
      tags: [],
      dueDate: null,
      deferDate: null,
      doneDate: null,
      flagged: false,
      estimate: null,
      note: null,
      projectName: null,
      children: [
        {
          name: 'Child',
          type: 'task',
          depth: 1,
          tags: [],
          dueDate: null,
          deferDate: null,
          doneDate: null,
          flagged: false,
          estimate: null,
          note: null,
          projectName: null,
          children: []
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept project type', () => {
    const result = ParsedItemSchema.safeParse({
      name: 'My Project',
      type: 'project',
      depth: 0,
      tags: [],
      dueDate: null,
      deferDate: null,
      doneDate: null,
      flagged: false,
      estimate: null,
      note: null,
      projectName: null,
      children: []
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = ParsedItemSchema.safeParse({
      name: 'Test',
      type: 'folder',
      depth: 0,
      tags: [],
      dueDate: null,
      deferDate: null,
      doneDate: null,
      flagged: false,
      estimate: null,
      note: null,
      projectName: null,
      children: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative depth', () => {
    const result = ParsedItemSchema.safeParse({
      name: 'Test',
      type: 'task',
      depth: -1,
      tags: [],
      dueDate: null,
      deferDate: null,
      doneDate: null,
      flagged: false,
      estimate: null,
      note: null,
      projectName: null,
      children: []
    });
    expect(result.success).toBe(false);
  });
});

describe('ValidationSummarySchema', () => {
  it('should accept valid summary', () => {
    const result = ValidationSummarySchema.safeParse({
      tasks: 5,
      projects: 1,
      tags: 3,
      maxDepth: 2
    });
    expect(result.success).toBe(true);
  });

  it('should accept zero values', () => {
    const result = ValidationSummarySchema.safeParse({
      tasks: 0,
      projects: 0,
      tags: 0,
      maxDepth: 0
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative values', () => {
    const result = ValidationSummarySchema.safeParse({
      tasks: -1,
      projects: 0,
      tags: 0,
      maxDepth: 0
    });
    expect(result.success).toBe(false);
  });
});

describe('ValidationWarningSchema', () => {
  it('should accept valid warning', () => {
    const result = ValidationWarningSchema.safeParse({
      line: 3,
      message: 'Unrecognized syntax',
      content: '??? unknown'
    });
    expect(result.success).toBe(true);
  });

  it('should reject line number 0', () => {
    const result = ValidationWarningSchema.safeParse({
      line: 0,
      message: 'Bad',
      content: 'x'
    });
    expect(result.success).toBe(false);
  });
});

describe('ValidateTransportTextSuccessSchema', () => {
  it('should accept success with items, summary, and warnings', () => {
    const result = ValidateTransportTextSuccessSchema.safeParse({
      success: true,
      items: [
        {
          name: 'Task',
          type: 'task',
          depth: 0,
          tags: [],
          dueDate: null,
          deferDate: null,
          doneDate: null,
          flagged: false,
          estimate: null,
          note: null,
          projectName: null,
          children: []
        }
      ],
      summary: { tasks: 1, projects: 0, tags: 0, maxDepth: 0 },
      warnings: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success with empty items (zero-item report)', () => {
    const result = ValidateTransportTextSuccessSchema.safeParse({
      success: true,
      items: [],
      summary: { tasks: 0, projects: 0, tags: 0, maxDepth: 0 },
      warnings: []
    });
    expect(result.success).toBe(true);
  });
});

describe('ValidateTransportTextErrorSchema', () => {
  it('should accept error response', () => {
    const result = ValidateTransportTextErrorSchema.safeParse({
      success: false,
      error: 'Validation failed'
    });
    expect(result.success).toBe(true);
  });
});

describe('ValidateTransportTextResponseSchema', () => {
  it('should accept success variant', () => {
    const result = ValidateTransportTextResponseSchema.safeParse({
      success: true,
      items: [],
      summary: { tasks: 0, projects: 0, tags: 0, maxDepth: 0 },
      warnings: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error variant', () => {
    const result = ValidateTransportTextResponseSchema.safeParse({
      success: false,
      error: 'Failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid discriminator', () => {
    const result = ValidateTransportTextResponseSchema.safeParse({
      success: 'maybe'
    });
    expect(result.success).toBe(false);
  });
});
