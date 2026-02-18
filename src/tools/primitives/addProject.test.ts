import { describe, it, expect } from 'vitest';
import { generateAppleScript, AddProjectParams } from './addProject.js';

describe('addProject generateAppleScript', () => {
  it('generates script for basic project at root', () => {
    const script = generateAppleScript({ name: 'New Project' });
    expect(script).toContain('make new project with properties {name:"New Project"}');
  });

  it('places project in specified folder', () => {
    const script = generateAppleScript({ name: 'Proj', folderName: 'Work' });
    expect(script).toContain('first flattened folder where name = "Work"');
    expect(script).toContain('at end of projects of theFolder');
  });

  it('generates date construction for dueDate', () => {
    const script = generateAppleScript({ name: 'Proj', dueDate: '2024-06-01T00:00:00' });
    expect(script).toContain('copy current date to');
    expect(script).toContain('set due date of newProject to');
  });

  it('generates date construction for deferDate', () => {
    const script = generateAppleScript({ name: 'Proj', deferDate: '2024-07-01T00:00:00' });
    expect(script).toContain('set defer date of newProject to');
  });

  it('sets flagged to true', () => {
    const script = generateAppleScript({ name: 'Proj', flagged: true });
    expect(script).toContain('set flagged of newProject to true');
  });

  it('sets estimated minutes', () => {
    const script = generateAppleScript({ name: 'Proj', estimatedMinutes: 120 });
    expect(script).toContain('set estimated minutes of newProject to 120');
  });

  it('sets sequential to true', () => {
    const script = generateAppleScript({ name: 'Proj', sequential: true });
    expect(script).toContain('set sequential of newProject to true');
  });

  it('sets sequential to false by default', () => {
    const script = generateAppleScript({ name: 'Proj' });
    expect(script).toContain('set sequential of newProject to false');
  });

  it('adds tags', () => {
    const script = generateAppleScript({ name: 'Proj', tags: ['Important'] });
    expect(script).toContain('first flattened tag where name = "Important"');
    expect(script).toContain('add theTag to tags of newProject');
  });

  it('sets note', () => {
    const script = generateAppleScript({ name: 'Proj', note: 'Project notes' });
    expect(script).toContain('set note of newProject to "Project notes"');
  });

  it('escapes quotes in project name', () => {
    const script = generateAppleScript({ name: 'Project "Alpha"' });
    expect(script).toContain('Project \\"Alpha\\"');
  });

  it('escapes backslashes in project name', () => {
    const script = generateAppleScript({ name: 'Path\\Project' });
    expect(script).toContain('Path\\\\Project');
  });

  it('escapes quotes in folder name', () => {
    const script = generateAppleScript({ name: 'Proj', folderName: 'Folder "A"' });
    expect(script).toContain('Folder \\"A\\"');
  });

  it('escapes quotes in note', () => {
    const script = generateAppleScript({ name: 'Proj', note: 'Note with "quotes"' });
    expect(script).toContain('Note with \\"quotes\\"');
  });

  it('returns JSON success structure', () => {
    const script = generateAppleScript({ name: 'Test' });
    expect(script).toContain('success');
    expect(script).toContain('projectId');
    expect(script).toContain('return');
  });

  it('handles folder-not-found error in script', () => {
    const script = generateAppleScript({ name: 'Proj', folderName: 'Missing' });
    expect(script).toContain('Folder not found: Missing');
  });
});
