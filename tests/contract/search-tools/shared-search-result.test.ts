import { describe, expect, it } from 'vitest';
import {
  ProjectStatusValueSchema,
  SearchFolderResultSchema,
  SearchProjectResultSchema,
  SearchTagResultSchema,
  SearchTaskResultSchema,
  TagStatusValueSchema,
  TaskStatusValueSchema
} from '../../../src/contracts/search-tools/shared/index.js';

// T006: Contract tests for shared search result schemas

describe('TaskStatusValueSchema', () => {
  it('should accept all 7 task status values', () => {
    const values = ['available', 'blocked', 'completed', 'dropped', 'dueSoon', 'next', 'overdue'];
    for (const v of values) {
      expect(TaskStatusValueSchema.safeParse(v).success).toBe(true);
    }
  });

  it('should reject invalid status values', () => {
    expect(TaskStatusValueSchema.safeParse('Active').success).toBe(false);
    expect(TaskStatusValueSchema.safeParse('pending').success).toBe(false);
    expect(TaskStatusValueSchema.safeParse('').success).toBe(false);
    expect(TaskStatusValueSchema.safeParse(123).success).toBe(false);
  });
});

describe('SearchTaskResultSchema', () => {
  it('should accept valid task result with all fields', () => {
    const valid = {
      id: 'task-123',
      name: 'Buy groceries',
      status: 'available',
      projectName: 'Personal',
      flagged: false
    };
    const result = SearchTaskResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('task-123');
      expect(result.data.name).toBe('Buy groceries');
      expect(result.data.status).toBe('available');
      expect(result.data.projectName).toBe('Personal');
      expect(result.data.flagged).toBe(false);
    }
  });

  it('should accept task result with null projectName', () => {
    const valid = {
      id: 'task-456',
      name: 'Orphaned task',
      status: 'blocked',
      projectName: null,
      flagged: true
    };
    const result = SearchTaskResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBeNull();
    }
  });

  it('should accept task result with "Inbox" projectName', () => {
    const valid = {
      id: 'task-789',
      name: 'Inbox item',
      status: 'available',
      projectName: 'Inbox',
      flagged: false
    };
    const result = SearchTaskResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectName).toBe('Inbox');
    }
  });

  it('should reject missing required fields', () => {
    expect(SearchTaskResultSchema.safeParse({}).success).toBe(false);
    expect(
      SearchTaskResultSchema.safeParse({ id: 'x', name: 'y', status: 'available' }).success
    ).toBe(false);
  });

  it('should reject invalid status value', () => {
    const invalid = {
      id: 'task-1',
      name: 'Test',
      status: 'Active',
      projectName: null,
      flagged: false
    };
    expect(SearchTaskResultSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ProjectStatusValueSchema', () => {
  it('should accept all 4 project status values', () => {
    const values = ['active', 'done', 'dropped', 'onHold'];
    for (const v of values) {
      expect(ProjectStatusValueSchema.safeParse(v).success).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(ProjectStatusValueSchema.safeParse('completed').success).toBe(false);
    expect(ProjectStatusValueSchema.safeParse('Active').success).toBe(false);
  });
});

describe('SearchProjectResultSchema', () => {
  it('should accept valid project result', () => {
    const valid = {
      id: 'proj-1',
      name: 'Website Redesign',
      status: 'active',
      folderName: 'Work'
    };
    const result = SearchProjectResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.folderName).toBe('Work');
    }
  });

  it('should accept project result with null folderName', () => {
    const valid = {
      id: 'proj-2',
      name: 'Root Project',
      status: 'done',
      folderName: null
    };
    const result = SearchProjectResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.folderName).toBeNull();
    }
  });

  it('should reject missing fields', () => {
    expect(SearchProjectResultSchema.safeParse({ id: 'x' }).success).toBe(false);
  });
});

describe('SearchFolderResultSchema', () => {
  it('should accept valid folder result', () => {
    const valid = {
      id: 'folder-1',
      name: 'Work',
      parentFolderName: 'Top Level'
    };
    const result = SearchFolderResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentFolderName).toBe('Top Level');
    }
  });

  it('should accept folder result with null parentFolderName', () => {
    const valid = {
      id: 'folder-2',
      name: 'Root Folder',
      parentFolderName: null
    };
    const result = SearchFolderResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentFolderName).toBeNull();
    }
  });

  it('should not have a status field', () => {
    const valid = {
      id: 'folder-3',
      name: 'Test',
      parentFolderName: null
    };
    const result = SearchFolderResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('status' in result.data).toBe(false);
    }
  });
});

describe('TagStatusValueSchema', () => {
  it('should accept all 3 tag status values', () => {
    const values = ['active', 'onHold', 'dropped'];
    for (const v of values) {
      expect(TagStatusValueSchema.safeParse(v).success).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(TagStatusValueSchema.safeParse('completed').success).toBe(false);
    expect(TagStatusValueSchema.safeParse('Active').success).toBe(false);
  });
});

describe('SearchTagResultSchema', () => {
  it('should accept valid tag result', () => {
    const valid = {
      id: 'tag-1',
      name: 'urgent',
      status: 'active',
      parentTagName: 'Priority'
    };
    const result = SearchTagResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentTagName).toBe('Priority');
    }
  });

  it('should accept tag result with null parentTagName', () => {
    const valid = {
      id: 'tag-2',
      name: 'Root Tag',
      status: 'onHold',
      parentTagName: null
    };
    const result = SearchTagResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentTagName).toBeNull();
    }
  });

  it('should reject invalid tag status', () => {
    const invalid = {
      id: 'tag-3',
      name: 'Test',
      status: 'completed',
      parentTagName: null
    };
    expect(SearchTagResultSchema.safeParse(invalid).success).toBe(false);
  });
});
