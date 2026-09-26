import { describe, it, expect } from 'vitest';
import {
  reviewIntervalScript,
  describeReviewInterval,
  ReviewIntervalSpecError,
  type ReviewIntervalSpec,
} from '../reviewInterval.js';
import { _testExports } from '../../tools/primitives/queryOmnifocus.js';

/**
 * A fake of the slice of OmniJS the script touches, modelled on what was
 * observed live: the getter returns a COPY, the setter only accepts a
 * ReviewInterval, and a unit OmniFocus doesn't recognize silently resets the
 * value rather than throwing.
 */
function runIntervalScript(spec: ReviewIntervalSpec, opts: { isProject?: boolean; singularOnly?: boolean } = {}) {
  const script = reviewIntervalScript('foundItem', spec);
  const m = script.match(/evaluate javascript "(.*)"\)$/m);
  if (!m) throw new Error('no evaluate javascript call in:\n' + script);
  const js = m[1].replace('" & _reviewId & "', 'ROOT');

  class ReviewInterval {
    constructor(public steps: number, public unit: string) {}
  }
  let stored = new ReviewInterval(1, 'weeks');
  const valid = opts.singularOnly ? ['day', 'week', 'month', 'year'] : ['days', 'weeks', 'months', 'years'];
  const project = {
    get reviewInterval() { return new ReviewInterval(stored.steps, stored.unit); },
    set reviewInterval(v: any) {
      if (!(v instanceof ReviewInterval)) throw new Error('requires a Project.ReviewInterval');
      stored = valid.includes(v.unit) ? new ReviewInterval(v.steps, v.unit) : new ReviewInterval(1, stored.unit);
    },
  };
  const root = { project: opts.isProject === false ? null : project };
  const Task = { byIdentifier: (id: string) => (id === 'ROOT' ? root : null) };
  const result = new Function('Task', `return ${js}`)(Task);
  return { result, stored };
}

describe('reviewIntervalScript (#139)', () => {
  it.each([
    [{ steps: 2, unit: 'week' }, 2, 'weeks'],
    [{ steps: 1, unit: 'month' }, 1, 'months'],
    [{ steps: 10, unit: 'day' }, 10, 'days'],
    [{ steps: 1, unit: 'year' }, 1, 'years'],
  ] as const)('writes %o as the plural OmniJS unit', (spec, steps, unit) => {
    const { stored } = runIntervalScript(spec as ReviewIntervalSpec);
    expect(stored.steps).toBe(steps);
    expect(stored.unit).toBe(unit);
  });

  it('re-assigns the mutated copy (mutating the getter result alone does nothing)', () => {
    // The fake's getter returns a fresh copy each time, like OmniFocus; the
    // value only lands if the script assigns it back.
    expect(runIntervalScript({ steps: 3, unit: 'month' }).stored.steps).toBe(3);
  });

  it('fails loudly when OmniFocus stores something other than what was asked', () => {
    expect(() => runIntervalScript({ steps: 2, unit: 'week' }, { singularOnly: true })).toThrow(
      /did not read back as written/
    );
  });

  it('refuses an id that is not a project', () => {
    expect(() => runIntervalScript({ steps: 2, unit: 'week' }, { isProject: false })).toThrow(/project not found/);
  });

  it.each([
    [{ steps: 0, unit: 'week' }],
    [{ steps: 1.5, unit: 'week' }],
    [{ steps: 2, unit: 'fortnight' }],
  ])('rejects malformed spec %o before any script is built', spec => {
    expect(() => reviewIntervalScript('x', spec as any)).toThrow(ReviewIntervalSpecError);
  });

  it('keeps the embedded JS free of double quotes and backslashes', () => {
    const js = reviewIntervalScript('x', { steps: 2, unit: 'week' })
      .match(/evaluate javascript "(.*)"\)$/m)![1]
      .replace('" & _reviewId & "', '');
    expect(js).not.toMatch(/["\\]/);
  });
});

describe('review interval round-trip with query_omnifocus', () => {
  // Pull the formatter query_omnifocus actually ships and run it on the
  // {steps, unit} object OmniFocus returns.
  const script = _testExports.generateQueryScript({ entity: 'projects', fields: ['reviewInterval'] });
  const src = script.match(/function formatReviewInterval\(ri\) \{[\s\S]*?\n\s*\}\n/)![0];
  const format = new Function(`${src}; return formatReviewInterval;`)() as (ri: unknown) => string | null;

  it.each([
    [{ steps: 1, unit: 'week' }],
    [{ steps: 2, unit: 'week' }],
    [{ steps: 1, unit: 'day' }],
    [{ steps: 6, unit: 'month' }],
    [{ steps: 1, unit: 'year' }],
  ] as const)('%o reads back as describeReviewInterval says', spec => {
    const omni = { steps: spec.steps, unit: spec.unit + 's' };
    expect(format(omni)).toBe(describeReviewInterval(spec as ReviewIntervalSpec));
  });

  it('renders the live shape rather than null (the old formatter read fields that do not exist)', () => {
    expect(format({ steps: 2, unit: 'weeks' })).toBe('2 weeks');
    expect(format(null)).toBeNull();
  });
});
