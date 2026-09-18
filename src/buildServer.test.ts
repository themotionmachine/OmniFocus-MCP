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

async function connectedClient() {
  const { server } = createOmniFocusServer();
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
