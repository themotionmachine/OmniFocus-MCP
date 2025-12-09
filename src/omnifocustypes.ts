// Core enums
export namespace Task {
  export enum Status {
    Available,
    Blocked,
    Completed,
    Dropped,
    DueSoon,
    Next,
    Overdue
  }

  export enum RepetitionMethod {
    DeferUntilDate,
    DueDate,
    Fixed,
    None
  }
}
export namespace Project {
  export enum Status {
    Active,
    Done,
    Dropped,
    OnHold
  }
}
export namespace Folder {
  export enum Status {
    Active,
    Dropped
  }
}
export namespace Tag {
  export enum Status {
    Active,
    Dropped,
    OnHold
  }
}
// Minimal DatabaseObject interface
export interface DatabaseObject {
  id: { primaryKey: string };
}
// Minimal interfaces for core objects
export interface TaskMinimal extends DatabaseObject {
  name: string;
  note: string;
  flagged: boolean;
  taskStatus: Task.Status;
  dueDate: Date | null;
  deferDate: Date | null;
  effectiveDueDate: Date | null;
  effectiveDeferDate: Date | null;
  estimatedMinutes: number | null;
  completedByChildren: boolean;
  sequential: boolean;
  tags: TagMinimal[];
  containingProject: ProjectMinimal | null;
  parent: TaskMinimal | null;
  children: TaskMinimal[];
  inInbox: boolean;
}
export interface ProjectMinimal extends DatabaseObject {
  name: string;
  note: string;
  status: Project.Status;
  dueDate: Date | null;
  deferDate: Date | null;
  effectiveDueDate: Date | null;
  effectiveDeferDate: Date | null;
  estimatedMinutes: number | null;
  flagged: boolean;
  sequential: boolean;
  parentFolder: FolderMinimal | null;
  tags: TagMinimal[];
  tasks: TaskMinimal[];
}
export interface FolderMinimal extends DatabaseObject {
  name: string;
  status: Folder.Status;
  parent: FolderMinimal | null;
}
export interface TagMinimal extends DatabaseObject {
  name: string;
  status: Tag.Status;
  parent: TagMinimal | null;
  active: boolean;
}
