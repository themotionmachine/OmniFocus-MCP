import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateUnfocusScript, unfocus } from '../../../src/tools/primitives/unfocus.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T058: Unit tests for unfocus primitive

describe('unfocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unfocus when focused (clears focus)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: true });
    const result = await unfocus({});
    expect(result.success).toBe(true);
  });

  it('should unfocus when already unfocused (idempotent no-op)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: true });
    const result = await unfocus({});
    expect(result.success).toBe(true);
  });

  it('should fail on version guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'unfocus requires OmniFocus 4.0 or later.'
    });
    const result = await unfocus({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('unfocus requires OmniFocus 4.0');
    }
  });

  it('should fail on window guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'No OmniFocus window is open.'
    });
    const result = await unfocus({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No OmniFocus window');
    }
  });

  it('should call executeOmniJS with generated script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: true });
    await unfocus({});
    expect(executeOmniJS).toHaveBeenCalledOnce();
    const script = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(typeof script).toBe('string');
  });

  it('should propagate errors from executeOmniJS rejection', async () => {
    vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));
    await expect(unfocus({})).rejects.toThrow('Script execution failed');
  });
});

describe('generateUnfocusScript', () => {
  it('should produce valid OmniJS script', () => {
    const script = generateUnfocusScript();
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include version and window guards but NOT content tree guard', () => {
    const script = generateUnfocusScript();
    expect(script).toContain("Version('4.0')");
    expect(script).toContain('document.windows[0]');
    // Unfocus does NOT need content tree
    expect(script).not.toContain('win.content');
  });

  it('should set window.focus to empty array', () => {
    const script = generateUnfocusScript();
    expect(script).toContain('win.focus = []');
  });

  it('should return success: true', () => {
    const script = generateUnfocusScript();
    expect(script).toContain('success: true');
  });

  it('should include try-catch error handling', () => {
    const script = generateUnfocusScript();
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });
});
