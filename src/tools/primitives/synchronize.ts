import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runOsascriptFile } from '../../utils/scriptExecution.js';
import { JXA_FORMAT_DATE_SOURCE } from '../../utils/dateSerialization.js';

export interface SynchronizeParams {
  waitSeconds?: number; // How long to wait for the sync to finish; 0 = start it and return
}

export interface SynchronizeResult {
  success: boolean;
  finished?: boolean;
  lastSyncDate?: string | null;
  waitedMs?: number;
  error?: string;
}

export const DEFAULT_WAIT_SECONDS = 30;
export const MAX_WAIT_SECONDS = 50; // stays under the 60 s osascript timeout

/**
 * Generate the JXA that syncs the default document.
 *
 * OmniFocus's `synchronize` command only *starts* a sync and returns at once,
 * so a caller that reads the database straight after it still sees the old
 * data. The script therefore waits, polling the document's `syncing` flag and
 * `last sync date`, until a sync that began after the request has finished.
 * `last sync date` has one-second resolution, so a sync seen in progress and
 * then over also counts as finished, even within the same second.
 */
export function generateScript(params: SynchronizeParams = {}): string {
  const wait = Math.min(Math.max(params.waitSeconds ?? DEFAULT_WAIT_SECONDS, 0), MAX_WAIT_SECONDS);
  return `(() => {
  ${JXA_FORMAT_DATE_SOURCE}
  try {
    const doc = Application('OmniFocus').defaultDocument;
    const started = Date.now();
    const before = doc.lastSyncDate();
    doc.synchronize();
    const deadline = started + ${wait} * 1000;
    let sawSyncing = false, finished = false;
    while (${wait} > 0) {
      const syncing = doc.syncing();
      const last = doc.lastSyncDate();
      if (syncing) sawSyncing = true;
      else if (sawSyncing || (last && (!before || last.getTime() > before.getTime()))) { finished = true; break; }
      if (Date.now() >= deadline) break;
      delay(0.25);
    }
    const error = finished ? doc.lastSyncError() : null;
    return JSON.stringify({
      success: !error,
      finished: finished,
      lastSyncDate: formatDate(doc.lastSyncDate()),
      waitedMs: Date.now() - started,
      error: error || undefined
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: String(e) });
  }
})()`;
}

/**
 * Sync OmniFocus with its sync server, waiting (by default) until the sync
 * has finished so that a query made next sees changes from other devices.
 */
export async function synchronize(params: SynchronizeParams = {}): Promise<SynchronizeResult> {
  let tempFile: string | undefined;

  try {
    const wait = Math.min(Math.max(params.waitSeconds ?? DEFAULT_WAIT_SECONDS, 0), MAX_WAIT_SECONDS);
    tempFile = join(tmpdir(), `synchronize_${crypto.randomUUID()}.js`);
    writeFileSync(tempFile, generateScript(params), { encoding: 'utf8' });

    const { stdout, stderr } = await runOsascriptFile(tempFile, {
      language: 'JavaScript',
      timeoutMs: (wait + 10) * 1000,
    });

    try { unlinkSync(tempFile); } catch {}

    if (stderr) {
      console.error("JXA stderr:", stderr);
    }

    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error("Error parsing JXA result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    if (tempFile) {
      try { unlinkSync(tempFile); } catch {}
    }
    console.error("Error in synchronize:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in synchronize"
    };
  }
}
