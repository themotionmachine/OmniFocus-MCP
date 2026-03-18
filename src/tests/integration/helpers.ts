import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export const TEST_PREFIX = 'TEST:';

export async function execAppleScript(script: string): Promise<string> {
  const tempFile = join(tmpdir(), `test_omnifocus_${Date.now()}.applescript`);
  try {
    writeFileSync(tempFile, script);
    const { stdout } = await execAsync(`osascript "${tempFile}"`);
    return stdout.trim();
  } finally {
    try { unlinkSync(tempFile); } catch { /* ignore */ }
  }
}

export function assertTestPrefix(name: string): void {
  if (!name.startsWith(TEST_PREFIX)) {
    throw new Error(`Safety check failed: "${name}" does not start with "${TEST_PREFIX}"`);
  }
}

export async function assertOmniFocusRunning(): Promise<void> {
  try {
    const result = await execAppleScript('tell application "OmniFocus" to return "ok"');
    if (!result.includes('ok')) throw new Error('Unexpected response');
  } catch (error: any) {
    throw new Error(`OmniFocus is not running or not accessible. Integration tests require OmniFocus.\n${error.message}`);
  }
}

export async function createFolder(name: string): Promise<string> {
  assertTestPrefix(name);
  const escapedName = name.replace(/["\\]/g, '\\$&');
  const result = await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        set newFolder to make new folder with properties {name:"${escapedName}"}
        return id of newFolder as string
      end tell
    end tell
  `);
  return result;
}

export async function resolveItemName(id: string, type: 'task' | 'project' | 'tag' | 'folder'): Promise<string | null> {
  const escapedId = id.replace(/["\\]/g, '\\$&');
  const singular = type === 'task' ? 'flattened task' : type === 'project' ? 'flattened project' : type === 'tag' ? 'flattened tag' : 'flattened folder';
  try {
    const result = await execAppleScript(`
      tell application "OmniFocus"
        tell front document
          set foundItem to first ${singular} whose id is "${escapedId}"
          return name of foundItem
        end tell
      end tell
    `);
    return result || null;
  } catch {
    return null;
  }
}

export async function safeDeleteById(id: string, type: 'task' | 'project' | 'tag' | 'folder'): Promise<boolean> {
  const name = await resolveItemName(id, type);
  if (name === null) return false;
  assertTestPrefix(name);
  const escapedId = id.replace(/["\\]/g, '\\$&');
  const singular = type === 'task' ? 'flattened task' : type === 'project' ? 'flattened project' : type === 'tag' ? 'flattened tag' : 'flattened folder';
  await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        delete (first ${singular} whose id is "${escapedId}")
      end tell
    end tell
  `);
  return true;
}

export async function findItemsByPrefix(prefix: string, type: 'task' | 'project' | 'tag' | 'folder'): Promise<Array<{ id: string; name: string }>> {
  const escapedPrefix = prefix.replace(/["\\]/g, '\\$&');
  const collection = type === 'task' ? 'flattened tasks' : type === 'project' ? 'flattened projects' : type === 'tag' ? 'flattened tags' : 'flattened folders';
  const result = await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        set matches to {}
        repeat with anItem in ${collection}
          if name of anItem starts with "${escapedPrefix}" then
            set end of matches to (id of anItem as string) & "|||" & name of anItem
          end if
        end repeat
        set AppleScript's text item delimiters to "\\n"
        return matches as text
      end tell
    end tell
  `);
  if (!result) return [];
  return result.split('\n').filter(Boolean).map(line => {
    const [id, name] = line.split('|||');
    return { id, name };
  });
}
