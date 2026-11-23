/**
 * Access scopes: which kinds of tools an agent gets.
 *
 *   read    query and list; changes nothing
 *   add     creates new items only; never alters or removes existing ones
 *   modify  changes or deletes existing items
 *
 * Chosen at startup with OMNIFOCUS_MCP_SCOPES (comma-separated). Unset means
 * all scopes, so existing setups behave exactly as before. Tools outside the
 * enabled scopes are never registered: the agent can neither see nor call them.
 */
export const SCOPES = ['read', 'add', 'modify'] as const;
export type Scope = (typeof SCOPES)[number];

/** Parse OMNIFOCUS_MCP_SCOPES. Invalid input throws; it never widens to all scopes. */
export function parseScopes(raw: string | undefined = process.env.OMNIFOCUS_MCP_SCOPES): ReadonlySet<Scope> {
  if (raw === undefined) return new Set(SCOPES);
  const tokens = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const unknown = tokens.filter((t) => !(SCOPES as readonly string[]).includes(t));
  if (tokens.length === 0 || unknown.length > 0) {
    throw new Error(
      `OMNIFOCUS_MCP_SCOPES=${JSON.stringify(raw)} is invalid. ` +
        `Use a comma-separated list of: ${SCOPES.join(', ')} (e.g. "read" or "read,add").`
    );
  }
  return new Set(tokens as Scope[]);
}

/**
 * Canonical name for a scope set, used in the daemon socket filename so each
 * scope set gets its own daemon. Empty for all scopes, keeping today's name.
 */
export function scopeKey(scopes: ReadonlySet<Scope>): string {
  return scopes.size === SCOPES.length ? '' : SCOPES.filter((s) => scopes.has(s)).join('-');
}
