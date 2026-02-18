import { describe, it, expect } from 'vitest';
import { generateAppleScript, RemoveItemParams } from './removeItem.js';

describe('removeItem generateAppleScript', () => {
  describe('task removal', () => {
    it('removes task by ID', () => {
      const script = generateAppleScript({ id: 'task123', itemType: 'task' });
      expect(script).toContain('first flattened task where id = "task123"');
      expect(script).toContain('delete foundItem');
    });

    it('removes task by name', () => {
      const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
      expect(script).toContain('first flattened task where name = "My Task"');
      expect(script).toContain('delete foundItem');
    });

    it('falls back to name when both ID and name provided', () => {
      const script = generateAppleScript({ id: 'abc', name: 'Fallback', itemType: 'task' });
      expect(script).toContain('first flattened task where id = "abc"');
      expect(script).toContain('first flattened task where name = "Fallback"');
    });

    it('searches inbox tasks for ID-based lookup', () => {
      const script = generateAppleScript({ id: 'abc', itemType: 'task' });
      expect(script).toContain('first inbox task where id = "abc"');
    });

    it('searches inbox tasks for name-based lookup', () => {
      const script = generateAppleScript({ name: 'My Task', itemType: 'task' });
      expect(script).toContain('first inbox task where name = "My Task"');
    });
  });

  describe('project removal', () => {
    it('removes project by ID', () => {
      const script = generateAppleScript({ id: 'proj1', itemType: 'project' });
      expect(script).toContain('first flattened project where id = "proj1"');
      expect(script).toContain('delete foundItem');
    });

    it('removes project by name', () => {
      const script = generateAppleScript({ name: 'Old Project', itemType: 'project' });
      expect(script).toContain('first flattened project where name = "Old Project"');
      expect(script).toContain('delete foundItem');
    });

    it('falls back to name for project when both provided', () => {
      const script = generateAppleScript({ id: 'p1', name: 'Fallback', itemType: 'project' });
      expect(script).toContain('first flattened project where id = "p1"');
      expect(script).toContain('first flattened project where name = "Fallback"');
    });
  });

  describe('error cases', () => {
    it('returns error when neither ID nor name provided', () => {
      const script = generateAppleScript({ itemType: 'task' });
      expect(script).toContain('Either id or name must be provided');
    });

    it('includes not-found handling in script', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task' });
      expect(script).toContain('Item not found');
    });
  });

  describe('special character escaping', () => {
    it('escapes quotes in ID', () => {
      const script = generateAppleScript({ id: 'id"test', itemType: 'task' });
      expect(script).toContain('id\\"test');
    });

    it('escapes quotes in name', () => {
      const script = generateAppleScript({ name: 'Task "X"', itemType: 'task' });
      expect(script).toContain('Task \\"X\\"');
    });

    it('escapes backslashes in name', () => {
      const script = generateAppleScript({ name: 'Path\\Task', itemType: 'task' });
      expect(script).toContain('Path\\\\Task');
    });
  });

  describe('return structure', () => {
    it('returns JSON with success, id, and name', () => {
      const script = generateAppleScript({ id: 'x', itemType: 'task' });
      // AppleScript builds JSON via string concatenation with escaped quotes
      expect(script).toContain('success');
      expect(script).toContain('itemId');
      expect(script).toContain('itemName');
      expect(script).toContain('return');
    });
  });
});
