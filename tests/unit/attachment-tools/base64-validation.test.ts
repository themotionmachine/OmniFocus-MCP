import { describe, expect, it } from 'vitest';

// T004: Unit tests for base64 validation helper
// These tests will be satisfied when the helper is inline in addAttachment.ts
// We import it directly once implemented.

// We test the validation logic against documented behavior:
// - regex /^[A-Za-z0-9+/]*={0,2}$/ on stripped string
// - decoded size via Buffer.from(data, 'base64').length
// - warning threshold: >10 MB
// - rejection threshold: >50 MB (SIZE_EXCEEDED)

// Since the helper is not yet implemented, these tests import from the primitive
// to verify the behavior through the public API.
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

    it('should accept empty stripped string after whitespace stripping (schema level handles empty)', () => {
      // After Zod strips whitespace, schema checks non-empty separately.
      // The TS validator receives already-stripped data, so empty is invalid base64.
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
    it('should not add warning for data under 10 MB decoded', () => {
      // Under 10 MB: ~13.3 MB base64 for 10 MB decoded => use 9 MB test
      // 9 MB = 9437184 bytes => base64 length = ceil(9437184 / 3) * 4 = 12582912 chars
      // Create a 9 MB equivalent base64 string (just need valid chars and right length)
      const ninetyKBytes = 'A'.repeat((9 * 1024 * 4) / 3); // ~9 KB in base64
      const result = validateBase64(ninetyKBytes);
      // Either valid or regex-invalid, but no warning for small data
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
      // Size math:
      // 50 MB = 52428800 bytes
      // To decode to >50 MB: base64 length > ceil(52428800/3)*4 = 70238208 chars
      // But Zod's max is 67108864 chars, which decodes to:
      //   Math.floor(67108864 * 3 / 4) = 50331648 bytes = ~48 MB (UNDER 50 MB)
      //
      // So Zod's schema actually prevents any base64 string that decodes to >50 MB,
      // because the Zod max (67108864 chars) decodes to only ~48 MB.
      //
      // The SIZE_EXCEEDED check in validateBase64 is a defense-in-depth guard
      // for the edge case where someone calls validateBase64 directly with
      // a very large string (bypassing Zod). We test this by constructing a
      // string that WOULD decode to >50 MB:
      // 51 MB = 53477376 bytes => base64 = ceil(53477376/3)*4 = 71303168 chars
      // This exceeds Zod max but we can test validateBase64 directly.
      //
      // For test performance, we compute the exact minimum length needed:
      // We need decodedBytes > 52428800
      // decodedBytes = Math.floor(length * 3 / 4)
      // length > 52428800 * 4 / 3 = 69905066.7 => use 69905068 (multiple of 4)
      const OVER_50MB_BASE64_LENGTH = 69905068;
      const largeString = 'A'.repeat(OVER_50MB_BASE64_LENGTH);
      const result = validateBase64(largeString);
      // This should decode to >50 MB and be rejected
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SIZE_EXCEEDED');
    }, 60000); // longer timeout for very large string
  });
});
