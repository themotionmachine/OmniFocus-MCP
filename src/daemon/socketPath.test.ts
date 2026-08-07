import { describe, it, expect } from 'vitest';
import {
  resolveSocketDir,
  resolveSocketPath,
  resolveLockDir,
  MAX_SOCKET_PATH_LENGTH,
  SOCKET_FILENAME,
} from './socketPath.js';

describe('resolveSocketDir', () => {
  it('prefers XDG_RUNTIME_DIR when set', () => {
    expect(resolveSocketDir({ XDG_RUNTIME_DIR: '/run/user/501' }, 501, '/Users/x', '/tmp')).toBe(
      '/run/user/501/omnifocus-mcp'
    );
  });

  it('falls back to a dotdir in the home directory', () => {
    expect(resolveSocketDir({}, 501, '/Users/x', '/tmp')).toBe('/Users/x/.omnifocus-mcp');
  });

  it('falls back to the temp dir when the home path would blow sun_path', () => {
    // macOS caps sockaddr_un.sun_path near 104 bytes; bind() fails with a
    // confusing errno rather than anything mentioning length.
    const deepHome = `/Users/${'d'.repeat(MAX_SOCKET_PATH_LENGTH)}`;
    expect(resolveSocketDir({}, 501, deepHome, '/tmp')).toBe('/tmp/omnifocus-mcp-501');
  });

  it('qualifies the temp-dir fallback by uid', () => {
    // /tmp is world-writable and shared, so an unqualified name would let one
    // user squat the path another user expects to own.
    expect(resolveSocketDir({}, 501, '', '/tmp')).toBe('/tmp/omnifocus-mcp-501');
    expect(resolveSocketDir({}, 502, '', '/tmp')).toBe('/tmp/omnifocus-mcp-502');
  });

  it('still produces a path on a platform with no uid', () => {
    // Passing `undefined` would just re-trigger the parameter default, so the
    // only way to reach this branch is to take `process.getuid` away.
    const original = process.getuid;
    // @ts-expect-error simulating a platform that has no uids
    delete process.getuid;
    try {
      expect(resolveSocketDir({}, undefined, '', '/tmp')).toBe('/tmp/omnifocus-mcp-nouid');
    } finally {
      process.getuid = original;
    }
  });
});

describe('resolveSocketPath', () => {
  it('uses OMNIFOCUS_MCP_SOCKET verbatim, overriding everything', () => {
    expect(
      resolveSocketPath(
        { OMNIFOCUS_MCP_SOCKET: '/custom/of.sock', XDG_RUNTIME_DIR: '/run/user/501' },
        501,
        '/Users/x',
        '/tmp'
      )
    ).toBe('/custom/of.sock');
  });

  it('appends the socket filename to the resolved directory', () => {
    expect(resolveSocketPath({}, 501, '/Users/x', '/tmp')).toBe(
      `/Users/x/.omnifocus-mcp/${SOCKET_FILENAME}`
    );
  });

  it('keeps the default path within the sun_path limit', () => {
    const path = resolveSocketPath({}, 501, '/Users/someone', '/tmp');
    expect(path.length).toBeLessThanOrEqual(MAX_SOCKET_PATH_LENGTH);
  });
});

describe('resolveLockDir', () => {
  it('derives the lock from the socket so separate sockets never serialise', () => {
    expect(resolveLockDir('/a/daemon.sock')).toBe('/a/daemon.sock.lock');
    expect(resolveLockDir('/b/daemon.sock')).not.toBe(resolveLockDir('/a/daemon.sock'));
  });
});
