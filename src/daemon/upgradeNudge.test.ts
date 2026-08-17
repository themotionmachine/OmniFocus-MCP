import { describe, it, expect } from 'vitest';
import {
  parseSocketVersion,
  compareVersions,
  upgradeNoticeText,
  findNewerServingVersion,
  withUpgradeNudge,
} from './upgradeNudge.js';

describe('parseSocketVersion (#113)', () => {
  it('extracts a clean release version', () => {
    expect(parseSocketVersion('daemon-1.13.0.sock')).toBe('1.13.0');
  });

  it('rejects everything else', () => {
    // Prereleases, the pre-#99 fixed name, locks, and logs must not participate.
    for (const name of [
      'daemon.sock',
      'daemon-1.13.0-beta.1.sock',
      'daemon-1.13.0.sock.lock',
      'daemon.log',
      'daemon-1.13.sock',
    ]) {
      expect(parseSocketVersion(name), name).toBeNull();
    }
  });
});

describe('compareVersions (#113)', () => {
  it('compares numerically, not lexically', () => {
    // The lexical trap: "1.9.0" > "1.13.0" as strings.
    expect(compareVersions('1.13.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.13.0', '1.13.0')).toBe(0);
    expect(compareVersions('1.13.0', '1.13.1')).toBeLessThan(0);
  });
});

describe('findNewerServingVersion (#113)', () => {
  const base = {
    currentVersion: '1.13.0',
    socketDir: '/sockets',
  };

  it('returns the newest strictly-newer live version', async () => {
    const result = await findNewerServingVersion({
      ...base,
      listDir: () => ['daemon-1.12.0.sock', 'daemon-1.13.0.sock', 'daemon-1.14.0.sock', 'daemon-2.0.0.sock'],
      probe: async () => true,
    });
    expect(result).toBe('2.0.0');
  });

  it('skips dead sockets — a crash-orphaned file must not nag forever', async () => {
    const probed: string[] = [];
    const result = await findNewerServingVersion({
      ...base,
      listDir: () => ['daemon-1.14.0.sock', 'daemon-2.0.0.sock'],
      probe: async path => {
        probed.push(path);
        return path.includes('1.14.0');
      },
    });
    expect(result).toBe('1.14.0');
    // Newest-first: the dead 2.0.0 was tried before falling back.
    expect(probed).toEqual(['/sockets/daemon-2.0.0.sock', '/sockets/daemon-1.14.0.sock']);
  });

  it('returns null when only own and older versions are serving', async () => {
    const result = await findNewerServingVersion({
      ...base,
      listDir: () => ['daemon-1.12.0.sock', 'daemon-1.13.0.sock'],
      probe: async () => true,
    });
    expect(result).toBeNull();
  });

  it('returns null when the socket directory does not exist', async () => {
    const result = await findNewerServingVersion({
      ...base,
      listDir: () => {
        throw new Error('ENOENT');
      },
      probe: async () => true,
    });
    expect(result).toBeNull();
  });
});

describe('withUpgradeNudge (#113)', () => {
  const toolResult = () => ({ content: [{ type: 'text' as const, text: '✅ done' }] });

  it('appends the notice as its own content block while a newer daemon serves', async () => {
    const wrapped = withUpgradeNudge(async () => toolResult(), async () =>
      upgradeNoticeText('1.13.0', '1.14.0')
    );
    const result = await wrapped({}, {});
    expect(result.content).toHaveLength(2);
    expect(result.content[1].text).toContain('1.14.0 is serving');
    expect(result.content[1].text).toContain('Reconnect the MCP server');
  });

  it('leaves results untouched when no newer daemon is serving', async () => {
    const wrapped = withUpgradeNudge(async () => toolResult(), async () => null);
    const result = await wrapped({}, {});
    expect(result.content).toHaveLength(1);
  });

  it('nudges error results too — a stale client debugging is exactly who should hear it', async () => {
    const wrapped = withUpgradeNudge(
      async () => ({ content: [{ type: 'text' as const, text: 'Failed' }], isError: true }),
      async () => upgradeNoticeText('1.13.0', '1.14.0')
    );
    const result = await wrapped({}, {});
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(2);
  });

  it('never lets a nudge failure break the tool result', async () => {
    const wrapped = withUpgradeNudge(async () => toolResult(), async () => {
      throw new Error('probe exploded');
    });
    const result = await wrapped({}, {});
    expect(result.content).toHaveLength(1);
  });
});
