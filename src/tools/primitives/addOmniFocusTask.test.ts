import { describe, it, expect, vi } from 'vitest';
import { generateAppleScript, verifyPersistedWithRetries } from './addOmniFocusTask.js';

describe('addOmniFocusTask generateAppleScript', () => {
  it('creates inbox task when no project specified', () => {
    const script = generateAppleScript({ name: 'Buy milk' });
    expect(script).toContain('make new inbox task with properties {name:"Buy milk"}');
  });

  it('creates task in project when projectName specified', () => {
    const script = generateAppleScript({
      name: 'Write tests',
      projectName: 'Development',
    });
    expect(script).toContain('first flattened project where name = "Development"');
    expect(script).toContain('make new task with properties {name:"Write tests"}');
    expect(script).toContain('at end of tasks of theProject');
  });

  it('preserves newlines in note via linefeed concatenation', () => {
    const script = generateAppleScript({
      name: 'A task',
      note: 'Line 1\nLine 2\nLine 3',
    });
    expect(script).toContain(
      'set note of newTask to "Line 1" & linefeed & "Line 2" & linefeed & "Line 3"'
    );
  });
});

describe('verifyPersistedWithRetries (issue #57 persistence guard)', () => {
  const noSleep = () => Promise.resolve();

  it('returns true on the first successful probe without sleeping', async () => {
    const probe = vi.fn().mockResolvedValue(true);
    const sleepFn = vi.fn(noSleep);
    const ok = await verifyPersistedWithRetries(probe, { sleepFn });
    expect(ok).toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it('retries until a later probe succeeds, then stops', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const ok = await verifyPersistedWithRetries(probe, {
      delaysMs: [0, 10, 20, 40],
      sleepFn: noSleep,
    });
    expect(ok).toBe(true);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it('returns false when the task never becomes resolvable', async () => {
    const probe = vi.fn().mockResolvedValue(false);
    const ok = await verifyPersistedWithRetries(probe, {
      delaysMs: [0, 10, 20],
      sleepFn: noSleep,
    });
    expect(ok).toBe(false);
    expect(probe).toHaveBeenCalledTimes(3);
  });
});
