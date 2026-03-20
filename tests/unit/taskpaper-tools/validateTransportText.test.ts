import { describe, expect, it } from 'vitest';

// T022: Unit tests for validateTransportText primitive (pure TypeScript, no OmniJS mock needed)

const { validateTransportText } = await import(
  '../../../src/tools/primitives/validateTransportText.js'
);

describe('validateTransportText', () => {
  describe('basic parsing', () => {
    it('should parse a simple task line (- prefix)', () => {
      const result = validateTransportText({ text: '- Buy milk' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Buy milk');
        expect(result.items[0].type).toBe('task');
        expect(result.items[0].depth).toBe(0);
      }
    });

    it('should parse a project header (Name:)', () => {
      const result = validateTransportText({ text: 'Shopping:' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Shopping');
        expect(result.items[0].type).toBe('project');
      }
    });

    it('should parse tab indentation depth', () => {
      const text = '- Parent\n\t- Child\n\t\t- Grandchild';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].children).toHaveLength(1);
        expect(result.items[0].children[0].depth).toBe(1);
        expect(result.items[0].children[0].children).toHaveLength(1);
        expect(result.items[0].children[0].children[0].depth).toBe(2);
      }
    });
  });

  describe('metadata extraction', () => {
    it('should extract @tags()', () => {
      const result = validateTransportText({ text: '- Buy milk @tags(errands, shopping)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].tags).toContain('errands');
        expect(result.items[0].tags).toContain('shopping');
      }
    });

    it('should extract @due date', () => {
      const result = validateTransportText({ text: '- Buy milk @due(2026-03-25)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].dueDate).toBe('2026-03-25');
      }
    });

    it('should extract @defer date', () => {
      const result = validateTransportText({ text: '- Buy milk @defer(2026-03-20)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].deferDate).toBe('2026-03-20');
      }
    });

    it('should extract @done date', () => {
      const result = validateTransportText({ text: '- Done task @done(2026-03-19)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].doneDate).toBe('2026-03-19');
      }
    });

    it('should detect @flagged', () => {
      const result = validateTransportText({ text: '- Important task @flagged' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].flagged).toBe(true);
      }
    });

    it('should extract @estimate duration', () => {
      const result = validateTransportText({ text: '- Big task @estimate(30m)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].estimate).toBe('30m');
      }
    });

    it('should extract // note', () => {
      const result = validateTransportText({ text: '- Task //This is a note' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].note).toBe('This is a note');
      }
    });

    it('should extract ::ProjectName reference (FR-006)', () => {
      const result = validateTransportText({ text: '- Task ::My Project' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].projectName).toBe('My Project');
      }
    });
  });

  describe('warnings', () => {
    it('should generate warning for unrecognized syntax (FR-007)', () => {
      const result = validateTransportText({ text: '??? what is this' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].line).toBe(1);
        expect(result.warnings[0].content).toBe('??? what is this');
      }
    });

    it('should include line numbers in warnings', () => {
      const text = '- Valid task\n??? invalid\n- Another task';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].line).toBe(2);
      }
    });

    it('should warn on mixed indentation (tabs vs spaces)', () => {
      const text = '- Parent\n    - Spaces child';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        const mixedWarning = result.warnings.find(
          (w: { message: string }) =>
            w.message.toLowerCase().includes('indent') || w.message.toLowerCase().includes('space')
        );
        expect(mixedWarning).toBeDefined();
      }
    });
  });

  describe('empty/whitespace input (FR-008)', () => {
    it('should return zero-item report for empty string', () => {
      const result = validateTransportText({ text: '' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(0);
        expect(result.summary.tasks).toBe(0);
        expect(result.summary.projects).toBe(0);
      }
    });

    it('should return zero-item report for whitespace-only string', () => {
      const result = validateTransportText({ text: '   \n\t\n  ' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(0);
        expect(result.summary.tasks).toBe(0);
      }
    });
  });

  describe('recognized tokens without warning (FR-006)', () => {
    it('should not warn on @autodone', () => {
      const result = validateTransportText({ text: '- Task @autodone(true)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('should not warn on @parallel', () => {
      const result = validateTransportText({ text: '- Task @parallel(true)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('should not warn on @repeat-method', () => {
      const result = validateTransportText({ text: '- Task @repeat-method(fixed)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('should not warn on @repeat-rule', () => {
      const result = validateTransportText({ text: '- Task @repeat-rule(FREQ=DAILY)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toHaveLength(0);
      }
    });
  });

  describe('hierarchy', () => {
    it('should build nested hierarchy from indentation', () => {
      const text = 'Project A:\n\t- Task 1\n\t\t- Subtask 1.1\n\t- Task 2';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(1); // Project A
        expect(result.items[0].type).toBe('project');
        expect(result.items[0].children).toHaveLength(2); // Task 1, Task 2
        expect(result.items[0].children[0].children).toHaveLength(1); // Subtask 1.1
      }
    });

    it('should handle deeply nested items', () => {
      const text = '- L0\n\t- L1\n\t\t- L2\n\t\t\t- L3';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.maxDepth).toBe(3);
      }
    });
  });

  describe('summary computation', () => {
    it('should count tasks and projects correctly', () => {
      const text = 'My Project:\n\t- Task 1\n\t- Task 2\n- Inbox task';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.tasks).toBe(3);
        expect(result.summary.projects).toBe(1);
      }
    });

    it('should count unique tags', () => {
      const text = '- Task 1 @tags(home, errands)\n- Task 2 @tags(home)';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.tags).toBe(2); // home, errands (unique)
      }
    });

    it('should compute maxDepth correctly', () => {
      const text = '- Root\n\t- Child\n\t\t- Grandchild';
      const result = validateTransportText({ text });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.summary.maxDepth).toBe(2);
      }
    });
  });

  describe('special characters', () => {
    it('should handle Unicode in names', () => {
      const result = validateTransportText({ text: '- Acheter du lait (achat)' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items[0].name).toContain('lait');
      }
    });

    it('should handle multiple metadata on same line', () => {
      const result = validateTransportText({
        text: '- Task @flagged @due(2026-03-25) @tags(work) @estimate(1h) //note'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const item = result.items[0];
        expect(item.flagged).toBe(true);
        expect(item.dueDate).toBe('2026-03-25');
        expect(item.tags).toContain('work');
        expect(item.estimate).toBe('1h');
        expect(item.note).toBe('note');
      }
    });
  });
});
