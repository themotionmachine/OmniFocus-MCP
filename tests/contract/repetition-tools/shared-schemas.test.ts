import { describe, expect, it } from 'vitest';
import {
  AnchorDateKeySchema,
  DayAbbreviationSchema,
  PresetNameSchema,
  RepetitionMethodSchema,
  RepetitionRuleDataSchema,
  ScheduleTypeSchema
} from '../../../src/contracts/repetition-tools/shared/index.js';

describe('ScheduleTypeSchema', () => {
  it('should accept valid schedule types', () => {
    for (const value of ['Regularly', 'FromCompletion', 'None']) {
      const result = ScheduleTypeSchema.safeParse(value);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid schedule types', () => {
    for (const value of ['regularly', 'REGULARLY', 'Daily', '', 123]) {
      const result = ScheduleTypeSchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });
});

describe('AnchorDateKeySchema', () => {
  it('should accept valid anchor date keys', () => {
    for (const value of ['DueDate', 'DeferDate', 'PlannedDate']) {
      const result = AnchorDateKeySchema.safeParse(value);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid anchor date keys', () => {
    for (const value of ['dueDate', 'DUEDATE', 'StartDate', '']) {
      const result = AnchorDateKeySchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });
});

describe('RepetitionMethodSchema', () => {
  it('should accept valid deprecated method values', () => {
    for (const value of ['DueDate', 'Fixed', 'DeferUntilDate', 'None']) {
      const result = RepetitionMethodSchema.safeParse(value);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid method values', () => {
    for (const value of ['Regularly', 'FromCompletion', 'duedate']) {
      const result = RepetitionMethodSchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });
});

describe('PresetNameSchema', () => {
  const validPresets = [
    'daily',
    'weekdays',
    'weekly',
    'biweekly',
    'monthly',
    'monthly_last_day',
    'quarterly',
    'yearly'
  ];

  it('should accept all 8 valid preset names', () => {
    for (const value of validPresets) {
      const result = PresetNameSchema.safeParse(value);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid preset names', () => {
    for (const value of ['Daily', 'WEEKLY', 'hourly', 'bi-weekly', '']) {
      const result = PresetNameSchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });

  it('should have exactly 8 preset values', () => {
    expect(PresetNameSchema.options).toHaveLength(8);
  });
});

describe('DayAbbreviationSchema', () => {
  const validDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  it('should accept all 7 day abbreviations', () => {
    for (const value of validDays) {
      const result = DayAbbreviationSchema.safeParse(value);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid day abbreviations', () => {
    for (const value of ['Mo', 'mon', 'Monday', 'mo', '']) {
      const result = DayAbbreviationSchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });

  it('should have exactly 7 day values', () => {
    expect(DayAbbreviationSchema.options).toHaveLength(7);
  });
});

describe('RepetitionRuleDataSchema', () => {
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
    method: 'Fixed'
  };

  it('should accept complete v4.7+ rule data', () => {
    const result = RepetitionRuleDataSchema.safeParse(validRuleV47);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
      expect(result.data.isRepeating).toBe(true);
      expect(result.data.scheduleType).toBe('Regularly');
      expect(result.data.anchorDateKey).toBe('DueDate');
      expect(result.data.catchUpAutomatically).toBe(false);
      expect(result.data.method).toBe('DueDate');
    }
  });

  it('should accept pre-v4.7 rule data with null v4.7+ fields', () => {
    const result = RepetitionRuleDataSchema.safeParse(validRulePreV47);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduleType).toBeNull();
      expect(result.data.anchorDateKey).toBeNull();
      expect(result.data.catchUpAutomatically).toBeNull();
    }
  });

  it('should accept rule with null deprecated method', () => {
    const result = RepetitionRuleDataSchema.safeParse({
      ...validRuleV47,
      method: null
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing ruleString', () => {
    const { ruleString: _, ...noRuleString } = validRuleV47;
    const result = RepetitionRuleDataSchema.safeParse(noRuleString);
    expect(result.success).toBe(false);
  });

  it('should reject isRepeating value other than true', () => {
    const result = RepetitionRuleDataSchema.safeParse({
      ...validRuleV47,
      isRepeating: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid scheduleType enum value', () => {
    const result = RepetitionRuleDataSchema.safeParse({
      ...validRuleV47,
      scheduleType: 'Invalid'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid anchorDateKey enum value', () => {
    const result = RepetitionRuleDataSchema.safeParse({
      ...validRuleV47,
      anchorDateKey: 'StartDate'
    });
    expect(result.success).toBe(false);
  });

  it('should have .describe() annotations on v4.7+ fields', () => {
    const shape = RepetitionRuleDataSchema.shape;
    expect(shape.scheduleType.description).toContain('v4.7+');
    expect(shape.anchorDateKey.description).toContain('v4.7+');
    expect(shape.catchUpAutomatically.description).toContain('v4.7+');
  });

  it('should have .describe() annotation on deprecated method field', () => {
    const shape = RepetitionRuleDataSchema.shape;
    expect(shape.method.description).toContain('DEPRECATED');
  });

  it('should accept all valid scheduleType values with the rule', () => {
    for (const st of ['Regularly', 'FromCompletion', 'None']) {
      const result = RepetitionRuleDataSchema.safeParse({
        ...validRuleV47,
        scheduleType: st
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid anchorDateKey values with the rule', () => {
    for (const ak of ['DueDate', 'DeferDate', 'PlannedDate']) {
      const result = RepetitionRuleDataSchema.safeParse({
        ...validRuleV47,
        anchorDateKey: ak
      });
      expect(result.success).toBe(true);
    }
  });
});
