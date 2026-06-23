import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { DangerousGrantClaims, dangerousArgsHash, validateDangerousGrant } from './dangerousGrant.js';

export type OmniFocusMcpMode = 'readonly' | 'write' | 'dangerous';
export type ToolAccessLevel = 'read' | 'write' | 'dangerous';

export type ToolResult = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
};

type ToolHandler = (args: any, extra: RequestHandlerExtra) => Promise<ToolResult>;

const READ_TOOLS = new Set([
  'dump_database',
  'query_omnifocus',
  'list_perspectives',
  'get_perspective_view',
  'list_tags',
]);

const WRITE_TOOLS = new Set([
  'add_omnifocus_task',
  'add_project',
  'edit_item',
  'batch_add_items',
  'create_tag',
]);

const DANGEROUS_TOOLS = new Set([
  'remove_item',
  'batch_remove_items',
  'remove_tag',
]);

const WRITE_MODES: OmniFocusMcpMode[] = ['write', 'dangerous'];
const DANGEROUS_MODES: OmniFocusMcpMode[] = ['dangerous'];
const BROAD_BATCH_ITEM_LIMIT = 10;

export function getOmniFocusMcpMode(env = process.env): OmniFocusMcpMode {
  const mode = env.OMNIFOCUS_MCP_MODE;

  if (mode === 'write' || mode === 'dangerous') {
    return mode;
  }

  return 'readonly';
}

export function getToolAccessLevel(toolName: string, args: any = {}): ToolAccessLevel {
  if (READ_TOOLS.has(toolName)) {
    return 'read';
  }

  if (DANGEROUS_TOOLS.has(toolName)) {
    return 'dangerous';
  }

  if (toolName === 'edit_item' && isDestructiveEdit(args)) {
    return 'dangerous';
  }

  if (toolName === 'batch_add_items' && isBroadBatch(args)) {
    return 'dangerous';
  }

  if (WRITE_TOOLS.has(toolName)) {
    return 'write';
  }

  return 'dangerous';
}

export function isToolAllowed(toolName: string, args: any, mode = getOmniFocusMcpMode()): boolean {
  const accessLevel = getToolAccessLevel(toolName, args);

  if (accessLevel === 'read') {
    return true;
  }

  if (accessLevel === 'write') {
    return WRITE_MODES.includes(mode);
  }

  return DANGEROUS_MODES.includes(mode);
}

export function isDangerousDryRunEnabled(env = process.env): boolean {
  return env.OMNIFOCUS_MCP_DANGEROUS_DRY_RUN === '1'
    || env.OMNIFOCUS_MCP_DANGEROUS_DRY_RUN === 'true';
}

export function dangerousGrantRequiredResult(toolName: string, reason: string): ToolResult {
  return {
    content: [{
      type: 'text',
      text: `Tool "${toolName}" requires a valid dangerousGrant for this destructive operation. ${reason}`
    }],
    isError: true,
  };
}

export function dangerousAuditPayload(
  toolName: string,
  args: Record<string, unknown>,
  claims: DangerousGrantClaims | undefined,
  executed: boolean
): Record<string, unknown> {
  const strippedArgs = stripDangerousGrant(args);

  return {
    dryRun: !executed,
    tool: toolName,
    accessLevel: 'dangerous',
    argsHash: dangerousArgsHash(args),
    args: strippedArgs,
    grant: claims ? {
      jti: claims.jti,
      grantVersion: claims.grant_version,
      grantType: claims.grant_type,
      scope: claims.scope,
      allowedTools: claims.allowed_tools,
      expiresAt: claims.exp,
      notBefore: claims.nbf,
      reason: claims.reason,
    } : undefined,
    executed,
    message: executed
      ? 'Grant verified; OmniFocus mutation handler executed.'
      : 'Grant verified; OmniFocus mutation was not executed because dangerous dry-run mode is enabled.',
  };
}

export function appendDangerousAuditResult(
  result: ToolResult,
  toolName: string,
  args: Record<string, unknown>,
  claims: DangerousGrantClaims | undefined,
  executed: boolean
): ToolResult {
  const auditText = JSON.stringify({
    dangerousAction: dangerousAuditPayload(toolName, args, claims, executed),
  }, null, 2);

  return {
    ...result,
    content: [
      ...result.content,
      {
        type: 'text',
        text: auditText,
      },
    ],
  };
}

export function dangerousDryRunResult(
  toolName: string,
  args: Record<string, unknown>,
  claims?: DangerousGrantClaims
): ToolResult {
  return appendDangerousAuditResult({
    content: [{
      type: 'text',
      text: `Dangerous dry run: grant verified for "${toolName}", but OMNIFOCUS_MCP_DANGEROUS_DRY_RUN is enabled so no OmniFocus mutation was executed.`
    }]
  }, toolName, args, claims, false);
}

export function blockedToolResult(toolName: string, args: any, mode = getOmniFocusMcpMode()): ToolResult {
  const accessLevel = getToolAccessLevel(toolName, args);
  const requiredMode = accessLevel === 'dangerous'
    ? 'dangerous'
    : 'write or dangerous';

  return {
    content: [{
      type: 'text',
      text: `Tool "${toolName}" is blocked by OmniFocus MCP safety policy. Current mode is "${mode}"; required mode is "${requiredMode}". Set OMNIFOCUS_MCP_MODE=${accessLevel === 'dangerous' ? 'dangerous' : 'write'} to allow this operation.`
    }],
    isError: true,
  };
}

export function guardToolHandler(toolName: string, handler: ToolHandler): ToolHandler {
  return async (args: any, extra: RequestHandlerExtra) => {
    const mode = getOmniFocusMcpMode();
    const accessLevel = getToolAccessLevel(toolName, args);

    if (!isToolAllowed(toolName, args, mode)) {
      return blockedToolResult(toolName, args, mode);
    }

    let dangerousGrantClaims: DangerousGrantClaims | undefined;
    if (accessLevel === 'dangerous') {
      const grantResult = validateDangerousGrant(toolName, args);
      if (!grantResult.valid) {
        return dangerousGrantRequiredResult(toolName, grantResult.reason ?? 'Grant validation failed.');
      }
      dangerousGrantClaims = grantResult.claims;
      if (isDangerousDryRunEnabled()) {
        return dangerousDryRunResult(toolName, args, dangerousGrantClaims);
      }
    }

    const result = await handler(stripDangerousGrant(args), extra);
    if (accessLevel === 'dangerous') {
      return appendDangerousAuditResult(result, toolName, args, dangerousGrantClaims, true);
    }

    return result;
  };
}

function stripDangerousGrant(args: any): any {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return args;
  }

  const { dangerousGrant, ...rest } = args;
  return rest;
}

function isDestructiveEdit(args: any): boolean {
  return ['completed', 'dropped', 'skipped'].includes(args?.newStatus)
    || ['completed', 'dropped'].includes(args?.newProjectStatus);
}

function isBroadBatch(args: any): boolean {
  return Array.isArray(args?.items) && args.items.length > BROAD_BATCH_ITEM_LIMIT;
}
