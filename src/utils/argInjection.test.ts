import { describe, it, expect } from 'vitest';
import { quoteOmniJSArgs, _escapeContentForTest } from './scriptExecution.js';

// Simulates both layers: the argv prelude, then the JXA template literal that
// OmniFocus's evaluateJavascript receives. Evaluates in a sandboxed Function.
function roundTrip(args: string[]): { argv: string[]; injected: boolean } {
  const wrapped = `const argv = [${quoteOmniJSArgs(args)}]; return argv;`;
  const jxa = 'const s = `' + _escapeContentForTest(wrapped) + '`; return s;';
  const omniSource = new Function(jxa)() as string;
  const g: any = { injected: false };
  const argv = new Function('g', omniSource.replace('return argv;', 'return argv;'))(g);
  return { argv, injected: g.injected };
}

describe('OmniJS argv quoting', () => {
  it('does not let a double quote break out of the string (injection)', () => {
    const evil = 'Today"]; g.injected = true; //';
    const { argv, injected } = roundTrip([evil, '100']);
    expect(injected).toBe(false);
    expect(argv).toEqual([evil, '100']);
  });

  it('round-trips awkward characters unchanged', () => {
    const tricky = 'a\\b `c` ${d} "e" \'f\'\nnew line\ttab   ünïcode';
    expect(roundTrip([tricky, '5']).argv).toEqual([tricky, '5']);
  });
});
