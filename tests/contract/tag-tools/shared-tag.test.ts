import { describe, expect, it } from 'vitest';
import { TagSchema } from '../../../src/contracts/tag-tools/shared/tag.js';

describe('TagSchema', () => {
  it('should accept valid tag with all fields', () => {
    const validTag = {
      id: 'tag-123',
      name: 'Work',
      status: 'active',
      parentId: null,
      allowsNextAction: true,
      taskCount: 5
    };
    const result = TagSchema.safeParse(validTag);
    expect(result.success).toBe(true);
  });

  it('should accept valid tag with parent', () => {
    const validTag = {
      id: 'tag-456',
      name: 'Office',
      status: 'onHold',
      parentId: 'tag-123',
      allowsNextAction: false,
      taskCount: 0
    };
    const result = TagSchema.safeParse(validTag);
    expect(result.success).toBe(true);
  });

  it('should accept all valid status values', () => {
    const statuses = ['active', 'onHold', 'dropped'];
    for (const status of statuses) {
      const tag = {
        id: 'tag-123',
        name: 'Test',
        status,
        parentId: null,
        allowsNextAction: true,
        taskCount: 0
      };
      const result = TagSchema.safeParse(tag);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status value', () => {
    const invalidTag = {
      id: 'tag-123',
      name: 'Test',
      status: 'invalid',
      parentId: null,
      allowsNextAction: true,
      taskCount: 0
    };
    const result = TagSchema.safeParse(invalidTag);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = TagSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject negative taskCount', () => {
    const invalidTag = {
      id: 'tag-123',
      name: 'Test',
      status: 'active',
      parentId: null,
      allowsNextAction: true,
      taskCount: -1
    };
    const result = TagSchema.safeParse(invalidTag);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer taskCount', () => {
    const invalidTag = {
      id: 'tag-123',
      name: 'Test',
      status: 'active',
      parentId: null,
      allowsNextAction: true,
      taskCount: 1.5
    };
    const result = TagSchema.safeParse(invalidTag);
    expect(result.success).toBe(false);
  });
});
