import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetInboxCountScript,
  getInboxCount
} from '../../../src/tools/primitives/getInboxCount.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T044: Unit tests for getInboxCount primitive

describe('getInboxCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return count on success', async () => {
    const mockResponse = { success: true, count: 5 };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getInboxCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBe(5);
    }
  });

  it('should return zero for empty inbox', async () => {
    const mockResponse = { success: true, count: 0 };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getInboxCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBe(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getInboxCount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script failed');
    }
  });
});

describe('generateGetInboxCountScript', () => {
  it('should use inbox.length', () => {
    const script = generateGetInboxCountScript();

    expect(script).toContain('inbox.length');
  });

  it('should return success and count', () => {
    const script = generateGetInboxCountScript();

    expect(script).toContain('success: true');
    expect(script).toContain('count: inbox.length');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateGetInboxCountScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
