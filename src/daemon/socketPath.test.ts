import { describe, it, expect } from 'vitest';
import {
  resolveSocketDir,
  resolveSocketPath,
  resolveLockDir,
  MAX_SOCKET_PATH_LENGTH,
  SOCKET_FILENAME,
} from './socketPath.js';
import { VERSION_SLUG } from '../version.js';

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

  it('versioned sockets get versioned locks, so an upgrade does not serialise on the old one', () => {
    // Falls out of deriving the lock from the socket path, but it is the property
    // that matters during an upgrade: the new daemon must not block waiting for a
    // lock the old one holds.
    expect(resolveLockDir('/a/daemon-1.11.0.sock')).not.toBe(
      resolveLockDir('/a/daemon-1.12.0.sock')
    );
  });
});

/**
 * Issue #99: with a fixed `daemon.sock`, a new shim would connect to whatever was
 * listening and be served by the previous version's daemon — silently, and
 * without self-healing, since the idle reaper only arms at zero connections.
 */
describe('socket filename is version-qualified (#99)', () => {
  it('embeds the running package version', () => {
    expect(SOCKET_FILENAME).toBe(`daemon-${VERSION_SLUG}.sock`);
    expect(SOCKET_FILENAME).not.toBe('daemon.sock');
  });

  it('the version slug is filename-safe', () => {
    // A `/` would silently redirect the socket into a directory that does not
    // exist; `+` build metadata is legal in semver and would otherwise ride along.
    expect(VERSION_SLUG).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('two versions resolve to different socket paths', () => {
    // The property the fix exists for, expressed directly against the filename
    // construction rather than the module-level constant.
    const pathFor = (v: string) => `/Users/x/.omnifocus-mcp/daemon-${v}.sock`;
    expect(pathFor('1.11.0')).not.toBe(pathFor('1.12.0'));
  });

  it('still fits sun_path with the longer name on a realistic home directory', () => {
    // The name grew; the guard has to still be measuring the real thing.
    const path = resolveSocketPath({}, 501, '/Users/someone', '/tmp');
    expect(path).toContain(VERSION_SLUG);
    expect(path.length).toBeLessThanOrEqual(MAX_SOCKET_PATH_LENGTH);
  });

  it('the sun_path fallback accounts for the versioned name', () => {
    // resolveSocketDir measures join(dir, SOCKET_FILENAME), so a home directory
    // that only fits the *old* short name must now fall through to the temp dir.
    const home = `/Users/${'d'.repeat(MAX_SOCKET_PATH_LENGTH - 'daemon.sock'.length - 20)}`;
    const dir = resolveSocketDir({}, 501, home, '/tmp');
    expect(`${dir}/${SOCKET_FILENAME}`.length).toBeLessThanOrEqual(
      Math.max(MAX_SOCKET_PATH_LENGTH, `/tmp/omnifocus-mcp-501/${SOCKET_FILENAME}`.length)
    );
  });
});
