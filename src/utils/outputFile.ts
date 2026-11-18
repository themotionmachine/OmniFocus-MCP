import { closeSync, constants, fstatSync, ftruncateSync, lstatSync, openSync, realpathSync, writeSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, isAbsolute, join, sep } from 'path';

/**
 * Write a tool result to a file instead of returning it inline.
 *
 * The server runs as the user, and the path comes from an agent's tool call,
 * so a prompt-injected call must not be able to write anywhere it likes. Writes
 * are confined to the temp directories (os.tmpdir(), /tmp, /private/tmp),
 * compared by real path so the macOS /tmp -> /private/tmp symlink is accepted
 * while `..` and symlinked-parent escapes are refused. The final component is
 * opened with O_NOFOLLOW so a planted symlink can't redirect the write.
 *
 * Returns the resolved path written. Throws with a readable message otherwise.
 */
export function writeOutputFile(path: string, text: string): string {
  if (!isAbsolute(path)) {
    throw new Error(`outputFile must be an absolute path, got "${path}"`);
  }

  const parent = dirname(path);
  const name = basename(path);
  if (name === '' || name === '.' || name === '..') {
    throw new Error(`outputFile must name a file, got "${path}"`);
  }

  let realParent: string;
  try {
    realParent = realpathSync(parent);
  } catch {
    throw new Error(`outputFile's directory does not exist: ${parent}`);
  }

  const allowed = allowedRoots();
  const inside = allowed.some(root => realParent === root || realParent.startsWith(root + sep));
  if (!inside) {
    throw new Error(`outputFile must be inside a temp directory (${allowed.join(', ')}); ${parent} resolves to ${realParent}`);
  }

  const target = join(realParent, name);
  try {
    if (lstatSync(target).isSymbolicLink()) {
      throw new Error(`outputFile is a symlink; refusing to follow it: ${target}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  // O_NOFOLLOW closes the race between the lstat above and the open.
  // No O_TRUNC here: truncate only after confirming it's a regular file.
  const fd = openSync(target, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
  try {
    if (!fstatSync(fd).isFile()) {
      throw new Error(`outputFile is not a regular file: ${target}`);
    }
    ftruncateSync(fd, 0);
    writeSync(fd, text, 0, 'utf8');
  } finally {
    closeSync(fd);
  }
  return target;
}

function allowedRoots(): string[] {
  const roots = new Set<string>();
  for (const candidate of [tmpdir(), '/tmp', '/private/tmp']) {
    try {
      roots.add(realpathSync(candidate));
    } catch {
      // A root that doesn't exist on this system simply isn't allowed.
    }
  }
  return [...roots];
}
