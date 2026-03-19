import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSaveDatabaseScript,
  saveDatabase
} from '../../../src/tools/primitives/saveDatabase.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T051: Unit tests for saveDatabase primitive

describe('saveDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success on successful save', async () => {
    const mockResponse = { success: true };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await saveDatabase();

    expect(result.success).toBe(true);
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Save failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await saveDatabase();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Save failed');
    }
  });
});

describe('generateSaveDatabaseScript', () => {
  it('should call save()', () => {
    const script = generateSaveDatabaseScript();

    expect(script).toContain('save()');
  });

  it('should return success: true', () => {
    const script = generateSaveDatabaseScript();

    expect(script).toContain('success: true');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateSaveDatabaseScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
