import { describe, it, expect } from 'vitest';
import { generateAppleScript, EditItemParams } from './editItem.js';

function makeParams(overrides: Partial<EditItemParams>): EditItemParams {
  return { itemType: 'task', name: 'Test Task', ...overrides };
}

describe('editItem generateAppleScript', () => {
  describe('newProjectName — move task between projects', () => {
    it('generates move to a named project', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'Marketing',
      }));
      expect(script).toContain('move foundItem to end of tasks of destProject');
      expect(script).toContain('first flattened project whose name is "Marketing"');
      expect(script).toContain('project (moved to Marketing)');
    });

    it('generates move to inbox when newProjectName is empty string', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: '',
      }));
      expect(script).toContain('set assigned container of foundItem to missing value');
      expect(script).toContain('project (moved to inbox)');
      expect(script).not.toContain('move foundItem to end of tasks of destProject');
    });

    it('generates move to inbox when newProjectName is "inbox"', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'inbox',
      }));
      expect(script).toContain('set assigned container of foundItem to missing value');
      expect(script).toContain('project (moved to inbox)');
    });

    it('generates move to inbox case-insensitively', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'Inbox',
      }));
      expect(script).toContain('set assigned container of foundItem to missing value');
    });

    it('escapes special characters in project name', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'My "Project"',
      }));
      expect(script).toContain('My \\"Project\\"');
    });

    it('generates folder-qualified project lookup for path', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'Work/Community Outreach',
      }));
      expect(script).toContain('move foundItem to end of tasks of destProject');
      expect(script).toContain('"Community Outreach"');
      expect(script).toContain('folderPath');
      expect(script).toContain('"Work"');
      expect(script).toContain('container of aProject');
    });

    it('generates nested folder-qualified project lookup', () => {
      const script = generateAppleScript(makeParams({
        newProjectName: 'Personal/Committees/Community Outreach',
      }));
      expect(script).toContain('"Personal"');
      expect(script).toContain('"Committees"');
      expect(script).toContain('"Community Outreach"');
      expect(script).toContain('folderPath');
    });

    it('does not generate project move for project itemType', () => {
      const script = generateAppleScript({
        itemType: 'project',
        name: 'Test Project',
        newProjectName: 'Other',
      });
      // newProjectName is task-specific, should not appear for projects
      expect(script).not.toContain('move foundItem to end of tasks of destProject');
    });
  });

  describe('newStatus — task status changes', () => {
    it('uses mark dropped for dropped status', () => {
      const script = generateAppleScript(makeParams({
        newStatus: 'dropped',
      }));
      expect(script).toContain('mark dropped foundItem');
      expect(script).not.toContain('set dropped of foundItem to true');
    });

    it('uses mark incomplete for incomplete status', () => {
      const script = generateAppleScript(makeParams({
        newStatus: 'incomplete',
      }));
      expect(script).toContain('mark incomplete foundItem');
      expect(script).not.toContain('set completed of foundItem to false');
      expect(script).not.toContain('set dropped of foundItem to false');
    });

    it('uses mark complete for completed status', () => {
      const script = generateAppleScript(makeParams({
        newStatus: 'completed',
      }));
      expect(script).toContain('mark complete foundItem');
    });

    it('generates skip logic for repeating tasks', () => {
      const script = generateAppleScript(makeParams({
        newStatus: 'skipped',
      }));
      // Should check for repetition rule first
      expect(script).toContain('repetition rule of foundItem is missing value');
      // Should error on non-repeating tasks
      expect(script).toContain('Cannot skip a non-repeating task');
      // Should complete the task to fire the next repeat
      expect(script).toContain('mark complete foundItem');
      // Should drop the completed instance
      expect(script).toContain('set dropped of');
    });
  });

  describe('newFolderName — project folder move with paths', () => {
    it('generates folder path lookup for nested path', () => {
      const script = generateAppleScript({
        itemType: 'project',
        name: 'Test Project',
        newFolderName: 'Work/Engineering',
      });
      expect(script).toContain('pathComponents');
      expect(script).toContain('"Work"');
      expect(script).toContain('"Engineering"');
      expect(script).toContain('move {foundItem} to end of projects of destFolder');
    });

    it('generates simple folder lookup for single name', () => {
      const script = generateAppleScript({
        itemType: 'project',
        name: 'Test Project',
        newFolderName: 'Work',
      });
      expect(script).toContain('first flattened folder where name = "Work"');
      expect(script).toContain('move {foundItem} to end of projects of destFolder');
    });
  });

  describe('tag operations', () => {
    it('generates tag add script', () => {
      const script = generateAppleScript(makeParams({
        addTags: ['urgent', 'review'],
      }));
      expect(script).toContain('"urgent"');
      expect(script).toContain('"review"');
      expect(script).toContain('add tagObj to tags of foundItem');
    });

    it('generates tag remove script', () => {
      const script = generateAppleScript(makeParams({
        removeTags: ['old-tag'],
      }));
      expect(script).toContain('"old-tag"');
      expect(script).toContain('remove tagObj from tags of foundItem');
    });

    it('generates tag replace script', () => {
      const script = generateAppleScript(makeParams({
        replaceTags: ['new-tag'],
      }));
      expect(script).toContain('"new-tag"');
      expect(script).toContain('remove existingTag from tags of foundItem');
      expect(script).toContain('add tagObj to tags of foundItem');
    });
  });

  describe('item lookup', () => {
    it('returns error when neither id nor name provided', () => {
      const script = generateAppleScript({
        itemType: 'task',
      });
      expect(script).toContain('success');
      expect(script).toContain('false');
      expect(script).toContain('Either id or name must be provided');
    });

    it('searches by id when provided', () => {
      const script = generateAppleScript(makeParams({
        id: 'abc123',
      }));
      expect(script).toContain('first flattened task whose id is "abc123"');
    });

    it('searches by name when no id', () => {
      const script = generateAppleScript(makeParams({
        name: 'My Task',
      }));
      expect(script).toContain('first flattened task whose name is "My Task"');
    });

    it('uses whose clause for direct references', () => {
      const script = generateAppleScript(makeParams({
        id: 'test123',
      }));
      expect(script).toContain('first flattened task whose id is');
      expect(script).not.toContain('repeat with aTask');
    });
  });

  describe('common properties', () => {
    it('generates name update', () => {
      const script = generateAppleScript(makeParams({
        newName: 'Updated Name',
      }));
      expect(script).toContain('set name of foundItem to "Updated Name"');
    });

    it('generates note update', () => {
      const script = generateAppleScript(makeParams({
        newNote: 'A note',
      }));
      expect(script).toContain('set note of foundItem to "A note"');
    });

    it('generates flagged update', () => {
      const script = generateAppleScript(makeParams({
        newFlagged: true,
      }));
      expect(script).toContain('set flagged of foundItem to true');
    });

    it('generates estimated minutes update', () => {
      const script = generateAppleScript(makeParams({
        newEstimatedMinutes: 30,
      }));
      expect(script).toContain('set estimated minutes of foundItem to 30');
    });
  });

  describe('project-specific fields', () => {
    it('generates sequential update', () => {
      const script = generateAppleScript({
        itemType: 'project',
        name: 'P',
        newSequential: true,
      });
      expect(script).toContain('set sequential of foundItem to true');
    });

    it('generates project status update', () => {
      const script = generateAppleScript({
        itemType: 'project',
        name: 'P',
        newProjectStatus: 'onHold',
      });
      expect(script).toContain('set status of foundItem to on hold status');
    });
  });
});
