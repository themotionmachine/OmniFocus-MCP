import { describe, expect, it } from 'vitest';
import { saveDatabase } from '../../../src/tools/primitives/saveDatabase.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('saveDatabase integration', () => {
  skipIfOmniFocusUnavailable();

  it('should return success when called', async () => {
    const result = await saveDatabase();

    expect(result.success).toBe(true);
  });

  it('should be idempotent: calling twice both return success', async () => {
    const first = await saveDatabase();
    expect(first.success).toBe(true);

    const second = await saveDatabase();
    expect(second.success).toBe(true);
  });
});
