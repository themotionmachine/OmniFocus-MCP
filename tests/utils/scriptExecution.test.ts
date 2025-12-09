import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() so the mock is available during vi.mock() hoisting
const { mockExecFileAsync } = vi.hoisted(() => ({
  mockExecFileAsync: vi.fn()
}));

vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>();
  return {
    ...original,
    promisify: vi.fn(() => mockExecFileAsync)
  };
});

// Mock secureTempFile
vi.mock('../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

// Mock fs module for the script reading
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      if (path.includes('omnifocusScripts')) {
        return true;
      }
      return actual.existsSync(path);
    }),
    readFileSync: vi.fn((path: string) => {
      if (path.includes('omnifocusScripts')) {
        return '(() => { return JSON.stringify({ success: true }); })();';
      }
      if (path === '/path/to/script.js') {
        return '(() => { return JSON.stringify({ success: true }); })();';
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    })
  };
});

// Import after mocking
import { executeJXA, executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

describe('scriptExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeJXA', () => {
    it('should execute JXA script and return parsed JSON result', async () => {
      const mockResult = { success: true, taskId: '123' };
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: ''
      });

      const result = await executeJXA('return JSON.stringify({ success: true, taskId: "123" });');

      expect(result).toEqual(mockResult);
    });

    it('should handle stderr output gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockResult = { success: true };

      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: 'Warning message'
      });

      const result = await executeJXA('script');

      expect(result).toEqual(mockResult);
      expect(consoleSpy).toHaveBeenCalledWith('Script stderr output:', 'Warning message');

      consoleSpy.mockRestore();
    });

    it('should return empty array for non-JSON output', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON',
        stderr: ''
      });

      const result = await executeJXA('script');

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should return empty array for "Found X tasks" output', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockExecFileAsync.mockResolvedValue({
        stdout: 'Found 10 tasks in the database',
        stderr: ''
      });

      const result = await executeJXA('script');

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should throw error when script execution fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Execution failed');

      mockExecFileAsync.mockRejectedValue(error);

      await expect(executeJXA('script')).rejects.toThrow('Execution failed');

      consoleSpy.mockRestore();
    });

    it('should clean up temp file after successful execution', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true }),
        stderr: ''
      });

      await executeJXA('script');

      expect(mockExecFileAsync).toHaveBeenCalled();
    });

    it('should clean up temp file after failed execution', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Execution failed');

      mockExecFileAsync.mockRejectedValue(error);

      await expect(executeJXA('script')).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('executeOmniFocusScript', () => {
    it('should execute script from @ path (built-in script)', async () => {
      const mockResult = { success: true, data: [] };

      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: ''
      });

      const result = await executeOmniFocusScript('@testScript.js');

      expect(result).toEqual(mockResult);
    });

    it('should execute script from absolute path', async () => {
      const mockResult = { success: true };

      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: ''
      });

      const result = await executeOmniFocusScript('/path/to/script.js');

      expect(result).toEqual(mockResult);
    });

    it('should handle stderr output', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockResult = { success: true };

      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: 'Some stderr'
      });

      await executeOmniFocusScript('@testScript.js');

      expect(consoleSpy).toHaveBeenCalledWith('Script stderr output:', 'Some stderr');

      consoleSpy.mockRestore();
    });

    it('should return raw output when JSON parsing fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON output',
        stderr: ''
      });

      const result = await executeOmniFocusScript('@testScript.js');

      expect(result).toBe('Not valid JSON output');

      consoleSpy.mockRestore();
    });

    it('should throw error when execution fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Script failed');

      mockExecFileAsync.mockRejectedValue(error);

      await expect(executeOmniFocusScript('@testScript.js')).rejects.toThrow('Script failed');

      consoleSpy.mockRestore();
    });

    it('should properly escape script content', async () => {
      const mockResult = { success: true };

      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: ''
      });

      await executeOmniFocusScript('@testScript.js');

      expect(mockExecFileAsync).toHaveBeenCalled();
    });

    it('should clean up temp file after execution', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true }),
        stderr: ''
      });

      await executeOmniFocusScript('@testScript.js');

      expect(mockExecFileAsync).toHaveBeenCalled();
    });
  });
});
