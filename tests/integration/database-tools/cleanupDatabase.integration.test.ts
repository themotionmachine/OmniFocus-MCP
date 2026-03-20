import { describe, expect, it } from 'vitest';
import { cleanupDatabase } from '../../../src/tools/primitives/cleanupDatabase.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('cleanupDatabase integration', () => {
  skipIfOmniFocusUnavailable();

  it('should return success when called', async () => {
    const result = await cleanupDatabase();

    expect(result.success).toBe(true);
  });

  it('should be idempotent: calling twice both return success', async () => {
    const first = await cleanupDatabase();
    expect(first.success).toBe(true);

    const second = await cleanupDatabase();
    expect(second.success).toBe(true);
  });
});
