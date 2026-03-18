import { describe, expect, it } from 'vitest';
import {
  GetRepetitionErrorSchema,
  GetRepetitionInputSchema,
  GetRepetitionResponseSchema,
  GetRepetitionSuccessNoRuleSchema,
  GetRepetitionSuccessWithRuleSchema
} from '../../../src/contracts/repetition-tools/get-repetition.js';

const validRuleV47 = {
  ruleString: 'FREQ=WEEKLY;BYDAY=MO',
  isRepeating: true as const,
  scheduleType: 'Regularly',
  anchorDateKey: 'DueDate',
  catchUpAutomatically: false,
  method: 'DueDate'
};

const validRulePreV47 = {
  ruleString: 'FREQ=DAILY',
  isRepeating: true as const,
  scheduleType: null,
  anchorDateKey: null,
  catchUpAutomatically: null,
  method: null
};

describe('GetRepetitionInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept a non-empty id string', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: 'task-abc123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc123');
      }
    });

    it('should accept a single character id', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: 'x' });
      expect(result.success).toBe(true);
    });

    it('should accept a project id', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: 'proj-xyz-789' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string id', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = GetRepetitionInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = GetRepetitionInputSchema.safeParse({ id: null });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetRepetitionSuccessWithRuleSchema', () => {
  describe('valid inputs', () => {
    it('should accept success response with v4.7+ rule data', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-abc123',
        name: 'Weekly team meeting',
        hasRule: true,
        rule: validRuleV47
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.hasRule).toBe(true);
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.name).toBe('Weekly team meeting');
        expect(result.data.rule.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
        expect(result.data.rule.isRepeating).toBe(true);
        expect(result.data.rule.scheduleType).toBe('Regularly');
        expect(result.data.rule.anchorDateKey).toBe('DueDate');
      }
    });

    it('should accept success response with pre-v4.7 rule (null v4.7+ fields)', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-legacy',
        name: 'Daily review',
        hasRule: true,
        rule: validRulePreV47
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rule.scheduleType).toBeNull();
        expect(result.data.rule.anchorDateKey).toBeNull();
        expect(result.data.rule.catchUpAutomatically).toBeNull();
        expect(result.data.rule.method).toBeNull();
      }
    });

    it('should accept rule with all valid scheduleType values', () => {
      for (const scheduleType of ['Regularly', 'FromCompletion', 'None']) {
        const result = GetRepetitionSuccessWithRuleSchema.safeParse({
          success: true,
          id: 'task-1',
          name: 'Task',
          hasRule: true,
          rule: { ...validRuleV47, scheduleType }
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept rule with all valid anchorDateKey values', () => {
      for (const anchorDateKey of ['DueDate', 'DeferDate', 'PlannedDate']) {
        const result = GetRepetitionSuccessWithRuleSchema.safeParse({
          success: true,
          id: 'task-1',
          name: 'Task',
          hasRule: true,
          rule: { ...validRuleV47, anchorDateKey }
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject hasRule: false (wrong discriminator)', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: false,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: false', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: false,
        id: 'task-1',
        name: 'Task',
        hasRule: true,
        rule: validRuleV47
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing rule field', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject null rule when hasRule is true', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: true,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        name: 'Task',
        hasRule: true,
        rule: validRuleV47
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        hasRule: true,
        rule: validRuleV47
      });
      expect(result.success).toBe(false);
    });

    it('should reject rule with invalid scheduleType', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: true,
        rule: { ...validRuleV47, scheduleType: 'InvalidType' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject rule with isRepeating: false', () => {
      const result = GetRepetitionSuccessWithRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: true,
        rule: { ...validRuleV47, isRepeating: false }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetRepetitionSuccessNoRuleSchema', () => {
  describe('valid inputs', () => {
    it('should accept success response with no rule', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        id: 'task-abc123',
        name: 'One-time task',
        hasRule: false,
        rule: null
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.hasRule).toBe(false);
        expect(result.data.rule).toBeNull();
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.name).toBe('One-time task');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject hasRule: true (wrong discriminator)', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: true,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: false', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: false,
        id: 'task-1',
        name: 'Task',
        hasRule: false,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-null rule when hasRule is false', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: false,
        rule: validRuleV47
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        name: 'Task',
        hasRule: false,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        hasRule: false,
        rule: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing rule field', () => {
      const result = GetRepetitionSuccessNoRuleSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        hasRule: false
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetRepetitionErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = GetRepetitionErrorSchema.safeParse({
      success: false,
      error: "Task 'abc123' not found"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe("Task 'abc123' not found");
    }
  });

  it('should accept generic OmniJS error message', () => {
    const result = GetRepetitionErrorSchema.safeParse({
      success: false,
      error: 'Script execution failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = GetRepetitionErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = GetRepetitionErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error message', () => {
    const result = GetRepetitionErrorSchema.safeParse({
      success: false,
      error: 404
    });
    expect(result.success).toBe(false);
  });
});

describe('GetRepetitionResponseSchema (discriminated union on success)', () => {
  it('should accept success response with rule (hasRule: true)', () => {
    const result = GetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Weekly standup',
      hasRule: true,
      rule: validRuleV47
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response without rule (hasRule: false)', () => {
    const result = GetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-2',
      name: 'Buy groceries',
      hasRule: false,
      rule: null
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = GetRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response missing required fields', () => {
    const result = GetRepetitionResponseSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response missing error field', () => {
    const result = GetRepetitionResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('Dual-discriminator design (success + hasRule)', () => {
  it('top-level success discriminator: true routes to success variants', () => {
    const withRule = GetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      hasRule: true,
      rule: validRuleV47
    });
    expect(withRule.success).toBe(true);

    const noRule = GetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-2',
      name: 'Task',
      hasRule: false,
      rule: null
    });
    expect(noRule.success).toBe(true);
  });

  it('top-level success discriminator: false routes to error schema', () => {
    const error = GetRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Not found'
    });
    expect(error.success).toBe(true);
    if (error.success) {
      expect(error.data.success).toBe(false);
    }
  });

  it('nested hasRule: true discriminator requires non-null rule', () => {
    const result = GetRepetitionSuccessWithRuleSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      hasRule: true,
      rule: validRuleV47
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasRule).toBe(true);
      expect(result.data.rule).not.toBeNull();
    }
  });

  it('nested hasRule: false discriminator requires rule: null', () => {
    const result = GetRepetitionSuccessNoRuleSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      hasRule: false,
      rule: null
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasRule).toBe(false);
      expect(result.data.rule).toBeNull();
    }
  });

  it('hasRule: true with null rule fails nested discriminator', () => {
    const result = GetRepetitionSuccessWithRuleSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      hasRule: true,
      rule: null
    });
    expect(result.success).toBe(false);
  });

  it('hasRule: false with non-null rule fails nested discriminator', () => {
    const result = GetRepetitionSuccessNoRuleSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      hasRule: false,
      rule: validRuleV47
    });
    expect(result.success).toBe(false);
  });

  it('both discriminators parse correctly for complete round-trip shape', () => {
    const withRuleResult = GetRepetitionResponseSchema.parse({
      success: true,
      id: 'task-1',
      name: 'Weekly standup',
      hasRule: true,
      rule: validRuleV47
    });
    expect(withRuleResult.success).toBe(true);
    if (withRuleResult.success) {
      expect(withRuleResult.hasRule).toBe(true);
      if (withRuleResult.hasRule) {
        expect(withRuleResult.rule.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
        expect(withRuleResult.rule.isRepeating).toBe(true);
      }
    }

    const noRuleResult = GetRepetitionResponseSchema.parse({
      success: true,
      id: 'task-2',
      name: 'Buy groceries',
      hasRule: false,
      rule: null
    });
    expect(noRuleResult.success).toBe(true);
    if (noRuleResult.success) {
      expect(noRuleResult.hasRule).toBe(false);
      if (!noRuleResult.hasRule) {
        expect(noRuleResult.rule).toBeNull();
      }
    }

    const errorResult = GetRepetitionResponseSchema.parse({
      success: false,
      error: 'Task not found'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Task not found');
    }
  });
});
