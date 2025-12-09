import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

import { queryOmnifocusDebug } from '../../../src/tools/primitives/queryOmnifocusDebug.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('queryOmnifocusDebug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('task entity', () => {
    it('should return task properties', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        entityType: 'task',
        itemName: 'Test Task',
        allProperties: {
          id: { type: 'object', keys: ['primaryKey'] },
          name: { type: 'string', value: 'Test Task' },
          note: { type: 'string', value: '' },
          flagged: { type: 'boolean', value: false },
          dueDate: { type: 'Date', value: '2024-12-25T17:00:00Z' }
        },
        expectedProperties: {
          id: { exists: true, type: 'OFObject', id: 'task-123' },
          name: { exists: true, type: 'string', value: 'Test Task' },
          taskStatus: { exists: true, type: 'number', value: 0 }
        }
      });

      const result = await queryOmnifocusDebug('task');

      expect(result).toHaveProperty('entityType', 'task');
      expect(result).toHaveProperty('allProperties');
      expect(result).toHaveProperty('expectedProperties');
    });
  });

  describe('project entity', () => {
    it('should return project properties', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        entityType: 'project',
        itemName: 'Test Project',
        allProperties: {
          id: { type: 'object', keys: ['primaryKey'] },
          name: { type: 'string', value: 'Test Project' },
          status: { type: 'number', value: 0 },
          tasks: { type: 'Array', length: 5, sample: {} }
        },
        expectedProperties: {
          id: { exists: true, type: 'OFObject', id: 'project-123' },
          name: { exists: true, type: 'string', value: 'Test Project' },
          status: { exists: true, type: 'number', value: 0 }
        }
      });

      const result = await queryOmnifocusDebug('project');

      expect(result).toHaveProperty('entityType', 'project');
    });
  });

  describe('folder entity', () => {
    it('should return folder properties', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        entityType: 'folder',
        itemName: 'Test Folder',
        allProperties: {
          id: { type: 'object', keys: ['primaryKey'] },
          name: { type: 'string', value: 'Test Folder' },
          projects: { type: 'Array', length: 3, sample: {} }
        },
        expectedProperties: {
          id: { exists: true, type: 'OFObject', id: 'folder-123' },
          name: { exists: true, type: 'string', value: 'Test Folder' }
        }
      });

      const result = await queryOmnifocusDebug('folder');

      expect(result).toHaveProperty('entityType', 'folder');
    });
  });

  describe('error handling', () => {
    it('should handle no items found', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'No items found'
      });

      const result = await queryOmnifocusDebug('task');

      expect(result).toHaveProperty('error', 'No items found');
    });

    it('should handle script errors', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Script execution error'
      });

      const result = await queryOmnifocusDebug('task');

      expect(result).toHaveProperty('error');
    });
  });

  describe('property type detection', () => {
    it('should detect various property types', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        entityType: 'task',
        itemName: 'Type Test',
        allProperties: {
          stringProp: { type: 'string', value: 'test' },
          numberProp: { type: 'number', value: 42 },
          booleanProp: { type: 'boolean', value: true },
          nullProp: { type: 'null', value: null },
          undefinedProp: { type: 'undefined', value: undefined },
          dateProp: { type: 'Date', value: '2024-12-25T00:00:00Z' },
          arrayProp: { type: 'Array', length: 3, sample: 'item' },
          objectProp: { type: 'object', keys: ['key1', 'key2'] },
          functionProp: { type: 'function', value: '[Function]' },
          ofObjectProp: { type: 'OFObject', id: 'obj-123', name: 'Named Object' }
        },
        expectedProperties: {}
      });

      const result = await queryOmnifocusDebug('task');

      expect(result).toHaveProperty('allProperties');
      const props = (result as { allProperties: Record<string, unknown> }).allProperties;
      expect(props.stringProp).toHaveProperty('type', 'string');
      expect(props.numberProp).toHaveProperty('type', 'number');
      expect(props.booleanProp).toHaveProperty('type', 'boolean');
      expect(props.nullProp).toHaveProperty('type', 'null');
      expect(props.dateProp).toHaveProperty('type', 'Date');
      expect(props.arrayProp).toHaveProperty('type', 'Array');
    });
  });
});
