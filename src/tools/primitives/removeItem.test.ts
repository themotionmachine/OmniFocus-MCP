import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './removeItem.js';

describe('removeItem generateAppleScript', () => {
  it('generates task removal by name', () => {
    const script = generateAppleScript({
      name: 'Old Task',
      itemType: 'task',
    });
    expect(script).toContain('first flattened task whose name is "Old Task"');
    expect(script).toContain('delete');
  });

  it('generates task removal by id', () => {
    const script = generateAppleScript({
      id: 'abc123',
      itemType: 'task',
    });
    expect(script).toContain('first flattened task whose id is "abc123"');
    expect(script).toContain('delete');
  });

  it('generates project removal by name', () => {
    const script = generateAppleScript({
      name: 'Old Project',
      itemType: 'project',
    });
    expect(script).toContain('first flattened project whose name is "Old Project"');
  });

  it('returns error when neither id nor name provided', () => {
    const script = generateAppleScript({
      itemType: 'task',
    });
    expect(script).toContain('Either id or name must be provided');
  });
});
