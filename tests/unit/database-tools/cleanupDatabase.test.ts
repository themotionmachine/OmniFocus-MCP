import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupDatabase,
  generateCleanupDatabaseScript
} from '../../../src/tools/primitives/cleanupDatabase.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T058: Unit tests for cleanupDatabase primitive

describe('cleanupDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success on successful cleanup', async () => {
    const mockResponse = { success: true };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await cleanupDatabase();

    expect(result.success).toBe(true);
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Cleanup failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await cleanupDatabase();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Cleanup failed');
    }
  });
});

describe('generateCleanupDatabaseScript', () => {
  it('should call cleanUp()', () => {
    const script = generateCleanupDatabaseScript();

    expect(script).toContain('cleanUp()');
  });

  it('should return success: true', () => {
    const script = generateCleanupDatabaseScript();

    expect(script).toContain('success: true');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateCleanupDatabaseScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
