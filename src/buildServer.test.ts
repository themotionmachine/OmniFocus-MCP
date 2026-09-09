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
