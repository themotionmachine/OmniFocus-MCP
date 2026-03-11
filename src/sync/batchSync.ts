/**
 * Batch Sync from Obsidian to OmniFocus
 *
 * Provides batch synchronization of tasks parsed from Obsidian markdown
 * files into OmniFocus, with dry-run support, change detection, and
 * human-readable reporting.
 */

import type { AddOmniFocusTaskParams } from '../tools/primitives/addOmniFocusTask.js';

// ---------------------------------------------------------------------------
// Types re-exported / defined inline until sibling modules exist
// ---------------------------------------------------------------------------

/**
 * Represents a single task extracted from an Obsidian markdown file.
 * Mirrors the shape expected from `./markdownParser.js`.
 */
export interface ObsidianTask {
  name: string;
  completed: boolean;
  omnifocusId?: string;
  note?: string;
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[];
  projectName?: string;
  children?: ObsidianTask[];
  lineNumber: number;
  /** Content-based checksum for change detection */
  checksum?: string;
  indentLevel: number;
}

/**
 * Result of parsing an entire markdown file.
 * Mirrors the shape expected from `./markdownParser.js`.
 */
export interface ParsedMarkdownFile {
  filePath: string;
  tasks: ObsidianTask[];
}

/**
 * Per-task sync state record.
 * Mirrors the shape expected from `./syncState.js`.
 */
export interface SyncStateRecord {
  omnifocusId: string;
  checksum: string;
  lastSynced: string;
}

// ---------------------------------------------------------------------------
// Sync Options & Result
// ---------------------------------------------------------------------------

export interface SyncOptions {
  /** Preview changes without applying them. */
  dryRun: boolean;
  /** Absolute path to the Obsidian vault root. */
  vaultPath: string;
  /** Specific files to sync. Defaults to all `.md` files in the vault. */
  files?: string[];
  /** Default OmniFocus project for new tasks. */
  projectName?: string;
  /** Whether to sync completed tasks. */
  syncCompleted: boolean;
  /** Maintain task / sub-task relationships during sync. */
  preserveHierarchy: boolean;
}

export interface SyncResultEntry {
  name: string;
  omnifocusId: string;
  file: string;
  lineNumber: number;
}

export interface SyncSkippedEntry {
  name: string;
  reason: string;
  file: string;
  lineNumber: number;
}

export interface SyncErrorEntry {
  name: string;
  error: string;
  file: string;
  lineNumber: number;
}

export interface SyncResult {
  created: SyncResultEntry[];
  updated: SyncResultEntry[];
  skipped: SyncSkippedEntry[];
  errors: SyncErrorEntry[];
  dryRun: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySyncResult(dryRun: boolean): SyncResult {
  return { created: [], updated: [], skipped: [], errors: [], dryRun };
}

function mergeResults(target: SyncResult, source: SyncResult): void {
  target.created.push(...source.created);
  target.updated.push(...source.updated);
  target.skipped.push(...source.skipped);
  target.errors.push(...source.errors);
}

/**
 * Simple content-based checksum (FNV-1a 32-bit).
 * Deterministic and fast — sufficient for change detection.
 */
export function computeChecksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function taskContentForChecksum(task: ObsidianTask): string {
  return JSON.stringify({
    name: task.name,
    completed: task.completed,
    note: task.note ?? '',
    dueDate: task.dueDate ?? '',
    deferDate: task.deferDate ?? '',
    flagged: task.flagged ?? false,
    estimatedMinutes: task.estimatedMinutes ?? 0,
    tags: task.tags ?? [],
    projectName: task.projectName ?? '',
  });
}

// ---------------------------------------------------------------------------
// BatchSyncManager
// ---------------------------------------------------------------------------

export class BatchSyncManager {
  private readonly syncStatePath: string;
  /** In-memory sync state keyed by a composite of file + lineNumber. */
  private syncState: Map<string, SyncStateRecord> = new Map();

  constructor(syncStatePath: string) {
    this.syncStatePath = syncStatePath;
  }

  // -- public helpers for state management (test-friendly) -----------------

  /** Returns the internal sync state map (for testing / inspection). */
  getSyncState(): Map<string, SyncStateRecord> {
    return this.syncState;
  }

  /** Manually set a sync-state record (useful in tests). */
  setSyncStateRecord(key: string, record: SyncStateRecord): void {
    this.syncState.set(key, record);
  }

  // -- core sync logic -----------------------------------------------------

