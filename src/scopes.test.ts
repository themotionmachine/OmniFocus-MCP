import { describe, it, expect } from 'vitest';
import { parseScopes, scopeKey, SCOPES } from './scopes.js';

describe('parseScopes', () => {
  it('enables every scope when unset, so existing setups are unchanged', () => {
    expect([...parseScopes(undefined)]).toEqual([...SCOPES]);
  });

  it('accepts a comma-separated list, ignoring case and spaces', () => {
    expect([...parseScopes(' Read , add ')]).toEqual(['read', 'add']);
  });

  it.each(['', ' , ', 'read-only', 'read,write', 'all'])('fails closed on %j', (raw) => {
    expect(() => parseScopes(raw)).toThrow(/OMNIFOCUS_MCP_SCOPES/);
  });
});

describe('scopeKey', () => {
  it('is empty for all scopes and canonical otherwise', () => {
    expect(scopeKey(parseScopes('modify,add,read'))).toBe('');
    expect(scopeKey(parseScopes('add,read'))).toBe('read-add');
    expect(scopeKey(parseScopes('read'))).toBe('read');
  });
});
