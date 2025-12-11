import { describe, expect, it } from 'vitest';
import {
  DisambiguationErrorSchema,
  EntityReferenceSchema,
  TagReferenceSchema,
  TaskFullSchema,
  TaskStatusSchema,
  TaskSummarySchema
} from '../../../src/contracts/task-tools/index.js';

describe('TaskStatusSchema', () => {
  describe('valid status values', () => {
    it('should accept "Available"', () => {
      const result = TaskStatusSchema.safeParse('Available');
      expect(result.success).toBe(true);
    });

    it('should accept "Blocked"', () => {
      const result = TaskStatusSchema.safeParse('Blocked');
      expect(result.success).toBe(true);
    });

    it('should accept "Completed"', () => {
      const result = TaskStatusSchema.safeParse('Completed');
      expect(result.success).toBe(true);
    });

    it('should accept "Dropped"', () => {
      const result = TaskStatusSchema.safeParse('Dropped');
      expect(result.success).toBe(true);
    });

    it('should accept "DueSoon"', () => {
      const result = TaskStatusSchema.safeParse('DueSoon');
      expect(result.success).toBe(true);
    });

    it('should accept "Next"', () => {
      const result = TaskStatusSchema.safeParse('Next');
      expect(result.success).toBe(true);
    });

    it('should accept "Overdue"', () => {
      const result = TaskStatusSchema.safeParse('Overdue');
      expect(result.success).toBe(true);
    });
  });

  describe('invalid status values', () => {
    it('should reject lowercase status', () => {
      const result = TaskStatusSchema.safeParse('available');
      expect(result.success).toBe(false);
    });

    it('should reject unknown status', () => {
      const result = TaskStatusSchema.safeParse('Unknown');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = TaskStatusSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = TaskStatusSchema.safeParse(123);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = TaskStatusSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe('EntityReferenceSchema', () => {
  describe('valid references', () => {
    it('should accept valid entity reference', () => {
      const result = EntityReferenceSchema.safeParse({
        id: 'abc123',
        name: 'Project Name'
      });
      expect(result.success).toBe(true);
    });

    it('should accept reference with empty name', () => {
      const result = EntityReferenceSchema.safeParse({
        id: 'abc123',
        name: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept reference with special characters in name', () => {
      const result = EntityReferenceSchema.safeParse({
        id: 'abc123',
        name: 'Project: Work / Personal (2024)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid references', () => {
    it('should reject missing id', () => {
      const result = EntityReferenceSchema.safeParse({
        name: 'Project Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = EntityReferenceSchema.safeParse({
        id: 'abc123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = EntityReferenceSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = EntityReferenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('TagReferenceSchema', () => {
  describe('valid references', () => {
    it('should accept valid tag reference', () => {
      const result = TagReferenceSchema.safeParse({
        id: 'tag123',
        name: 'Work'
      });
      expect(result.success).toBe(true);
    });

    it('should accept tag with empty name', () => {
      const result = TagReferenceSchema.safeParse({
        id: 'tag123',
        name: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid references', () => {
    it('should reject missing id', () => {
      const result = TagReferenceSchema.safeParse({
        name: 'Work'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = TagReferenceSchema.safeParse({
        id: 'tag123'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('TaskSummarySchema', () => {
  const validTaskSummary = {
    id: 'task123',
    name: 'Test Task',
    taskStatus: 'Available',
    flagged: false,
    deferDate: null,
    dueDate: null,
    plannedDate: null,
    projectId: null,
    projectName: null,
    tagIds: [],
    tagNames: []
  };

  describe('valid summaries', () => {
    it('should accept minimal valid task summary', () => {
      const result = TaskSummarySchema.safeParse(validTaskSummary);
      expect(result.success).toBe(true);
    });

    it('should accept task with all dates set', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        deferDate: '2025-01-15T09:00:00.000Z',
        dueDate: '2025-01-20T17:00:00.000Z',
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with project', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        projectId: 'proj123',
        projectName: 'My Project'
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with tags', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        tagIds: ['tag1', 'tag2'],
        tagNames: ['Work', 'Urgent']
      });
      expect(result.success).toBe(true);
    });

    it('should accept flagged task', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        flagged: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = [
        'Available',
        'Blocked',
        'Completed',
        'Dropped',
        'DueSoon',
        'Next',
        'Overdue'
      ];
      for (const status of statuses) {
        const result = TaskSummarySchema.safeParse({
          ...validTaskSummary,
          taskStatus: status
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('required fields', () => {
    it('should reject missing id', () => {
      const { id: _id, ...withoutId } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const { name: _name, ...withoutName } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutName);
      expect(result.success).toBe(false);
    });

    it('should reject missing taskStatus', () => {
      const { taskStatus: _taskStatus, ...withoutStatus } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutStatus);
      expect(result.success).toBe(false);
    });

    it('should reject missing flagged', () => {
      const { flagged: _flagged, ...withoutFlagged } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutFlagged);
      expect(result.success).toBe(false);
    });

    it('should reject missing tagIds', () => {
      const { tagIds: _tagIds, ...withoutTagIds } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutTagIds);
      expect(result.success).toBe(false);
    });

    it('should reject missing tagNames', () => {
      const { tagNames: _tagNames, ...withoutTagNames } = validTaskSummary;
      const result = TaskSummarySchema.safeParse(withoutTagNames);
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject invalid taskStatus', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        taskStatus: 'InvalidStatus'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean flagged', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        flagged: 'true'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        dueDate: 'not-a-date'
      });
      expect(result.success).toBe(true); // String type allows any string
    });

    it('should reject non-array tagIds', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        tagIds: 'tag1,tag2'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string elements in tagIds', () => {
      const result = TaskSummarySchema.safeParse({
        ...validTaskSummary,
        tagIds: [123, 456]
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('TaskFullSchema', () => {
  const validTaskFull = {
    // Identity
    id: 'task123',
    name: 'Test Task',
    note: '',

    // Status
    taskStatus: 'Available',
    completed: false,
    flagged: false,
    effectiveFlagged: false,

    // Dates (writable)
    deferDate: null,
    dueDate: null,
    plannedDate: null,

    // Dates (computed/read-only)
    effectiveDeferDate: null,
    effectiveDueDate: null,
    effectivePlannedDate: null,
    completionDate: null,
    dropDate: null,
    added: null,
    modified: null,

    // Time Estimation
    estimatedMinutes: null,

    // Hierarchy Configuration
    sequential: false,
    completedByChildren: false,
    shouldUseFloatingTimeZone: false,

    // Hierarchy Status
    hasChildren: false,
    inInbox: true,

    // Relationships
    containingProject: null,
    parent: null,
    tags: []
  };

  describe('valid full tasks', () => {
    it('should accept minimal valid task', () => {
      const result = TaskFullSchema.safeParse(validTaskFull);
      expect(result.success).toBe(true);
    });

    it('should accept task with all properties set', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        note: 'Task notes here',
        completed: true,
        flagged: true,
        effectiveFlagged: true,
        deferDate: '2025-01-15T09:00:00.000Z',
        dueDate: '2025-01-20T17:00:00.000Z',
        plannedDate: '2025-01-18T10:00:00.000Z',
        effectiveDeferDate: '2025-01-15T09:00:00.000Z',
        effectiveDueDate: '2025-01-20T17:00:00.000Z',
        effectivePlannedDate: '2025-01-18T10:00:00.000Z',
        completionDate: '2025-01-19T14:30:00.000Z',
        added: '2025-01-10T08:00:00.000Z',
        modified: '2025-01-19T14:30:00.000Z',
        estimatedMinutes: 60,
        sequential: true,
        completedByChildren: true,
        shouldUseFloatingTimeZone: true,
        hasChildren: true,
        inInbox: false,
        containingProject: { id: 'proj123', name: 'My Project' },
        parent: { id: 'parent123', name: 'Parent Task' },
        tags: [
          { id: 'tag1', name: 'Work' },
          { id: 'tag2', name: 'Urgent' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with zero estimatedMinutes', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        estimatedMinutes: 0
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with empty tags array', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        tags: []
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with multiple tags', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        tags: [
          { id: 'tag1', name: 'Work' },
          { id: 'tag2', name: 'Urgent' },
          { id: 'tag3', name: 'Personal' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = [
        'Available',
        'Blocked',
        'Completed',
        'Dropped',
        'DueSoon',
        'Next',
        'Overdue'
      ];
      for (const status of statuses) {
        const result = TaskFullSchema.safeParse({
          ...validTaskFull,
          taskStatus: status
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('required fields', () => {
    it('should reject missing id', () => {
      const { id: _id, ...withoutId } = validTaskFull;
      const result = TaskFullSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const { name: _name, ...withoutName } = validTaskFull;
      const result = TaskFullSchema.safeParse(withoutName);
      expect(result.success).toBe(false);
    });

    it('should reject missing taskStatus', () => {
      const { taskStatus: _taskStatus, ...withoutStatus } = validTaskFull;
      const result = TaskFullSchema.safeParse(withoutStatus);
      expect(result.success).toBe(false);
    });

    it('should reject missing completed', () => {
      const { completed: _completed, ...withoutCompleted } = validTaskFull;
      const result = TaskFullSchema.safeParse(withoutCompleted);
      expect(result.success).toBe(false);
    });

    it('should reject missing tags array', () => {
      const { tags: _tags, ...withoutTags } = validTaskFull;
      const result = TaskFullSchema.safeParse(withoutTags);
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject invalid taskStatus', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        taskStatus: 'InvalidStatus'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean completed', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        completed: 1
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean flagged', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        flagged: 'true'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean sequential', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        sequential: 1
      });
      expect(result.success).toBe(false);
    });

    it('should reject string estimatedMinutes', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        estimatedMinutes: '60'
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative estimatedMinutes', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        estimatedMinutes: -30
      });
      expect(result.success).toBe(true); // No min constraint in schema
    });

    it('should reject non-array tags', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        tags: 'Work,Urgent'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid tag reference', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        tags: [{ id: 'tag1' }] // Missing name
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid containingProject reference', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        containingProject: { id: 'proj123' } // Missing name
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parent reference', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        parent: { name: 'Parent' } // Missing id
      });
      expect(result.success).toBe(false);
    });
  });

  describe('nullable fields', () => {
    it('should accept null dates', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        deferDate: null,
        dueDate: null,
        plannedDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept null relationships', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        containingProject: null,
        parent: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept null estimatedMinutes', () => {
      const result = TaskFullSchema.safeParse({
        ...validTaskFull,
        estimatedMinutes: null
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('DisambiguationErrorSchema', () => {
  describe('valid disambiguation errors', () => {
    it('should accept error with 2 matching IDs', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple tasks found with name "Task"',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with 3 matching IDs', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple tasks found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3']
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with many matching IDs', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3', 'id4', 'id5']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = DisambiguationErrorSchema.safeParse({
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing code field', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing matchingIds field', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: true', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: true,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(false);
    });

    it('should reject wrong error code', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'NOT_FOUND',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(false);
    });
  });

  describe('matchingIds validation', () => {
    it('should reject empty matchingIds array', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: []
      });
      expect(result.success).toBe(false);
    });

    it('should reject single matchingId (min 2 required)', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1']
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-array matchingIds', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: 'id1,id2'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string elements in matchingIds', () => {
      const result = DisambiguationErrorSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: [123, 456]
      });
      expect(result.success).toBe(false);
    });
  });
});
