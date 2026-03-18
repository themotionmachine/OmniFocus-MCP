import { describe, it, expect } from 'vitest';
import { generateAppleScript, AddProjectParams } from './addProject.js';

function makeParams(overrides: Partial<AddProjectParams> = {}): AddProjectParams {
  return { name: 'Test Project', ...overrides };
}

describe('addProject generateAppleScript', () => {
  describe('folder handling', () => {
    it('creates project at root when no folder specified', () => {
      const script = generateAppleScript(makeParams());
      expect(script).toContain('make new project with properties {name:"Test Project"}');
      expect(script).not.toContain('theFolder');
    });

    it('generates simple folder lookup for single name', () => {
      const script = generateAppleScript(makeParams({ folderName: 'Work' }));
      expect(script).toContain('first flattened folder where name = "Work"');
      expect(script).toContain('at end of projects of theFolder');
    });

    it('generates ancestor chain walk for nested path', () => {
      const script = generateAppleScript(makeParams({ folderName: 'Work/Engineering' }));
      expect(script).toContain('pathComponents');
      expect(script).toContain('"Work"');
      expect(script).toContain('"Engineering"');
      expect(script).toContain('ancestorOk');
      expect(script).toContain('at end of projects of theFolder');
    });

    it('includes error return when folder not found', () => {
      const script = generateAppleScript(makeParams({ folderName: 'Missing' }));
      expect(script).toContain('Folder not found');
      expect(script).toContain('Missing');
    });
  });

  describe('special characters', () => {
    it('escapes quotes in project name', () => {
      const script = generateAppleScript(makeParams({ name: 'My "Project"' }));
      expect(script).toContain('My \\"Project\\"');
    });

    it('escapes quotes in note', () => {
      const script = generateAppleScript(makeParams({ note: 'A "quoted" note' }));
      expect(script).toContain('set note of newProject to "A \\"quoted\\" note"');
    });

    it('escapes backslashes in project name', () => {
      const script = generateAppleScript(makeParams({ name: 'Back\\slash' }));
      expect(script).toContain('Back\\\\slash');
    });
  });

  describe('tags', () => {
    it('generates tag lookup and creation for tags', () => {
      const script = generateAppleScript(makeParams({ tags: ['urgent', 'work'] }));
      expect(script).toContain('"urgent"');
      expect(script).toContain('"work"');
      expect(script).toContain('first flattened tag where name =');
      expect(script).toContain('add theTag to tags of newProject');
    });

    it('generates no tag block when tags empty', () => {
      const script = generateAppleScript(makeParams({ tags: [] }));
      expect(script).not.toContain('flattened tag');
    });
  });

  describe('sequential flag', () => {
    it('sets sequential to true', () => {
      const script = generateAppleScript(makeParams({ sequential: true }));
      expect(script).toContain('set sequential of newProject to true');
    });

    it('sets sequential to false by default', () => {
      const script = generateAppleScript(makeParams());
      expect(script).toContain('set sequential of newProject to false');
    });
  });

  describe('dates', () => {
    it('generates due date pre-script and assignment', () => {
      const script = generateAppleScript(makeParams({ dueDate: '2026-03-20' }));
      expect(script).toContain('copy current date to');
      expect(script).toContain('set due date of newProject to');
    });

    it('generates defer date pre-script and assignment', () => {
      const script = generateAppleScript(makeParams({ deferDate: '2026-03-15' }));
      expect(script).toContain('set defer date of newProject to');
    });
  });

  describe('other properties', () => {
    it('sets flagged when true', () => {
      const script = generateAppleScript(makeParams({ flagged: true }));
      expect(script).toContain('set flagged of newProject to true');
    });

    it('does not set flagged when false', () => {
      const script = generateAppleScript(makeParams({ flagged: false }));
      expect(script).not.toContain('set flagged of newProject to true');
    });

    it('sets estimated minutes', () => {
      const script = generateAppleScript(makeParams({ estimatedMinutes: 45 }));
      expect(script).toContain('set estimated minutes of newProject to 45');
    });

    it('returns success JSON with project ID', () => {
      const script = generateAppleScript(makeParams());
      expect(script).toContain('success');
      expect(script).toContain('projectId');
    });
  });
});
