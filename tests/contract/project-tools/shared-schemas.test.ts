import { describe, expect, it } from 'vitest';
import {
  DisambiguationErrorSchema,
  EntityReferenceSchema,
  ProjectFullSchema,
  ProjectStatusSchema,
  ProjectSummarySchema,
  ProjectTypeSchema,
  ReviewIntervalSchema,
  TagReferenceSchema
} from '../../../src/contracts/project-tools/shared/index.js';

describe('ProjectStatusSchema', () => {
  it('should accept all 4 valid status values', () => {
    const statuses = ['Active', 'OnHold', 'Done', 'Dropped'];
    for (const status of statuses) {
      const result = ProjectStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(status);
      }
    }
  });

  it('should reject invalid status strings (case-sensitive)', () => {
    const invalidStatuses = ['active', 'ACTIVE', 'onhold', 'done', 'DONE', 'dropped', 'invalid'];
    for (const status of invalidStatuses) {
      const result = ProjectStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    }
  });

  it('should reject non-string values', () => {
    const result = ProjectStatusSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it('should reject null', () => {
    const result = ProjectStatusSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

describe('ProjectTypeSchema', () => {
  it('should accept all 3 valid types', () => {
    const types = ['parallel', 'sequential', 'single-actions'];
    for (const type of types) {
      const result = ProjectTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    }
  });

  it('should reject invalid type strings', () => {
    const invalidTypes = ['Parallel', 'Sequential', 'singleActions', 'invalid'];
    for (const type of invalidTypes) {
      const result = ProjectTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  });

  it('should reject non-string values', () => {
    const result = ProjectTypeSchema.safeParse(123);
    expect(result.success).toBe(false);
  });
});

describe('ReviewIntervalSchema', () => {
  it('should accept valid review interval with minimum steps', () => {
    const validInterval = {
      steps: 1,
      unit: 'days'
    };
    const result = ReviewIntervalSchema.safeParse(validInterval);
    expect(result.success).toBe(true);
  });

  it('should accept all valid unit values', () => {
    const units = ['days', 'weeks', 'months', 'years'];
    for (const unit of units) {
      const interval = { steps: 7, unit };
      const result = ReviewIntervalSchema.safeParse(interval);
      expect(result.success).toBe(true);
    }
  });

  it('should accept large step values', () => {
    const interval = {
      steps: 365,
      unit: 'days'
    };
    const result = ReviewIntervalSchema.safeParse(interval);
    expect(result.success).toBe(true);
  });

  it('should reject steps < 1', () => {
    const invalidInterval = {
      steps: 0,
      unit: 'days'
    };
    const result = ReviewIntervalSchema.safeParse(invalidInterval);
    expect(result.success).toBe(false);
  });

  it('should reject negative steps', () => {
    const invalidInterval = {
      steps: -5,
      unit: 'days'
    };
    const result = ReviewIntervalSchema.safeParse(invalidInterval);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer steps', () => {
    const invalidInterval = {
      steps: 1.5,
      unit: 'days'
    };
    const result = ReviewIntervalSchema.safeParse(invalidInterval);
    expect(result.success).toBe(false);
  });

  it('should reject invalid unit', () => {
    const invalidInterval = {
      steps: 7,
      unit: 'hours'
    };
    const result = ReviewIntervalSchema.safeParse(invalidInterval);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = ReviewIntervalSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('EntityReferenceSchema', () => {
  it('should accept valid entity reference', () => {
    const validRef = {
      id: 'entity-123',
      name: 'Entity Name'
    };
    const result = EntityReferenceSchema.safeParse(validRef);
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const invalidRef = {
      name: 'Entity Name'
    };
    const result = EntityReferenceSchema.safeParse(invalidRef);
    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const invalidRef = {
      id: 'entity-123'
    };
    const result = EntityReferenceSchema.safeParse(invalidRef);
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = EntityReferenceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('TagReferenceSchema', () => {
  it('should accept valid tag reference', () => {
    const validRef = {
      id: 'tag-123',
      name: 'Work'
    };
    const result = TagReferenceSchema.safeParse(validRef);
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const invalidRef = {
      name: 'Work'
    };
    const result = TagReferenceSchema.safeParse(invalidRef);
    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const invalidRef = {
      id: 'tag-123'
    };
    const result = TagReferenceSchema.safeParse(invalidRef);
    expect(result.success).toBe(false);
  });
});

describe('ProjectSummarySchema', () => {
  it('should accept valid project summary with all 12 fields', () => {
    const validSummary = {
      id: 'proj-123',
      name: 'My Project',
      status: 'Active',
      flagged: false,
      projectType: 'parallel',
      deferDate: '2025-01-15T09:00:00.000Z',
      dueDate: '2025-02-01T17:00:00.000Z',
      nextReviewDate: '2025-01-20T09:00:00.000Z',
      parentFolderId: 'folder-456',
      parentFolderName: 'Work',
      taskCount: 15,
      remainingCount: 10
    };
    const result = ProjectSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it('should accept null dates', () => {
    const summary = {
      id: 'proj-123',
      name: 'My Project',
      status: 'Active',
      flagged: false,
      projectType: 'parallel',
      deferDate: null,
      dueDate: null,
      nextReviewDate: null,
      parentFolderId: null,
      parentFolderName: null,
      taskCount: 0,
      remainingCount: 0
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('should accept all valid status values', () => {
    const statuses = ['Active', 'OnHold', 'Done', 'Dropped'];
    for (const status of statuses) {
      const summary = {
        id: 'proj-123',
        name: 'Test',
        status,
        flagged: false,
        projectType: 'parallel',
        deferDate: null,
        dueDate: null,
        nextReviewDate: null,
        parentFolderId: null,
        parentFolderName: null,
        taskCount: 0,
        remainingCount: 0
      };
      const result = ProjectSummarySchema.safeParse(summary);
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid project types', () => {
    const types = ['parallel', 'sequential', 'single-actions'];
    for (const projectType of types) {
      const summary = {
        id: 'proj-123',
        name: 'Test',
        status: 'Active',
        flagged: false,
        projectType,
        deferDate: null,
        dueDate: null,
        nextReviewDate: null,
        parentFolderId: null,
        parentFolderName: null,
        taskCount: 0,
        remainingCount: 0
      };
      const result = ProjectSummarySchema.safeParse(summary);
      expect(result.success).toBe(true);
    }
  });

  it('should reject negative taskCount', () => {
    const summary = {
      id: 'proj-123',
      name: 'Test',
      status: 'Active',
      flagged: false,
      projectType: 'parallel',
      deferDate: null,
      dueDate: null,
      nextReviewDate: null,
      parentFolderId: null,
      parentFolderName: null,
      taskCount: -1,
      remainingCount: 0
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('should reject negative remainingCount', () => {
    const summary = {
      id: 'proj-123',
      name: 'Test',
      status: 'Active',
      flagged: false,
      projectType: 'parallel',
      deferDate: null,
      dueDate: null,
      nextReviewDate: null,
      parentFolderId: null,
      parentFolderName: null,
      taskCount: 0,
      remainingCount: -5
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer taskCount', () => {
    const summary = {
      id: 'proj-123',
      name: 'Test',
      status: 'Active',
      flagged: false,
      projectType: 'parallel',
      deferDate: null,
      dueDate: null,
      nextReviewDate: null,
      parentFolderId: null,
      parentFolderName: null,
      taskCount: 1.5,
      remainingCount: 0
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = ProjectSummarySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ProjectFullSchema', () => {
  it('should accept valid project with all 30 properties', () => {
    const validProject = {
      // Identity
      id: 'proj-123',
      name: 'My Project',
      note: 'Project notes here',
      // Status
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      // Project Type
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      // Completion Behavior
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      // Dates (writable)
      deferDate: '2025-01-15T09:00:00.000Z',
      dueDate: '2025-02-01T17:00:00.000Z',
      // Dates (computed/read-only)
      effectiveDeferDate: '2025-01-15T09:00:00.000Z',
      effectiveDueDate: '2025-02-01T17:00:00.000Z',
      completionDate: null,
      dropDate: null,
      // Time Estimation
      estimatedMinutes: 120,
      // Review Settings
      reviewInterval: { steps: 7, unit: 'days' },
      lastReviewDate: '2025-01-10T09:00:00.000Z',
      nextReviewDate: '2025-01-17T09:00:00.000Z',
      // Repetition
      repetitionRule: null,
      // Timezone
      shouldUseFloatingTimeZone: false,
      // Hierarchy Status
      hasChildren: true,
      // Next Action
      nextTask: { id: 'task-789', name: 'First Task' },
      // Relationships
      parentFolder: { id: 'folder-456', name: 'Work' },
      tags: [{ id: 'tag-1', name: 'Important' }],
      // Statistics
      taskCount: 15,
      remainingCount: 10
    };
    const result = ProjectFullSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('should accept null for all nullable fields', () => {
    const project = {
      id: 'proj-123',
      name: 'My Project',
      note: '',
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      deferDate: null,
      dueDate: null,
      effectiveDeferDate: null,
      effectiveDueDate: null,
      completionDate: null,
      dropDate: null,
      estimatedMinutes: null,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      repetitionRule: null,
      shouldUseFloatingTimeZone: false,
      hasChildren: false,
      nextTask: null,
      parentFolder: null,
      tags: [],
      taskCount: 0,
      remainingCount: 0
    };
    const result = ProjectFullSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it('should accept all valid status values', () => {
    const statuses = ['Active', 'OnHold', 'Done', 'Dropped'];
    for (const status of statuses) {
      const project = {
        id: 'proj-123',
        name: 'Test',
        note: '',
        status,
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        sequential: false,
        containsSingletonActions: false,
        projectType: 'parallel',
        completedByChildren: false,
        defaultSingletonActionHolder: false,
        deferDate: null,
        dueDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        completionDate: null,
        dropDate: null,
        estimatedMinutes: null,
        reviewInterval: null,
        lastReviewDate: null,
        nextReviewDate: null,
        repetitionRule: null,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        nextTask: null,
        parentFolder: null,
        tags: [],
        taskCount: 0,
        remainingCount: 0
      };
      const result = ProjectFullSchema.safeParse(project);
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid project types', () => {
    const types = ['parallel', 'sequential', 'single-actions'];
    for (const projectType of types) {
      const project = {
        id: 'proj-123',
        name: 'Test',
        note: '',
        status: 'Active',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        sequential: false,
        containsSingletonActions: false,
        projectType,
        completedByChildren: false,
        defaultSingletonActionHolder: false,
        deferDate: null,
        dueDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        completionDate: null,
        dropDate: null,
        estimatedMinutes: null,
        reviewInterval: null,
        lastReviewDate: null,
        nextReviewDate: null,
        repetitionRule: null,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        nextTask: null,
        parentFolder: null,
        tags: [],
        taskCount: 0,
        remainingCount: 0
      };
      const result = ProjectFullSchema.safeParse(project);
      expect(result.success).toBe(true);
    }
  });

  it('should accept valid reviewInterval object', () => {
    const project = {
      id: 'proj-123',
      name: 'Test',
      note: '',
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      deferDate: null,
      dueDate: null,
      effectiveDeferDate: null,
      effectiveDueDate: null,
      completionDate: null,
      dropDate: null,
      estimatedMinutes: null,
      reviewInterval: { steps: 14, unit: 'weeks' },
      lastReviewDate: null,
      nextReviewDate: null,
      repetitionRule: null,
      shouldUseFloatingTimeZone: false,
      hasChildren: false,
      nextTask: null,
      parentFolder: null,
      tags: [],
      taskCount: 0,
      remainingCount: 0
    };
    const result = ProjectFullSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it('should reject invalid reviewInterval', () => {
    const project = {
      id: 'proj-123',
      name: 'Test',
      note: '',
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      deferDate: null,
      dueDate: null,
      effectiveDeferDate: null,
      effectiveDueDate: null,
      completionDate: null,
      dropDate: null,
      estimatedMinutes: null,
      reviewInterval: { steps: 0, unit: 'days' }, // Invalid: steps < 1
      lastReviewDate: null,
      nextReviewDate: null,
      repetitionRule: null,
      shouldUseFloatingTimeZone: false,
      hasChildren: false,
      nextTask: null,
      parentFolder: null,
      tags: [],
      taskCount: 0,
      remainingCount: 0
    };
    const result = ProjectFullSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('should accept multiple tags', () => {
    const project = {
      id: 'proj-123',
      name: 'Test',
      note: '',
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      deferDate: null,
      dueDate: null,
      effectiveDeferDate: null,
      effectiveDueDate: null,
      completionDate: null,
      dropDate: null,
      estimatedMinutes: null,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      repetitionRule: null,
      shouldUseFloatingTimeZone: false,
      hasChildren: false,
      nextTask: null,
      parentFolder: null,
      tags: [
        { id: 'tag-1', name: 'Important' },
        { id: 'tag-2', name: 'Work' },
        { id: 'tag-3', name: 'Client' }
      ],
      taskCount: 0,
      remainingCount: 0
    };
    const result = ProjectFullSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it('should reject negative taskCount', () => {
    const project = {
      id: 'proj-123',
      name: 'Test',
      note: '',
      status: 'Active',
      completed: false,
      flagged: false,
      effectiveFlagged: false,
      sequential: false,
      containsSingletonActions: false,
      projectType: 'parallel',
      completedByChildren: false,
      defaultSingletonActionHolder: false,
      deferDate: null,
      dueDate: null,
      effectiveDeferDate: null,
      effectiveDueDate: null,
      completionDate: null,
      dropDate: null,
      estimatedMinutes: null,
      reviewInterval: null,
      lastReviewDate: null,
      nextReviewDate: null,
      repetitionRule: null,
      shouldUseFloatingTimeZone: false,
      hasChildren: false,
      nextTask: null,
      parentFolder: null,
      tags: [],
      taskCount: -1,
      remainingCount: 0
    };
    const result = ProjectFullSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = ProjectFullSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('DisambiguationErrorSchema', () => {
  it('should accept valid disambiguation error with exactly 2 matching IDs', () => {
    const validError = {
      success: false,
      error: "Ambiguous project name 'Work'. Found 2 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-123', 'proj-456']
    };
    const result = DisambiguationErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation with more than 2 matching IDs', () => {
    const validError = {
      success: false,
      error: "Ambiguous project name 'Home'. Found 3 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-1', 'proj-2', 'proj-3']
    };
    const result = DisambiguationErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should reject when success is true', () => {
    const invalidError = {
      success: true,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-123', 'proj-456']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when code is not DISAMBIGUATION_REQUIRED', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'OTHER_CODE',
      matchingIds: ['proj-123', 'proj-456']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when matchingIds has less than 2 items', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-123']
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject when matchingIds is empty', () => {
    const invalidError = {
      success: false,
      error: 'Some error',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: []
    };
    const result = DisambiguationErrorSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = DisambiguationErrorSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
