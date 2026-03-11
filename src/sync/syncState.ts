import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface SyncRecord {
  omnifocusId: string;
  markdownFile: string;
  lineNumber: number;
  taskName: string;
  lastSyncedAt: string;
  lastModifiedAt: string;
  syncDirection: 'obsidian-to-omnifocus' | 'omnifocus-to-obsidian' | 'bidirectional';
  checksum: string;
  status: 'synced' | 'modified' | 'conflict' | 'deleted';
}

export interface ConflictRecord {
  omnifocusId: string;
  detectedAt: string;
  obsidianContent: string;
  omnifocusContent: string;
  resolution: 'pending' | 'obsidian-wins' | 'omnifocus-wins' | 'manual' | null;
}

export interface SyncState {
  version: number;
  lastFullSync: string | null;
  records: Record<string, SyncRecord>;
  conflicts: ConflictRecord[];
}

function createEmptyState(): SyncState {
  return {
    version: 1,
    lastFullSync: null,
    records: {},
    conflicts: [],
  };
}

export class SyncStateManager {
  private stateFilePath: string;
  private state: SyncState;

  constructor(stateFilePath: string) {
    this.stateFilePath = stateFilePath;
    this.state = createEmptyState();
  }

  async load(): Promise<SyncState> {
    try {
      const data = await readFile(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(data) as SyncState;
    } catch {
      this.state = createEmptyState();
    }
    return this.state;
  }

  async save(state: SyncState): Promise<void> {
    this.state = state;
    await mkdir(dirname(this.stateFilePath), { recursive: true });
    await writeFile(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  getRecord(omnifocusId: string): SyncRecord | null {
    return this.state.records[omnifocusId] ?? null;
  }

  upsertRecord(record: SyncRecord): void {
    this.state.records[record.omnifocusId] = record;
  }

  deleteRecord(omnifocusId: string): void {
    delete this.state.records[omnifocusId];
  }

  findByMarkdownFile(filePath: string): SyncRecord[] {
    return Object.values(this.state.records).filter(
      (record) => record.markdownFile === filePath
    );
  }

  findConflicts(): ConflictRecord[] {
    return this.state.conflicts;
  }

  addConflict(conflict: ConflictRecord): void {
    this.state.conflicts.push(conflict);
  }

  resolveConflict(omnifocusId: string, resolution: ConflictRecord['resolution']): void {
    const conflict = this.state.conflicts.find((c) => c.omnifocusId === omnifocusId);
    if (conflict) {
      conflict.resolution = resolution;
    }
  }

  computeChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  detectChanges(omnifocusId: string, currentContent: string): 'unchanged' | 'modified' | 'new' {
    const record = this.getRecord(omnifocusId);
    if (!record) {
      return 'new';
    }
    const currentChecksum = this.computeChecksum(currentContent);
    return currentChecksum === record.checksum ? 'unchanged' : 'modified';
  }

  getStats(): { total: number; synced: number; modified: number; conflicts: number } {
    const records = Object.values(this.state.records);
    return {
      total: records.length,
      synced: records.filter((r) => r.status === 'synced').length,
      modified: records.filter((r) => r.status === 'modified').length,
      conflicts: this.state.conflicts.length,
    };
  }
}

export function embedOmniFocusId(markdownLine: string, omnifocusId: string): string {
  return `${markdownLine} <!-- omnifocus:${omnifocusId} -->`;
}

export function extractOmniFocusId(markdownLine: string): string | null {
  const match = markdownLine.match(/<!-- omnifocus:(\S+) -->/);
  return match ? match[1] : null;
}
