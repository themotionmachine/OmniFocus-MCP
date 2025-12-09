import { describe, expect, it } from 'vitest';
import {
  createDateOutsideTellBlock,
  generateDateAssignmentV2
} from '../../src/utils/dateFormatting.js';

describe('dateFormatting utilities', () => {
  describe('createDateOutsideTellBlock', () => {
    it('should generate AppleScript date construction code', () => {
      const result = createDateOutsideTellBlock('2024-01-15T10:30:00', 'testDate');

      expect(result).toContain('copy current date to testDate');
      expect(result).toContain('set year of testDate to 2024');
      expect(result).toContain('set month of testDate to 1');
      expect(result).toContain('set day of testDate to 15');
      expect(result).toContain('set hours of testDate to 10');
      expect(result).toContain('set minutes of testDate to 30');
      expect(result).toContain('set seconds of testDate to 0');
    });

    it('should throw error for invalid date string', () => {
      expect(() => createDateOutsideTellBlock('invalid-date', 'testDate')).toThrow(
        'Invalid date string: invalid-date'
      );
    });

    it('should handle midnight correctly', () => {
      const result = createDateOutsideTellBlock('2024-06-01T00:00:00', 'myDate');

      expect(result).toContain('set year of myDate to 2024');
      expect(result).toContain('set month of myDate to 6');
      expect(result).toContain('set day of myDate to 1');
      expect(result).toContain('set hours of myDate to 0');
      expect(result).toContain('set minutes of myDate to 0');
    });
  });

  describe('generateDateAssignmentV2', () => {
    it('should return null for undefined date', () => {
      const result = generateDateAssignmentV2('myTask', 'dueDate', undefined);
      expect(result).toBeNull();
    });

    it('should return missing value assignment for empty string', () => {
      const result = generateDateAssignmentV2('myTask', 'dueDate', '');

      expect(result).not.toBeNull();
      expect(result?.preScript).toBe('');
      expect(result?.assignmentScript).toBe('set dueDate of myTask to missing value');
    });

    it('should generate both preScript and assignmentScript for valid date', () => {
      const result = generateDateAssignmentV2('theTask', 'deferDate', '2024-03-20T14:00:00');

      expect(result).not.toBeNull();
      expect(result?.preScript).toContain('copy current date to');
      expect(result?.preScript).toContain('set year of');
      expect(result?.preScript).toContain('2024');
      expect(result?.assignmentScript).toContain('set deferDate of theTask to');
    });

    it('should generate unique variable names for each call', () => {
      const result1 = generateDateAssignmentV2('task1', 'dueDate', '2024-01-01');
      const result2 = generateDateAssignmentV2('task2', 'dueDate', '2024-01-01');

      // Extract the variable names from the assignmentScript
      const varName1Match = result1?.assignmentScript.match(/to (dateVar\w+)/);
      const varName2Match = result2?.assignmentScript.match(/to (dateVar\w+)/);

      expect(varName1Match).not.toBeNull();
      expect(varName2Match).not.toBeNull();

      const varName1 = varName1Match?.[1];
      const varName2 = varName2Match?.[1];

      // Variable names should be unique
      expect(varName1).not.toBe(varName2);

      // Variable names should be used consistently in preScript
      expect(result1?.preScript).toContain(`copy current date to ${varName1}`);
      expect(result2?.preScript).toContain(`copy current date to ${varName2}`);
    });

    it('should generate valid AppleScript structure', () => {
      const result = generateDateAssignmentV2('myObject', 'theProperty', '2024-12-25T15:30:00');

      expect(result).not.toBeNull();
      if (result === null) return;

      // preScript should have all required date components
      const preScript = result.preScript;
      expect(preScript).toMatch(/copy current date to dateVar\w+/);
      expect(preScript).toMatch(/set year of dateVar\w+ to 2024/);
      expect(preScript).toMatch(/set month of dateVar\w+ to 12/);
      expect(preScript).toMatch(/set day of dateVar\w+ to 25/);
      expect(preScript).toMatch(/set hours of dateVar\w+ to 15/);
      expect(preScript).toMatch(/set minutes of dateVar\w+ to 30/);
      expect(preScript).toMatch(/set seconds of dateVar\w+ to 0/);

      // assignmentScript should reference the same variable
      expect(result.assignmentScript).toMatch(/set theProperty of myObject to dateVar\w+/);
    });
  });
});
