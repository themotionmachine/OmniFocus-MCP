import { safeDeleteById } from './helpers.js';

type ItemType = 'task' | 'project' | 'tag' | 'folder';

interface TrackedItem {
  id: string;
  name: string;
  type: ItemType;
}

export class TestRegistry {
  private items = new Map<string, TrackedItem>();
  readonly runFolder: string;
  runFolderId: string = '';
  readonly testProject: string;
  testProjectId: string = '';

  constructor() {
    this.runFolder = `TEST:${Date.now()}`;
    this.testProject = `TEST:Sample Project`;
  }

  track(id: string, name: string, type: ItemType): void {
    this.items.set(id, { id, name, type });
  }

  getByType(type: ItemType): TrackedItem[] {
    return [...this.items.values()].filter(item => item.type === type);
  }

  untrack(id: string): void {
    this.items.delete(id);
  }

  async cleanupAll(): Promise<void> {
    const order: ItemType[] = ['task', 'project', 'tag', 'folder'];
    for (const type of order) {
      for (const item of this.getByType(type)) {
        try {
          await safeDeleteById(item.id, item.type);
          this.untrack(item.id);
        } catch (error) {
          console.warn(`Cleanup warning: failed to delete ${item.type} "${item.name}" (${item.id}):`, error);
        }
      }
    }
  }
}
