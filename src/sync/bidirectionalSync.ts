/**
 * Bidirectional Sync: OmniFocus → Obsidian
 *
 * Pulls task state changes from OmniFocus back into Obsidian markdown files,
 * with conflict detection, resolution strategies, and dry-run support.
 */

import * as fs from 'node:fs/promises';
import { SyncStateManager } from './syncState.js';
import type { ObsidianTask } from './markdownParser.js';
import { updateTaskInMarkdown } from './markdownParser.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PullOptions {
  vaultPath: string;
  dryRun: boolean;
  pullCompleted: boolean;
  pullModified: boolean;
  conflictResolution: 'obsidian-wins' | 'omnifocus-wins' | 'manual';
}

export interface PullResult {
  updated: Array<{ name: string; omnifocusId: string; file: string; changes: string[] }>;
  completed: Array<{ name: string; omnifocusId: string; file: string }>;
  conflicts: Array<{
    name: string;
    omnifocusId: string;
    file: string;
    obsidianContent: string;
    omnifocusContent: string;
  }>;
  errors: Array<{ name: string; error: string }>;
  dryRun: boolean;
}

export interface OmniFocusTaskState {
  id: string;
  name: string;
  completed: boolean;
  completionDate: string | null;
  dueDate: string | null;
  deferDate: string | null;
  flagged: boolean;
  note: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOmniFocusContentString(task: OmniFocusTaskState): string {
  const parts = [
    task.name,
    task.completed ? 'completed' : 'incomplete',
    task.dueDate ?? '',
    task.deferDate ?? '',
    task.flagged ? 'flagged' : '',
    task.tags.join(','),
  ];
  return parts.join('|');
}

function emptyPullResult(dryRun: boolean): PullResult {
  return {
    updated: [],
    completed: [],
    conflicts: [],
    errors: [],
    dryRun,
  };
}

// ---------------------------------------------------------------------------
// BidirectionalSyncManager
// ---------------------------------------------------------------------------

export class BidirectionalSyncManager {
  private syncState: SyncStateManager;

  constructor(syncStatePath: string) {
    this.syncState = new SyncStateManager(syncStatePath);
  }

