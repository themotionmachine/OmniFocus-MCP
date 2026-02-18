import { describe, it, expect } from 'vitest';
import { createDateOutsideTellBlock, generateDateAssignmentV2 } from './dateFormatting.js';

describe('createDateOutsideTellBlock', () => {
  it('generates correct AppleScript for a valid ISO date', () => {
    const result = createDateOutsideTellBlock('2024-03-15T10:30:00', 'myDate');

    expect(result).toContain('copy current date to myDate');
    expect(result).toContain('set year of myDate to 2024');
    expect(result).toContain('set month of myDate to 3');
    expect(result).toContain('set day of myDate to 15');
    expect(result).toContain('set hours of myDate to');
    expect(result).toContain('set minutes of myDate to');
    expect(result).toContain('set seconds of myDate to');
  });

  it('preserves time components', () => {
    // Use a fixed UTC date and check the local interpretation
    const date = new Date('2024-06-01T14:45:30');
    const result = createDateOutsideTellBlock(date.toISOString(), 'dt');

    expect(result).toContain(`set hours of dt to ${date.getHours()}`);
    expect(result).toContain(`set minutes of dt to ${date.getMinutes()}`);
    expect(result).toContain(`set seconds of dt to ${date.getSeconds()}`);
  });

  it('throws Error for invalid date string', () => {
    expect(() => createDateOutsideTellBlock('not-a-date', 'v')).toThrow('Invalid date string');
  });

  it('throws Error for empty string', () => {
    expect(() => createDateOutsideTellBlock('', 'v')).toThrow('Invalid date string');
  });

  it('uses the provided variable name', () => {
    const result = createDateOutsideTellBlock('2024-01-01T00:00:00', 'customVar');
    expect(result).toContain('copy current date to customVar');
    expect(result).toContain('set year of customVar to 2024');
  });
});

describe('generateDateAssignmentV2', () => {
  it('returns null when date is undefined (no change requested)', () => {
    const result = generateDateAssignmentV2('foundItem', 'due date', undefined);
    expect(result).toBeNull();
  });

  it('returns clearing assignment for empty string', () => {
    const result = generateDateAssignmentV2('foundItem', 'due date', '');
    expect(result).not.toBeNull();
    expect(result!.preScript).toBe('');
    expect(result!.assignmentScript).toBe('set due date of foundItem to missing value');
  });

  it('returns date construction and assignment for valid ISO date', () => {
    const result = generateDateAssignmentV2('foundItem', 'defer date', '2024-03-15T10:00:00');
    expect(result).not.toBeNull();
    expect(result!.preScript).toContain('copy current date to');
    expect(result!.preScript).toContain('set year of');
    expect(result!.assignmentScript).toContain('set defer date of foundItem to');
  });

  it('uses the correct object name and property name', () => {
    const result = generateDateAssignmentV2('myTask', 'planned date', '2024-06-01T00:00:00');
    expect(result).not.toBeNull();
    expect(result!.assignmentScript).toContain('set planned date of myTask to');
  });

  it('generates unique variable names', () => {
    const result1 = generateDateAssignmentV2('obj', 'due date', '2024-01-01T00:00:00');
    const result2 = generateDateAssignmentV2('obj', 'due date', '2024-01-01T00:00:00');
    // Variable names contain random suffix so they should differ
    expect(result1!.assignmentScript).not.toBe(result2!.assignmentScript);
  });
});
