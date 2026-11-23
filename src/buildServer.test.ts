import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

/**
 * Unknown argument keys must be rejected, not silently stripped. This drives a
 * real MCP client through the server built by `createOmniFocusServer`, because
 * the strictness lives in a post-registration patch of SDK internals
 * (`rejectUnknownArguments`) — a unit test of the schema object alone would
 * pass even if the patch stopped taking effect.
 */

// Belt and braces: no test path below should reach OmniFocus, and if one does
// it must fail rather than spawn osascript against the live database.
vi.mock('./utils/scriptExecution.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/scriptExecution.js')>();
  return {
    ...actual,
    runOsascriptFile: vi.fn(async () => {
      throw new Error('test reached osascript');
    }),
    executeOmniFocusScript: vi.fn(async () => {
      throw new Error('test reached osascript');
    }),
  };
});

import { createOmniFocusServer } from './buildServer.js';
import { parseScopes } from './scopes.js';

async function connectedClient(scopes?: string) {
  const { server } = createOmniFocusServer(parseScopes(scopes));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('tool arguments are strict', () => {
  it('edit_item rejects a misspelled field and names it', async () => {
    const client = await connectedClient();
    await expect(
      client.callTool({
        name: 'edit_item',
        arguments: { id: 'abc', itemType: 'task', note: 'typo for newNote' },
      })
    ).rejects.toThrow(/note/);
  });

  it('edit_item with nothing to change is an error result, not a success line', async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: 'edit_item',
      arguments: { id: 'abc', itemType: 'task' },
    })) as any;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('newNote');
  });

  it('every tool advertises additionalProperties: false', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(5);
    for (const tool of tools) {
      expect(tool.inputSchema.additionalProperties, tool.name).toBe(false);
    }
  });

  it('a well-formed call still reaches the handler', async () => {
    const client = await connectedClient();
    const result = (await client.callTool({
      name: 'edit_item',
      arguments: { itemType: 'task', newNote: 'x' },
    })) as any;
    // No id or name → the handler's own validation, proving strictness let
    // the recognized keys through.
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either id or name');
  });
});

describe('nested objects are strict too', () => {
  it('query_omnifocus rejects a misspelled filter instead of running unfiltered', async () => {
    const client = await connectedClient();
    await expect(
      client.callTool({
        name: 'query_omnifocus',
        arguments: { entity: 'tasks', filters: { inInbox: true }, summary: true },
      })
    ).rejects.toThrow(/inInbox/);
  });

  it('batch_add_items rejects an unknown key inside an item, and inside its repeat', async () => {
    const client = await connectedClient();
    await expect(
      client.callTool({
        name: 'batch_add_items',
        arguments: { items: [{ type: 'task', name: 'x', note: 'ok', dueDat: 'typo' }] },
      })
    ).rejects.toThrow(/dueDat/);
    await expect(
      client.callTool({
        name: 'batch_add_items',
        arguments: { items: [{ type: 'task', name: 'x', repeat: { every: 'week', bogus: 1 } }] },
      })
    ).rejects.toThrow(/bogus/);
  });

  it('the advertised JSON schema carries additionalProperties: false at depth', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const query = tools.find(t => t.name === 'query_omnifocus')!;
    const filters = (query.inputSchema.properties as any).filters;
    expect(filters.additionalProperties).toBe(false);
    const batch = tools.find(t => t.name === 'batch_add_items')!;
    const item = (batch.inputSchema.properties as any).items.items;
    expect(item.additionalProperties).toBe(false);
  });

  it('descriptions, optionality and nullability survive the rebuild', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const edit = tools.find(t => t.name === 'edit_item')!;
    const props = edit.inputSchema.properties as any;
    expect(props.newNote.description).toBe('New note');
    expect(edit.inputSchema.required).toEqual(['itemType']);
    // newRepeat is nullable().optional(): null must still clear, not be rejected
    const r = (await client.callTool({
      name: 'edit_item',
      arguments: { itemType: 'task', newRepeat: null },
    })) as any;
    expect(r.content[0].text).toContain('Either id or name');
  });
});

describe('scopes limit what an agent can see and call', () => {
  const READ = ['dump_database', 'get_perspective_view', 'list_perspectives', 'list_tags', 'query_omnifocus'];
  const ADD = ['add_omnifocus_task', 'add_project', 'batch_add_items', 'create_tag'];
  const MODIFY = ['batch_remove_items', 'edit_item', 'remove_item'];
  const toolNames = async (scopes?: string) =>
    (await (await connectedClient(scopes)).listTools()).tools.map((t) => t.name).sort();

  it('registers all 12 tools by default', async () => {
    expect(await toolNames()).toEqual([...READ, ...ADD, ...MODIFY].sort());
  });

  it('read-only exposes only read tools', async () => {
    expect(await toolNames('read')).toEqual(READ);
  });

  it('read,add exposes no tool that changes or deletes existing items', async () => {
    expect(await toolNames('read,add')).toEqual([...READ, ...ADD].sort());
  });

  it('a disabled tool cannot be called', async () => {
    const client = await connectedClient('read');
    await expect(
      client.callTool({ name: 'remove_item', arguments: { id: 'abc', itemType: 'task' } })
    ).rejects.toThrow(/remove_item/);
  });

  it('resources are read access, so they go away without the read scope', async () => {
    expect((await connectedClient('add')).getServerCapabilities()?.resources).toBeUndefined();
    expect((await connectedClient('read')).getServerCapabilities()?.resources).toBeDefined();
  });
});
