import { beforeEach, describe, expect, it, vi } from 'vitest';
import { switchPerspective } from '../../../src/tools/primitives/switchPerspective.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('switchPerspective', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches to custom perspective by name (FR-017, FR-024)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: 'Inbox',
      message: "Switched to 'Work' perspective"
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectiveName).toBe('Work');
      expect(result.previousPerspective).toBe('Inbox');
      expect(result.message).toBeDefined();
    }
  });

  it('switches to custom perspective by identifier (FR-017)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: null,
      message: "Switched to 'Work' perspective"
    });

    const result = await switchPerspective({ identifier: 'abc123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectiveName).toBe('Work');
    }
  });

  it('switches to built-in perspective by name (FR-024)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Inbox',
      previousPerspective: 'Work',
      message: "Switched to 'Inbox' perspective"
    });

    const result = await switchPerspective({ name: 'Inbox' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectiveName).toBe('Inbox');
    }
  });

  it('returns NO_WINDOW error when no OmniFocus window (FR-019, FR-020)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'No OmniFocus window is open',
      code: 'NO_WINDOW'
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NO_WINDOW');
    }
  });

  it('returns NOT_FOUND error for unknown perspective', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });

    const result = await switchPerspective({ name: 'Unknown' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('handles idempotent re-switch to same perspective (FR-023)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: 'Work',
      message: "Switched to 'Work' perspective"
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success) {
      // When previous and current are same, it's still success
      expect(result.perspectiveName).toBe('Work');
    }
  });

  it('returns previous perspective name (FR-021)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: 'Projects',
      message: "Switched to 'Work' perspective"
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previousPerspective).toBe('Projects');
    }
  });

  it('returns DISAMBIGUATION_REQUIRED with candidates (FR-042)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.candidates).toHaveLength(2);
    }
  });

  it('accepts null previousPerspective', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: null,
      message: "Switched to 'Work' perspective"
    });

    const result = await switchPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previousPerspective).toBeNull();
    }
  });

  it('calls executeOmniJS with script containing window check', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      previousPerspective: null,
      message: 'Switched'
    });

    await switchPerspective({ name: 'Work' });

    expect(vi.mocked(executeOmniJS)).toHaveBeenCalledOnce();
    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('windows');
  });
});
