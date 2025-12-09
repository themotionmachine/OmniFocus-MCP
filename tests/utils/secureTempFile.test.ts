import { existsSync, readFileSync, statSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { writeSecureTempFile } from '../../src/utils/secureTempFile.js';

describe('secureTempFile', () => {
  const createdFiles: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up any files created during tests
    for (const file of createdFiles) {
      try {
        file.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFiles.length = 0;
  });

  describe('writeSecureTempFile', () => {
    it('should create a temporary file with the specified content', () => {
      const content = 'test content';
      const result = writeSecureTempFile(content, 'test', '.txt');
      createdFiles.push(result);

      expect(result.path).toBeDefined();
      expect(typeof result.path).toBe('string');
      expect(result.path.length).toBeGreaterThan(0);

      // Verify file exists and contains correct content
      expect(existsSync(result.path)).toBe(true);
      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(content);
    });

    it('should create file with correct prefix and extension', () => {
      const result = writeSecureTempFile('content', 'my_prefix', '.js');
      createdFiles.push(result);

      expect(result.path).toContain('my_prefix_');
      expect(result.path).toMatch(/\.js$/);
    });

    it('should use default prefix and extension when not specified', () => {
      const result = writeSecureTempFile('content');
      createdFiles.push(result);

      expect(result.path).toContain('temp_');
      expect(result.path).toMatch(/\.tmp$/);
    });

    it('should create file with secure permissions (mode 0o600)', () => {
      const result = writeSecureTempFile('secure content', 'secure', '.txt');
      createdFiles.push(result);

      const stats = statSync(result.path);
      // Check that only owner has read/write permissions
      // On Unix, 0o600 means rw------- (owner read/write only)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('should provide a cleanup function that removes the file', () => {
      const result = writeSecureTempFile('to be cleaned', 'cleanup', '.txt');
      const filePath = result.path;

      expect(existsSync(filePath)).toBe(true);

      result.cleanup();

      expect(existsSync(filePath)).toBe(false);
    });

    it('should handle empty content', () => {
      const result = writeSecureTempFile('', 'empty', '.txt');
      createdFiles.push(result);

      expect(existsSync(result.path)).toBe(true);
      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe('');
    });

    it('should handle content with special characters', () => {
      const content = 'Hello\nWorld\t"Quoted" \'Single\' `Backtick` $variable';
      const result = writeSecureTempFile(content, 'special', '.txt');
      createdFiles.push(result);

      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(content);
    });

    it('should handle unicode content', () => {
      const content = '日本語 中文 한국어 😀🎉';
      const result = writeSecureTempFile(content, 'unicode', '.txt');
      createdFiles.push(result);

      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(content);
    });

    it('should handle large content', () => {
      const content = 'x'.repeat(100000);
      const result = writeSecureTempFile(content, 'large', '.txt');
      createdFiles.push(result);

      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(content);
    });

    it('should handle AppleScript content correctly', () => {
      const appleScriptContent = `
tell application "OmniFocus"
  tell front document
    set newTask to make new inbox task with properties {name:"Test Task"}
    return id of newTask
  end tell
end tell
`;
      const result = writeSecureTempFile(appleScriptContent, 'applescript', '.applescript');
      createdFiles.push(result);

      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(appleScriptContent);
    });

    it('should handle JXA script content correctly', () => {
      const jxaContent = `
(() => {
  const app = Application('OmniFocus');
  return JSON.stringify({ success: true });
})();
`;
      const result = writeSecureTempFile(jxaContent, 'jxa', '.js');
      createdFiles.push(result);

      const fileContent = readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(jxaContent);
    });

    it('should create unique files for multiple calls', () => {
      const result1 = writeSecureTempFile('content1', 'unique', '.txt');
      const result2 = writeSecureTempFile('content2', 'unique', '.txt');
      createdFiles.push(result1, result2);

      expect(result1.path).not.toBe(result2.path);
    });

    it('should handle cleanup being called multiple times', () => {
      const result = writeSecureTempFile('content', 'multi_cleanup', '.txt');

      result.cleanup();
      // Second cleanup should not throw
      expect(() => result.cleanup()).not.toThrow();
    });
  });
});
