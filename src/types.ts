export interface OmnifocusTask {
  id: string;
  name: string;
  note: string;
  flagged: boolean;

  // Status
  completed: boolean;
  completionDate: string | null;
  dropDate: string | null;
  taskStatus: string; // One of Task.Status values
  active: boolean;

  // Dates
  dueDate: string | null;
  deferDate: string | null;
  estimatedMinutes: number | null;

  // Organization
  tags: string[]; // Tag IDs
  tagNames: string[]; // Human-readable tag names
  parentId: string | null;
  containingProjectId: string | null;
  projectId: string | null;

  // Task relationships
  childIds: string[];
  hasChildren: boolean;
  sequential: boolean;
  completedByChildren: boolean;

  // Recurring task information
  repetitionRule: string | null; // Textual representation of repetition rule
  isRepeating: boolean;
  repetitionMethod: string | null; // Fixed or due-based repetition

  // Attachments
  attachments: unknown[]; // FileWrapper representations
  linkedFileURLs: string[];

  // Notifications
  notifications: unknown[]; // Task.Notification representations

  // Settings
  shouldUseFloatingTimeZone: boolean;
}

export interface OmnifocusDatabase {
  exportDate: string;
  tasks: OmnifocusTask[];
  projects: Record<string, OmnifocusProject>;
  folders: Record<string, OmnifocusFolder>;
  tags: Record<string, OmnifocusTag>;
}

export interface OmnifocusProject {
  id: string;
  name: string;
  status: string;
  folderID: string | null;
  sequential: boolean;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  dueDate: string | null;
  deferDate: string | null;
  completedByChildren: boolean;
  containsSingletonActions: boolean;
  note: string;
  tasks: string[]; // Task IDs
  flagged?: boolean;
  estimatedMinutes?: number | null;
}

export interface OmnifocusFolder {
  id: string;
  name: string;
  parentFolderID: string | null;
  status: string;
  projects: string[]; // Project IDs
  subfolders: string[]; // Subfolder IDs
}

export interface OmnifocusTag {
  id: string;
  name: string;
  parentTagID: string | null;
  active: boolean;
  allowsNextAction: boolean;
  tasks: string[]; // Task IDs
}

export interface OmnifocusPerspective {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  isBuiltIn: boolean;
  canModify: boolean; // false for built-in perspectives
  // Filter rules for custom perspectives (if applicable)
  filterRules?: {
    availability?: string[];
    tags?: string[];
    projects?: string[];
    flagged?: boolean;
    dueWithin?: number;
    // Additional filter properties as needed
  };
}

// Query result types for formatting functions
export interface QueryTaskResult {
  id?: string;
  name?: string;
  flagged?: boolean;
  projectName?: string;
  dueDate?: string | null;
  deferDate?: string | null;
  estimatedMinutes?: number | null;
  tagNames?: string[];
  taskStatus?: string;
  creationDate?: string | null;
  modificationDate?: string | null;
  completionDate?: string | null;
}

export interface QueryProjectResult {
  id?: string;
  name?: string;
  status?: string;
  folderName?: string;
  taskCount?: number;
  flagged?: boolean;
  dueDate?: string | null;
}

export interface QueryFolderResult {
  id?: string;
  name?: string;
  projectCount?: number;
  path?: string;
}

export interface QueryFilters {
  projectId?: string;
  projectName?: string;
  folderId?: string;
  tags?: string[];
  status?: string[];
  flagged?: boolean;
  dueWithin?: number;
  deferredUntil?: number;
  hasNote?: boolean;
}
