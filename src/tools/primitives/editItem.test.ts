import { describe, it, expect } from 'vitest';
import { generateAppleScript, EditItemParams } from './editItem.js';

describe('editItem generateAppleScript', () => {
  describe('item lookup', () => {
    it('searches flattened tasks by ID for task type', () => {
      const script = generateAppleScript({ id: 'abc123', itemType: 'task' });
      expect(script).toContain('(id of aTask as string) = "abc123"');
      expect(script).toContain('flattened tasks');
    });

    it('searches flattened projects by ID for project type', () => {
      const script = generateAppleScript({ id: 'proj1', itemType: 'project' });
      expect(script).toContain('(id of aProject as string) = "proj1"');
      expect(script).toContain('flattened projects');
    });

    it('searches by name when no ID provided', () => {
      const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
      expect(script).toContain('(name of aTask) = "My Task"');
    });

    it('falls back to name search when both ID and name provided', () => {
      const script = generateAppleScript({ id: 'abc', name: 'Fallback', itemType: 'task' });
      // Should have both ID and name search blocks
      expect(script).toContain('"abc"');
      expect(script).toContain('"Fallback"');
      expect(script).toContain('If ID search failed');
    });

    it('returns error script when neither ID nor name provided', () => {
      const script = generateAppleScript({ itemType: 'task' });
      expect(script).toContain('Either id or name must be provided');
    });

    it('searches inbox tasks as fallback for tasks', () => {
      const script = generateAppleScript({ id: 'abc', itemType: 'task' });
      expect(script).toContain('inbox tasks');
    });
  });

  describe('name changes', () => {
    it('sets new name on found item', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newName: 'Updated Name' });
      expect(script).toContain('set name of foundItem to "Updated Name"');
    });

    it('escapes quotes in new name', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newName: 'Name "with" quotes' });
      expect(script).toContain('set name of foundItem to "Name \\"with\\" quotes"');
    });
  });

  describe('note changes', () => {
    it('sets new note', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newNote: 'New note' });
      expect(script).toContain('set note of foundItem to "New note"');
    });
  });

  describe('status changes (task)', () => {
    it('marks task as completed', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newStatus: 'completed' });
      expect(script).toContain('mark complete foundItem');
    });

    it('marks task as dropped', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newStatus: 'dropped' });
      expect(script).toContain('set dropped of foundItem to true');
    });

    it('marks task as incomplete (clears both completed and dropped)', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newStatus: 'incomplete' });
      expect(script).toContain('set completed of foundItem to false');
      expect(script).toContain('set dropped of foundItem to false');
    });
  });

  describe('date changes', () => {
    it('generates pre-script for due date', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newDueDate: '2024-06-01T00:00:00' });
      expect(script).toContain('copy current date to');
      expect(script).toContain('set due date of foundItem to');
    });

    it('generates pre-script for defer date', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newDeferDate: '2024-07-01T00:00:00' });
      expect(script).toContain('set defer date of foundItem to');
    });

    it('generates pre-script for planned date', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newPlannedDate: '2024-08-01T00:00:00' });
      expect(script).toContain('set planned date of foundItem to');
    });

    it('clears due date with empty string', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newDueDate: '' });
      expect(script).toContain('set due date of foundItem to missing value');
    });

    it('clears defer date with empty string', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newDeferDate: '' });
      expect(script).toContain('set defer date of foundItem to missing value');
    });
  });

  describe('flagged changes', () => {
    it('sets flagged to true', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newFlagged: true });
      expect(script).toContain('set flagged of foundItem to true');
    });

    it('sets flagged to false', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newFlagged: false });
      expect(script).toContain('set flagged of foundItem to false');
    });
  });

  describe('estimated minutes', () => {
    it('sets estimated minutes', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newEstimatedMinutes: 45 });
      expect(script).toContain('set estimated minutes of foundItem to 45');
    });
  });

  describe('tag operations', () => {
    it('adds tags', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', addTags: ['Work', 'Home'] });
      expect(script).toContain('"Work"');
      expect(script).toContain('"Home"');
      expect(script).toContain('Add tags');
    });

    it('removes tags', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', removeTags: ['Old'] });
      expect(script).toContain('"Old"');
      expect(script).toContain('Remove tags');
    });

    it('replaces tags', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', replaceTags: ['New1', 'New2'] });
      expect(script).toContain('"New1"');
      expect(script).toContain('"New2"');
      expect(script).toContain('Replace all tags');
    });

    it('escapes quotes in tag names', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', addTags: ['Tag "A"'] });
      expect(script).toContain('Tag \\"A\\"');
    });
  });

  describe('project-specific', () => {
    it('sets sequential to true', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newSequential: true });
      expect(script).toContain('set sequential of foundItem to true');
    });

    it('sets project status to active', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newProjectStatus: 'active' });
      expect(script).toContain('set status of foundItem to active status');
    });

    it('sets project status to completed (done)', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newProjectStatus: 'completed' });
      expect(script).toContain('set status of foundItem to done status');
    });

    it('sets project status to dropped', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newProjectStatus: 'dropped' });
      expect(script).toContain('set status of foundItem to dropped status');
    });

    it('sets project status to onHold', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newProjectStatus: 'onHold' });
      expect(script).toContain('set status of foundItem to on hold status');
    });

    it('moves project to new folder', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newFolderName: 'Archive' });
      expect(script).toContain('first flattened folder where name = "Archive"');
      expect(script).toContain('move foundItem to destFolder');
    });

    it('escapes quotes in folder name', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'project', newFolderName: 'Folder "B"' });
      expect(script).toContain('Folder \\"B\\"');
    });
  });

  describe('special character escaping in identifiers', () => {
    it('escapes quotes in ID', () => {
      const script = generateAppleScript({ id: 'id"with"quotes', itemType: 'task' });
      expect(script).toContain('id\\"with\\"quotes');
    });

    it('escapes quotes in name', () => {
      const script = generateAppleScript({ name: 'Name "A"', itemType: 'task' });
      expect(script).toContain('Name \\"A\\"');
    });
  });

  describe('return structure', () => {
    it('returns JSON with success, id, name, and changedProperties', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task', newName: 'New' });
      // AppleScript builds JSON via string concatenation with escaped quotes
      expect(script).toContain('success');
      expect(script).toContain('itemId');
      expect(script).toContain('itemName');
      expect(script).toContain('changedProperties');
      expect(script).toContain('return');
    });

    it('returns item-not-found error when item missing', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task' });
      expect(script).toContain('Item not found');
    });
  });
});