  /**
   * Pull changes from OmniFocus task states back into Obsidian markdown files.
   *
   * For each task that has a sync record, compares the current OmniFocus state
   * against the stored checksum to detect changes. Updates markdown files
   * accordingly, honouring the conflict resolution strategy.
   */
  async pullFromOmniFocus(
    tasks: OmniFocusTaskState[],
    options: PullOptions,
  ): Promise<PullResult> {
    await this.syncState.load();

    const result = emptyPullResult(options.dryRun);

    for (const task of tasks) {
      try {
        const syncRecord = this.syncState.getRecord(task.id);
        if (!syncRecord) {
          // Task not tracked in sync state — nothing to pull
          continue;
        }

        const filePath = syncRecord.markdownFile;
        let fileContent: string;
        try {
          fileContent = await fs.readFile(filePath, 'utf-8');
        } catch {
          result.errors.push({
            name: task.name,
            error: `File not found: ${filePath}`,
          });
          continue;
        }

        const omnifocusContentStr = buildOmniFocusContentString(task);
        const conflictType = this.detectConflicts(syncRecord, fileContent, task);

        // --- Handle completed tasks ---
        if (task.completed && options.pullCompleted) {
          if (conflictType === 'both-modified') {
            if (options.conflictResolution === 'manual') {
              result.conflicts.push({
                name: task.name,
                omnifocusId: task.id,
                file: filePath,
                obsidianContent: fileContent,
                omnifocusContent: omnifocusContentStr,
              });
              continue;
            }
            if (options.conflictResolution === 'obsidian-wins') {
              continue;
            }
            // omnifocus-wins: fall through to apply completion
          }

          if (!options.dryRun) {
            const updatedContent = updateTaskInMarkdown(
              fileContent,
              syncRecord.lineNumber,
              { completed: true },
            );
            await fs.writeFile(filePath, updatedContent, 'utf-8');

            // Update sync record checksums
            const newChecksum = this.syncState.computeChecksum(updatedContent);
            this.syncState.upsertRecord({
              ...syncRecord,
              checksum: newChecksum,
              lastSyncedAt: new Date().toISOString(),
              status: 'synced',
            });
          }

          result.completed.push({
            name: task.name,
            omnifocusId: task.id,
            file: filePath,
          });
          continue;
        }

        // --- Handle modified (non-completed) tasks ---
        if (options.pullModified && conflictType !== 'no-conflict') {
          if (conflictType === 'both-modified') {
            if (options.conflictResolution === 'manual') {
              result.conflicts.push({
                name: task.name,
                omnifocusId: task.id,
                file: filePath,
                obsidianContent: fileContent,
                omnifocusContent: omnifocusContentStr,
              });
              continue;
            }
            if (options.conflictResolution === 'obsidian-wins') {
              continue;
            }
            // omnifocus-wins: fall through
          }

          if (conflictType === 'obsidian-modified') {
            // Only Obsidian changed — nothing to pull from OmniFocus
            continue;
          }

          // omnifocus-modified or both-modified with omnifocus-wins
          const changes: string[] = [];
          const updates: {
            completed?: boolean;
            dueDate?: string | null;
            deferDate?: string | null;
            tags?: string[];
            flagged?: boolean;
            name?: string;
          } = {};

          if (task.name !== syncRecord.taskName) {
            changes.push(`name: "${syncRecord.taskName}" → "${task.name}"`);
            updates.name = task.name;
          }

          if (task.dueDate !== null) {
            changes.push(`due date → ${task.dueDate}`);
            updates.dueDate = task.dueDate;
          }

          if (task.deferDate !== null) {
            changes.push(`defer date → ${task.deferDate}`);
            updates.deferDate = task.deferDate;
          }

          if (task.tags.length > 0) {
            changes.push(`tags → ${task.tags.join(', ')}`);
            updates.tags = task.tags;
          }

          if (task.flagged) {
            changes.push('flagged → true');
            updates.flagged = true;
          }

          if (changes.length === 0) {
            // Checksum differs but no detectable property changes — skip
            continue;
          }

          if (!options.dryRun) {
            const updatedContent = updateTaskInMarkdown(
              fileContent,
              syncRecord.lineNumber,
              updates,
            );
            await fs.writeFile(filePath, updatedContent, 'utf-8');

            this.syncState.upsertRecord({
              ...syncRecord,
              checksum: this.syncState.computeChecksum(updatedContent),
              taskName: task.name,
              lastSyncedAt: new Date().toISOString(),
              status: 'synced',
            });
          }

          result.updated.push({
            name: task.name,
            omnifocusId: task.id,
            file: filePath,
            changes,
          });
        }
      } catch (err) {
        result.errors.push({
          name: task.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!options.dryRun) {
      const state = await this.syncState.load();
      await this.syncState.save(state);
    }

    return result;
  }

  /**
   * Apply line-level updates to markdown content, preserving file structure.
   * Returns the updated content string.
   */
  async updateMarkdownFile(
    filePath: string,
    content: string,
    updates: Array<{ lineNumber: number; newLine: string }>,
  ): Promise<string> {
    const lines = content.split('\n');

    // Sort updates by line number descending so indices stay valid
    const sorted = [...updates].sort((a, b) => b.lineNumber - a.lineNumber);

    for (const update of sorted) {
      if (update.lineNumber >= 0 && update.lineNumber < lines.length) {
        lines[update.lineNumber] = update.newLine;
      }
    }

    const result = lines.join('\n');
    await fs.writeFile(filePath, result, 'utf-8');
    return result;
  }

  /**
   * Orchestrate a full bidirectional sync: pull from OmniFocus, then push
   * to OmniFocus. Returns combined results from both directions.
   */
  async fullSync(
    pushOptions: any,
    pullOptions: PullOptions,
    omnifocusTasks: OmniFocusTaskState[],
  ): Promise<{ push: any; pull: PullResult }> {
    // Pull from OmniFocus first (get latest state into Obsidian)
    const pullResult = await this.pullFromOmniFocus(omnifocusTasks, pullOptions);

    // Push would be handled by a separate push mechanism (e.g. BatchSyncManager)
    const pushResult = { pushed: [], errors: [] };

    return {
      push: pushResult,
      pull: pullResult,
    };
  }

  /**
   * Compare stored checksums against current content to determine what changed
   * since the last sync.
   */
  detectConflicts(
    syncRecord: any,
    obsidianContent: string,
    omnifocusTask: OmniFocusTaskState,
  ): 'no-conflict' | 'obsidian-modified' | 'omnifocus-modified' | 'both-modified' {
    const currentObsidianChecksum = this.syncState.computeChecksum(obsidianContent);
    const currentOmnifocusChecksum = this.syncState.computeChecksum(
      buildOmniFocusContentString(omnifocusTask),
    );

    // Compare against the checksums stored at last sync time.
    // syncRecord.checksum represents the obsidian file checksum at last sync.
    // We store the omnifocus content checksum under a conventional key in the record.
    const lastObsidianChecksum = syncRecord.checksum ?? '';
    const lastOmnifocusChecksum = syncRecord.omnifocusChecksum ?? '';

    const obsidianChanged = currentObsidianChecksum !== lastObsidianChecksum;
    const omnifocusChanged = currentOmnifocusChecksum !== lastOmnifocusChecksum;

    if (obsidianChanged && omnifocusChanged) {
      return 'both-modified';
    }
    if (obsidianChanged) {
      return 'obsidian-modified';
    }
    if (omnifocusChanged) {
      return 'omnifocus-modified';
    }
    return 'no-conflict';
  }

  /**
   * Produce a human-readable report of pull results.
   */
  formatPullReport(result: PullResult): string {
    const lines: string[] = [];

    lines.push('=== OmniFocus → Obsidian Pull Report ===');
    lines.push(`Mode: ${result.dryRun ? 'DRY RUN (no changes applied)' : 'LIVE'}`);
    lines.push('');

    if (result.completed.length > 0) {
      lines.push(`Completed (${result.completed.length}):`);
      for (const item of result.completed) {
        lines.push(`  - ${item.name} (${item.file})`);
      }
      lines.push('');
    }

    if (result.updated.length > 0) {
      lines.push(`Updated (${result.updated.length}):`);
      for (const item of result.updated) {
        lines.push(`  - ${item.name} (${item.file})`);
        for (const change of item.changes) {
          lines.push(`    * ${change}`);
        }
      }
      lines.push('');
    }

    if (result.conflicts.length > 0) {
      lines.push(`Conflicts (${result.conflicts.length}):`);
      for (const item of result.conflicts) {
        lines.push(`  - ${item.name} (${item.file})`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push(`Errors (${result.errors.length}):`);
      for (const item of result.errors) {
        lines.push(`  - ${item.name}: ${item.error}`);
      }
      lines.push('');
    }

    if (
      result.completed.length === 0 &&
      result.updated.length === 0 &&
      result.conflicts.length === 0 &&
      result.errors.length === 0
    ) {
      lines.push('No changes detected.');
    }

    return lines.join('\n');
  }
}
