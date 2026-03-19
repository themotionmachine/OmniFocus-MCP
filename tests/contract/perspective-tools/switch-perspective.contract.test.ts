import { describe, expect, it } from 'vitest';
import {
  SwitchPerspectiveErrorSchema,
  SwitchPerspectiveInputSchema,
  SwitchPerspectiveResponseSchema,
  SwitchPerspectiveSuccessSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('SwitchPerspectiveInputSchema', () => {
  it('accepts name only', () => {
    const result = SwitchPerspectiveInputSchema.safeParse({ name: 'Inbox' });
    expect(result.success).toBe(true);
  });

  it('accepts identifier only', () => {
    const result = SwitchPerspectiveInputSchema.safeParse({ identifier: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty input', () => {
    const result = SwitchPerspectiveInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('SwitchPerspectiveSuccessSchema', () => {
  it('accepts valid success response with previous perspective', () => {
    const result = SwitchPerspectiveSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: 'Inbox',
      message: 'Switched to Work perspective'
    });
    expect(result.success).toBe(true);
  });

  it('accepts null previousPerspective', () => {
    const result = SwitchPerspectiveSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: null,
      message: 'Switched to Work perspective'
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = SwitchPerspectiveSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: null
    });
    expect(result.success).toBe(false);
  });
});

describe('SwitchPerspectiveErrorSchema', () => {
  it('accepts NOT_FOUND error', () => {
    const result = SwitchPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts NO_WINDOW error', () => {
    const result = SwitchPerspectiveErrorSchema.safeParse({
      success: false,
      error: 'No OmniFocus window is open',
      code: 'NO_WINDOW'
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISAMBIGUATION_REQUIRED with candidates', () => {
    const result = SwitchPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid error code', () => {
    const result = SwitchPerspectiveErrorSchema.safeParse({
      success: false,
      error: 'Some error',
      code: 'INVALID_CODE'
    });
    expect(result.success).toBe(false);
  });
});

describe('SwitchPerspectiveResponseSchema', () => {
  it('parses success response', () => {
    const result = SwitchPerspectiveResponseSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: 'Inbox',
      message: 'Switched'
    });
    expect(result.success).toBe(true);
  });

  it('parses error response', () => {
    const result = SwitchPerspectiveResponseSchema.safeParse({
      success: false,
      error: 'No window',
      code: 'NO_WINDOW'
    });
    expect(result.success).toBe(true);
  });
});
