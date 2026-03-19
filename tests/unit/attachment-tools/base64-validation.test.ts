import { describe, expect, it } from 'vitest';

// T004: Unit tests for base64 validation helper (validateBase64 in addAttachment.ts)
//
// Validation logic:
// - regex /^[A-Za-z0-9+/]*={0,2}$/ on stripped string
// - structural checks: length%4 !== 1, padded strings must have length%4 === 0
// - decoded size via Math.floor((data.length * 3) / 4) - padding
// - warning threshold: >10 MB decoded
// - rejection threshold: >50 MB decoded (SIZE_EXCEEDED)
import { validateBase64 } from '../../../src/tools/primitives/addAttachment.js';

describe('validateBase64', () => {
  describe('valid base64 strings', () => {
    it('should accept simple valid base64 string', () => {
      // "hello" in base64
      const result = validateBase64('aGVsbG8=');
      expect(result.valid).toBe(true);
    });

    it('should accept base64 without padding', () => {
      // Some base64 encoders omit trailing padding
      const result = validateBase64('aGVsbG8');
      expect(result.valid).toBe(true);
    });

    it('should accept base64 with double padding', () => {
      const result = validateBase64('YQ==');
      expect(result.valid).toBe(true);
    });

    it('should accept base64 string with all valid characters', () => {
      const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      // Make it valid length (must be multiple of 4 for valid base64)
      const result = validateBase64(allChars + 'AA==');
      expect(result.valid).toBe(true);
    });

    it('should reject empty string as invalid base64', () => {
      const result = validateBase64('');
      expect(result.valid).toBe(false);
    });
  });

  describe('strings with whitespace (pre-stripped by Zod)', () => {
    it('should accept base64 with embedded newlines (pre-stripping simulated)', () => {
      // Zod strips whitespace before passing to validator.
      // Simulate pre-stripped input:
      const stripped = 'aGVsbG8=';
      const result = validateBase64(stripped);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid base64 characters', () => {
    it('should reject string with invalid character @', () => {
      const result = validateBase64('aGVsb@8=');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });

    it('should reject string with spaces (pre-stripping not done)', () => {
      // If whitespace is NOT stripped, spaces should fail regex
      const result = validateBase64('aGVs bG8=');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });

    it('should reject string with tab character', () => {
      const result = validateBase64('aGVs\tbG8=');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });

    it('should reject string with exclamation mark', () => {
      const result = validateBase64('aGVsbG8!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });
  });

  describe('padding edge cases', () => {
    it('should reject string with more than 2 padding characters', () => {
      const result = validateBase64('aGVsbG8===');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });

    it('should reject string with padding in the middle', () => {
      const result = validateBase64('aGVs=bG8=');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID_BASE64');
    });
  });

  describe('size threshold calculations', () => {
    it('should not add warning for data under warning threshold', () => {
      // Use configurable thresholds to avoid allocating multi-MB strings.
      // 100 chars of base64 decodes to 75 bytes. Set warningBytes to 100 (above 75).
      const data = 'A'.repeat(100); // 75 decoded bytes
      const result = validateBase64(data, { warningBytes: 100, rejectionBytes: 200 });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warning).toBeUndefined();
      }
    });

    it('should add warning for data >10 MB decoded size', () => {
      // >10 MB decoded: base64 length > ceil(10485760 / 3) * 4 = 13981016
      // Create a string that decodes to >10 MB
      // 10 MB = 10485760 bytes => base64 = 14680064 chars
      // We'll use a valid base64 char pattern of the right length
      const elevenMBBase64Length = Math.ceil((11 * 1024 * 1024) / 3) * 4;
      const largeBase64 = 'A'.repeat(elevenMBBase64Length);
      const result = validateBase64(largeBase64);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('MB');
    });

    it('should reject data >50 MB decoded with SIZE_EXCEEDED', () => {
      // Zod schema max is 69,905,068 chars which decodes to ~50 MB.
      // The SIZE_EXCEEDED check in validateBase64 is a defense-in-depth guard
      // for direct callers bypassing the Zod schema.
      // Use configurable thresholds to avoid allocating ~70M strings in tests.
      // A 100-char base64 string decodes to 75 bytes; set rejectionBytes to 50.
      const data = 'A'.repeat(100); // 75 decoded bytes
      const result = validateBase64(data, { rejectionBytes: 50, warningBytes: 30 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SIZE_EXCEEDED');
    });
  });
});
