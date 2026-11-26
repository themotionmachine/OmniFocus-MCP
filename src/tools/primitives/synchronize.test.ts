import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateScript } from './synchronize.js';

/**
 * `synchronize` in OmniFocus starts a sync and returns at once; the script's
 * job is to wait for that sync to finish. These run the generated JXA against
 * a fake document whose sync state moves on as the script polls, on a fake
 * clock, so they check what the script does rather than what text it contains.
 */

interface FakeSync {
  // State the document reports on each poll after `synchronize` (the last one repeats).
  polls: { syncing: boolean; last: string | null }[];
  before?: string | null;
  error?: string | null;
}

function run(params: { waitSeconds?: number }, fake: FakeSync) {
  let poll = -1;
  const calls: string[] = [];
  const state = () => fake.polls[Math.min(poll, fake.polls.length - 1)];
  const doc = {
    synchronize: () => { calls.push('synchronize'); poll = 0; },
    syncing: () => (poll < 0 ? false : state().syncing),
    lastSyncDate: () => {
      const v = poll < 0 ? (fake.before ?? null) : state().last;
      return v ? new Date(v) : null;
    },
    lastSyncError: () => fake.error ?? null,
  };
  const Application = (name: string) => { calls.push(`app:${name}`); return { defaultDocument: doc }; };
  const delay = (s: number) => { poll++; vi.advanceTimersByTime(s * 1000); };
  const out = new Function('Application', 'delay', `return ${generateScript(params)}`)(Application, delay);
  return { result: JSON.parse(out), calls, polls: poll };
}

describe('synchronize script', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-29T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts a sync on the default document of OmniFocus', () => {
    const { calls } = run({}, { before: '2026-10-29T11:00:00Z', polls: [{ syncing: false, last: '2026-10-29T12:00:01Z' }] });
    expect(calls).toEqual(['app:OmniFocus', 'synchronize']);
  });

  it('waits until the last sync date moves past the one before the request', () => {
    const { result, polls } = run({}, {
      before: '2026-10-29T11:00:00Z',
      polls: [
        { syncing: false, last: '2026-10-29T11:00:00Z' },   // not begun yet
        { syncing: true, last: '2026-10-29T11:00:00Z' },
        { syncing: true, last: '2026-10-29T11:00:00Z' },
        { syncing: false, last: '2026-10-29T12:00:01Z' },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.finished).toBe(true);
    expect(polls).toBe(3);
    expect(result.waitedMs).toBe(750);
    expect(result.lastSyncDate).not.toBeNull();
  });

  it('counts a sync seen running then over as finished, even within the same second', () => {
    const { result } = run({}, {
      before: '2026-10-29T12:00:00Z',
      polls: [{ syncing: true, last: '2026-10-29T12:00:00Z' }, { syncing: false, last: '2026-10-29T12:00:00Z' }],
    });
    expect(result.finished).toBe(true);
  });

  it('finishes on a first sync, when there was no last sync date before', () => {
    const { result } = run({}, { before: null, polls: [{ syncing: false, last: '2026-10-29T12:00:01Z' }] });
    expect(result.finished).toBe(true);
  });

  it('gives up after waitSeconds and says the sync had not finished', () => {
    const { result } = run({ waitSeconds: 2 }, {
      before: '2026-10-29T11:00:00Z',
      polls: [{ syncing: true, last: '2026-10-29T11:00:00Z' }],
    });
    expect(result.success).toBe(true);
    expect(result.finished).toBe(false);
    expect(result.waitedMs).toBe(2000);
  });

  it('with waitSeconds 0, starts the sync and returns without polling', () => {
    const { result, calls, polls } = run({ waitSeconds: 0 }, {
      before: '2026-10-29T11:00:00Z',
      polls: [{ syncing: true, last: '2026-10-29T11:00:00Z' }],
    });
    expect(calls).toContain('synchronize');
    expect(polls).toBe(0);
    expect(result.finished).toBe(false);
    expect(result.waitedMs).toBe(0);
  });

  it('never waits past the cap, whatever is asked', () => {
    const { result } = run({ waitSeconds: 600 }, {
      before: '2026-10-29T11:00:00Z',
      polls: [{ syncing: true, last: '2026-10-29T11:00:00Z' }],
    });
    expect(result.waitedMs).toBe(50_000);
  });

  it('reports the sync error of a finished sync as a failure', () => {
    const { result } = run({}, {
      before: '2026-10-29T11:00:00Z',
      error: 'The server could not be reached.',
      polls: [{ syncing: false, last: '2026-10-29T12:00:01Z' }],
    });
    expect(result.success).toBe(false);
    expect(result.finished).toBe(true);
    expect(result.error).toBe('The server could not be reached.');
  });

  it('ignores an old sync error while the new sync has not finished', () => {
    const { result } = run({ waitSeconds: 1 }, {
      before: '2026-10-29T11:00:00Z',
      error: 'stale',
      polls: [{ syncing: true, last: '2026-10-29T11:00:00Z' }],
    });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('turns an exception from OmniFocus into an error result', () => {
    const Application = () => { throw new Error('Application can’t be found.'); };
    const out = new Function('Application', 'delay', `return ${generateScript({})}`)(Application, () => {});
    expect(JSON.parse(out)).toEqual({ success: false, error: 'Error: Application can’t be found.' });
  });
});
