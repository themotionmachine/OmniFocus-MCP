/**
 * TaskPaper transport text token-to-property mapping.
 * Shared between the export serializer (OmniJS) and the validate parser (TypeScript).
 *
 * These define the canonical set of recognized TaskPaper parameters.
 * The validator uses this list to avoid false-positive warnings for known tokens.
 */

export interface TaskPaperTokenMapping {
  /** The token as it appears in transport text (e.g., '@due') */
  token: string;
  /** The OmniJS property name this maps to (e.g., 'dueDate') */
  property: string;
  /** Whether this token takes a parenthesized value: @token(value) */
  hasValue: boolean;
  /** The type of value expected */
  valueType: 'date' | 'duration' | 'boolean' | 'string' | 'none';
  /** Whether this token is emitted by the export serializer */
  exportable: boolean;
}

/**
 * All recognized TaskPaper tokens.
 * Tokens marked exportable=true are serialized by the export primitive.
 * Tokens marked exportable=false are recognized by the validator but not emitted on export.
 */
export const TASKPAPER_TOKENS: readonly TaskPaperTokenMapping[] = [
  { token: '@due', property: 'dueDate', hasValue: true, valueType: 'date', exportable: true },
  {
    token: '@defer',
    property: 'deferDate',
    hasValue: true,
    valueType: 'date',
    exportable: true
  },
  { token: '@done', property: 'doneDate', hasValue: true, valueType: 'date', exportable: true },
  {
    token: '@estimate',
    property: 'estimatedMinutes',
    hasValue: true,
    valueType: 'duration',
    exportable: true
  },
  {
    token: '@flagged',
    property: 'flagged',
    hasValue: false,
    valueType: 'boolean',
    exportable: true
  },
  { token: '@tags', property: 'tags', hasValue: true, valueType: 'string', exportable: true },
  {
    token: '@autodone',
    property: 'completedByChildren',
    hasValue: true,
    valueType: 'boolean',
    exportable: false
  },
  {
    token: '@parallel',
    property: 'sequential',
    hasValue: true,
    valueType: 'boolean',
    exportable: false
  },
  {
    token: '@repeat-method',
    property: 'repetitionMethod',
    hasValue: true,
    valueType: 'string',
    exportable: false
  },
  {
    token: '@repeat-rule',
    property: 'repetitionRule',
    hasValue: true,
    valueType: 'string',
    exportable: false
  }
] as const;

/** Set of all recognized token prefixes for quick lookup */
export const RECOGNIZED_TOKENS = new Set(TASKPAPER_TOKENS.map((t) => t.token));