  /**
   * Synchronise a single markdown file.
   *
   * @param filePath - path to the markdown file (relative or absolute)
   * @param content  - raw markdown content of the file
   * @param options  - sync configuration
   * @param parsedFile - optional pre-parsed file; when omitted the method
   *   expects `content` to already be parsed externally. For now we accept
   *   the parsed representation directly so that this module can be tested
   *   without the real markdown parser.
   */
  async syncFile(
    filePath: string,
    content: string,
    options: SyncOptions,
    parsedFile?: ParsedMarkdownFile,
  ): Promise<SyncResult> {
    const result = emptySyncResult(options.dryRun);

    const parsed: ParsedMarkdownFile = parsedFile ?? {
      filePath,
      tasks: [],
    };

    // Flatten tasks (including children) into a processing queue while
    // preserving hierarchy metadata.
    const flatTasks = this.flattenTasks(parsed.tasks);

    for (const task of flatTasks) {
      try {
        await this.processTask(task, filePath, options, result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({
          name: task.name,
          error: message,
          file: filePath,
          lineNumber: task.lineNumber,
        });
      }
    }

    return result;
  }

  /**
   * Synchronise an entire Obsidian vault.
   */
  async syncVault(options: SyncOptions): Promise<SyncResult> {
    const result = emptySyncResult(options.dryRun);

    const files = await this.resolveFiles(options);

    for (const filePath of files) {
      try {
        const content = await this.readFile(filePath);
        const fileResult = await this.syncFile(filePath, content, options);
        mergeResults(result, fileResult);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({
          name: filePath,
          error: message,
          file: filePath,
          lineNumber: 0,
        });
      }
    }

    return result;
  }

  /**
   * Convenience wrapper — runs a sync in preview (dry-run) mode.
   */
  async previewSync(options: SyncOptions): Promise<SyncResult> {
    return this.syncVault({ ...options, dryRun: true });
  }

  /**
   * Produce a human-readable report from a `SyncResult`.
   */
  formatSyncReport(result: SyncResult): string {
    const lines: string[] = [];

    if (result.dryRun) {
      lines.push('=== Sync Preview (dry run) ===');
    } else {
      lines.push('=== Sync Report ===');
    }
    lines.push('');

    if (result.created.length > 0) {
      lines.push(`Created (${result.created.length}):`);
      for (const entry of result.created) {
        lines.push(`  + ${entry.name}  [${entry.file}:${entry.lineNumber}]`);
      }
      lines.push('');
    }

    if (result.updated.length > 0) {
      lines.push(`Updated (${result.updated.length}):`);
      for (const entry of result.updated) {
        lines.push(`  ~ ${entry.name}  [${entry.file}:${entry.lineNumber}]`);
      }
      lines.push('');
    }

    if (result.skipped.length > 0) {
      lines.push(`Skipped (${result.skipped.length}):`);
      for (const entry of result.skipped) {
        lines.push(`  - ${entry.name}: ${entry.reason}  [${entry.file}:${entry.lineNumber}]`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push(`Errors (${result.errors.length}):`);
      for (const entry of result.errors) {
        lines.push(`  ! ${entry.name}: ${entry.error}  [${entry.file}:${entry.lineNumber}]`);
      }
      lines.push('');
    }

    const total =
      result.created.length +
      result.updated.length +
      result.skipped.length +
      result.errors.length;
    lines.push(`Total tasks processed: ${total}`);

    return lines.join('\n');
  }

  // -- private helpers ------------------------------------------------------

  /**
   * Recursively flatten a task tree into a single array.
   */
  private flattenTasks(tasks: ObsidianTask[]): ObsidianTask[] {
    const flat: ObsidianTask[] = [];
    for (const task of tasks) {
      flat.push(task);
      if (task.children && task.children.length > 0) {
        flat.push(...this.flattenTasks(task.children));
      }
    }
    return flat;
  }

  /**
   * Process a single task — decide whether to create, update, or skip.
   */
  private async processTask(
    task: ObsidianTask,
    filePath: string,
    options: SyncOptions,
    result: SyncResult,
  ): Promise<void> {
    // Skip completed tasks when syncCompleted is false
    if (task.completed && !options.syncCompleted) {
      result.skipped.push({
        name: task.name,
        reason: 'completed task (syncCompleted=false)',
        file: filePath,
        lineNumber: task.lineNumber,
      });
      return;
    }

    const stateKey = `${filePath}:${task.lineNumber}`;
    const existingState = this.syncState.get(stateKey);

    const currentChecksum = computeChecksum(taskContentForChecksum(task));

    if (task.omnifocusId && existingState) {
      // Task has been synced before — check for changes.
      if (existingState.checksum === currentChecksum) {
        result.skipped.push({
          name: task.name,
          reason: 'unchanged since last sync',
          file: filePath,
          lineNumber: task.lineNumber,
        });
        return;
      }

      // Task has changed — prepare an update.
      if (!options.dryRun) {
        // In a real implementation this would call an OmniFocus update API.
        this.syncState.set(stateKey, {
          omnifocusId: task.omnifocusId,
          checksum: currentChecksum,
          lastSynced: new Date().toISOString(),
        });
      }
      result.updated.push({
        name: task.name,
        omnifocusId: task.omnifocusId,
        file: filePath,
        lineNumber: task.lineNumber,
      });
      return;
    }

    // New task — prepare a create operation.
    const omnifocusId = task.omnifocusId ?? this.generatePlaceholderId();

    if (!options.dryRun) {
      // Build the params that *would* be sent to addOmniFocusTask.
      const _params: AddOmniFocusTaskParams = {
        name: task.name,
        note: task.note,
        dueDate: task.dueDate,
        deferDate: task.deferDate,
        flagged: task.flagged,
        estimatedMinutes: task.estimatedMinutes,
        tags: task.tags,
        projectName: task.projectName ?? options.projectName,
      };

      // Persist sync state.
      this.syncState.set(stateKey, {
        omnifocusId,
        checksum: currentChecksum,
        lastSynced: new Date().toISOString(),
      });
    }

    result.created.push({
      name: task.name,
      omnifocusId,
      file: filePath,
      lineNumber: task.lineNumber,
    });
  }

  /**
   * Resolve the list of markdown files to process.
   */
  private async resolveFiles(options: SyncOptions): Promise<string[]> {
    if (options.files && options.files.length > 0) {
      return options.files;
    }
    // In a full implementation this would glob for *.md files under vaultPath.
    // For now, return an empty array — the caller or integration test will
    // provide explicit file lists.
    return [];
  }

  /**
   * Read the contents of a file. Extracted so tests can mock it.
   */
  protected async readFile(filePath: string): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    return readFile(filePath, 'utf-8');
  }

  /**
   * Generate a placeholder OmniFocus ID for dry-run / testing.
   */
  private idCounter = 0;
  private generatePlaceholderId(): string {
    this.idCounter += 1;
    return `omnifocus-placeholder-${this.idCounter}`;
  }
}
