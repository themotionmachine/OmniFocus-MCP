import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { addAttachment } from '../../../src/tools/primitives/addAttachment.js';
import { addLinkedFile } from '../../../src/tools/primitives/addLinkedFile.js';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { listAttachments } from '../../../src/tools/primitives/listAttachments.js';
import { listLinkedFiles } from '../../../src/tools/primitives/listLinkedFiles.js';
import { removeAttachment } from '../../../src/tools/primitives/removeAttachment.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

/**
 * Integration tests for attachment and linked-file tools.
 *
 * These tests require OmniFocus to be running on macOS.
 * They verify the full round-trip through OmniJS:
 *   - add_attachment: base64 → Data.fromBase64 → FileWrapper.withContents → read-back
 *   - list_attachments: task.attachments → AttachmentInfo[]
 *   - remove_attachment: removeAttachmentAtIndex with bounds checking
 *   - add_linked_file: URL.fromString → addLinkedFileURL → read-back
 *   - list_linked_files: task.linkedFileURLs → LinkedFileInfo[]
 *
 * Tests are skipped automatically when OmniFocus is unavailable (CI environments).
 *
 * Design: Uses afterAll cleanup (not afterEach) to minimize OmniFocus round-trips.
 * Each test creates tasks and tracks them for batch cleanup at the end.
 */
describe('Attachment Tools Integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdTempDirs: string[] = [];

  /**
   * Create a temporary file on disk so OmniFocus can create a Finder alias.
   * OmniFocus's addLinkedFileURL() requires the target file to exist on disk.
   * Tracks both file and directory for cleanup in afterAll.
   */
  function createTempFile(filename: string, content = 'test content'): string {
    const dir = mkdtempSync(join(tmpdir(), 'omnifocus-integ-'));
    createdTempDirs.push(dir);
    const filePath = join(dir, filename);
    writeFileSync(filePath, content);
    return filePath;
  }

  async function createTestTask(label: string): Promise<{ id: string; name: string }> {
    const uniqueName = `Attachment Test - ${label} ${Date.now()}`;
    const result = await addOmniFocusTask({ name: uniqueName });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync(500);
    return { id: result.taskId, name: uniqueName };
  }

  afterAll(async () => {
    // Batch cleanup — runs once after all tests.
    // OmniFocus task deletion can be slow (~10-30s per task with attachments).
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    for (const dir of createdTempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }, 300000);

  // ---------------------------------------------------------------------------
  // list_attachments + list_linked_files — empty task
  // ---------------------------------------------------------------------------

  it('should list empty attachments and linked files on a new task', async () => {
    const task = await createTestTask('empty lists');

    const attachResult = await listAttachments({ id: task.id });
    expect(attachResult.success).toBe(true);
    if (attachResult.success) {
      expect(attachResult.id).toBe(task.id);
      expect(attachResult.attachments).toHaveLength(0);
    }

    const linkedResult = await listLinkedFiles({ id: task.id });
    expect(linkedResult.success).toBe(true);
    if (linkedResult.success) {
      expect(linkedResult.id).toBe(task.id);
      expect(linkedResult.linkedFiles).toHaveLength(0);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // add_attachment → list → verify metadata
  // ---------------------------------------------------------------------------

  it('should add attachment and verify metadata via list', async () => {
    const task = await createTestTask('add attachment');
    const base64Data = Buffer.from('hello world').toString('base64');

    const addResult = await addAttachment({
      id: task.id,
      filename: 'hello.txt',
      data: base64Data
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.id).toBe(task.id);
      expect(addResult.attachmentCount).toBe(1);
      expect(addResult.warning).toBeUndefined();
    }

    await waitForSync(500);

    const listResult = await listAttachments({ id: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.attachments).toHaveLength(1);
      const att = listResult.attachments[0];
      expect(att.index).toBe(0);
      expect(att.filename).toBe('hello.txt');
      expect(att.type).toBe('File');
      expect(att.size).toBeGreaterThan(0);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // Full round-trip: add → add → list → remove → list (attachments)
  // ---------------------------------------------------------------------------

  it('should complete full attachment round-trip: add 2 → list → remove middle → list', async () => {
    const task = await createTestTask('attachment round-trip');

    // Add two attachments
    const add1 = await addAttachment({
      id: task.id,
      filename: 'first.txt',
      data: Buffer.from('first').toString('base64')
    });
    expect(add1.success).toBe(true);
    if (add1.success) expect(add1.attachmentCount).toBe(1);

    const add2 = await addAttachment({
      id: task.id,
      filename: 'second.txt',
      data: Buffer.from('second').toString('base64')
    });
    expect(add2.success).toBe(true);
    if (add2.success) expect(add2.attachmentCount).toBe(2);

    await waitForSync(500);

    // List — verify both present with correct indices
    const listBefore = await listAttachments({ id: task.id });
    expect(listBefore.success).toBe(true);
    if (listBefore.success) {
      expect(listBefore.attachments).toHaveLength(2);
      expect(listBefore.attachments[0].index).toBe(0);
      expect(listBefore.attachments[1].index).toBe(1);
      const filenames = listBefore.attachments.map((a) => a.filename);
      expect(filenames).toContain('first.txt');
      expect(filenames).toContain('second.txt');
    }

    // Remove index 0
    const removeResult = await removeAttachment({ id: task.id, index: 0 });
    expect(removeResult.success).toBe(true);
    if (removeResult.success) {
      expect(removeResult.remainingAttachments).toHaveLength(1);
      // Remaining should be re-indexed to 0
      expect(removeResult.remainingAttachments[0].index).toBe(0);
    }

    await waitForSync(500);

    // List — verify 1 remains
    const listAfter = await listAttachments({ id: task.id });
    expect(listAfter.success).toBe(true);
    if (listAfter.success) {
      expect(listAfter.attachments).toHaveLength(1);
    }
  }, 90000);

  // ---------------------------------------------------------------------------
  // remove_attachment — error cases
  // ---------------------------------------------------------------------------

  it('should return error for remove on empty task and out-of-bounds index', async () => {
    const emptyTask = await createTestTask('remove errors');

    // No attachments — should fail
    const removeEmpty = await removeAttachment({ id: emptyTask.id, index: 0 });
    expect(removeEmpty.success).toBe(false);
    if (!removeEmpty.success) {
      expect(removeEmpty.error.toLowerCase()).toMatch(/no attachments/i);
    }

    // Add one, then try out-of-bounds
    await addAttachment({
      id: emptyTask.id,
      filename: 'only.txt',
      data: Buffer.from('data').toString('base64')
    });
    await waitForSync(500);

    const removeOob = await removeAttachment({ id: emptyTask.id, index: 5 });
    expect(removeOob.success).toBe(false);
    if (!removeOob.success) {
      expect(removeOob.error.toLowerCase()).toMatch(/out of bounds|index/i);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // add_attachment — base64 validation (pre-OmniJS rejection)
  // ---------------------------------------------------------------------------

  it('should reject invalid base64 before reaching OmniJS', async () => {
    const task = await createTestTask('invalid base64');

    const result = await addAttachment({
      id: task.id,
      filename: 'bad.txt',
      data: 'invalid@base64!'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_BASE64');
    }

    // Verify no attachment was created
    const listResult = await listAttachments({ id: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.attachments).toHaveLength(0);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // add_linked_file → list → verify metadata
  // ---------------------------------------------------------------------------

  it('should add linked file (real file on disk) and verify via list', async () => {
    const task = await createTestTask('add linked file');
    const tempPath = createTempFile('test-linked.txt');

    const addResult = await addLinkedFile({
      id: task.id,
      url: `file://${tempPath}`
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.id).toBe(task.id);
      expect(addResult.linkedFileCount).toBe(1);
    }

    await waitForSync(500);

    const listResult = await listLinkedFiles({ id: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.linkedFiles).toHaveLength(1);
      const linked = listResult.linkedFiles[0];
      expect(linked.url).toContain('file://');
      expect(linked.url).toContain('test-linked.txt');
      expect(linked.filename).toBe('test-linked.txt');
      expect(linked.extension).toBeDefined();
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // add_linked_file — multiple files
  // ---------------------------------------------------------------------------

  it('should add two linked files and list both', async () => {
    const task = await createTestTask('multiple linked');
    const tempPath1 = createTempFile('doc1.pdf', '%PDF-1.4');
    const tempPath2 = createTempFile('doc2.md', '# Heading');

    const add1 = await addLinkedFile({
      id: task.id,
      url: `file://${tempPath1}`
    });
    expect(add1.success).toBe(true);
    if (add1.success) expect(add1.linkedFileCount).toBe(1);

    const add2 = await addLinkedFile({
      id: task.id,
      url: `file://${tempPath2}`
    });
    expect(add2.success).toBe(true);
    if (add2.success) expect(add2.linkedFileCount).toBe(2);

    await waitForSync(500);

    const listResult = await listLinkedFiles({ id: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.linkedFiles).toHaveLength(2);
      const filenames = listResult.linkedFiles.map((l) => l.filename);
      expect(filenames).toContain('doc1.pdf');
      expect(filenames).toContain('doc2.md');
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // Error: nonexistent task ID — all 5 tools
  // ---------------------------------------------------------------------------

  it('should return NOT_FOUND errors for nonexistent task IDs', async () => {
    const badId = 'nonexistent-id-99999';

    const listAtt = await listAttachments({ id: badId });
    expect(listAtt.success).toBe(false);
    if (!listAtt.success) expect(listAtt.error.toLowerCase()).toMatch(/not found/i);

    const listLinked = await listLinkedFiles({ id: badId });
    expect(listLinked.success).toBe(false);
    if (!listLinked.success) expect(listLinked.error.toLowerCase()).toMatch(/not found/i);

    const addAtt = await addAttachment({
      id: badId,
      filename: 'file.txt',
      data: Buffer.from('data').toString('base64')
    });
    expect(addAtt.success).toBe(false);
    if (!addAtt.success) expect(addAtt.code).toBe('NOT_FOUND');

    const removeAtt = await removeAttachment({ id: badId, index: 0 });
    expect(removeAtt.success).toBe(false);
    if (!removeAtt.success) expect(removeAtt.error.toLowerCase()).toMatch(/not found/i);

    const tempPath = createTempFile('not-found-test.txt');
    const addLink = await addLinkedFile({
      id: badId,
      url: `file://${tempPath}`
    });
    expect(addLink.success).toBe(false);
    if (!addLink.success) expect(addLink.error.toLowerCase()).toMatch(/not found/i);
  }, 60000);

  // ---------------------------------------------------------------------------
  // Mixed: attachments and linked files coexist independently
  // ---------------------------------------------------------------------------

  it('should handle attachments and linked files on the same task independently', async () => {
    const task = await createTestTask('mixed');

    // Add an embedded attachment
    await addAttachment({
      id: task.id,
      filename: 'embedded.txt',
      data: Buffer.from('embedded content').toString('base64')
    });

    // Add a linked file
    const tempPath = createTempFile('linked-doc.pdf', '%PDF-1.4');
    await addLinkedFile({
      id: task.id,
      url: `file://${tempPath}`
    });

    await waitForSync(500);

    // Verify attachments (embedded only)
    const attachResult = await listAttachments({ id: task.id });
    expect(attachResult.success).toBe(true);
    if (attachResult.success) {
      expect(attachResult.attachments).toHaveLength(1);
      expect(attachResult.attachments[0].filename).toBe('embedded.txt');
    }

    // Verify linked files (linked only)
    const linkedResult = await listLinkedFiles({ id: task.id });
    expect(linkedResult.success).toBe(true);
    if (linkedResult.success) {
      expect(linkedResult.linkedFiles).toHaveLength(1);
      expect(linkedResult.linkedFiles[0].filename).toBe('linked-doc.pdf');
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // Binary attachment (non-text data)
  // ---------------------------------------------------------------------------

  it('should handle binary attachment data (non-text bytes)', async () => {
    const task = await createTestTask('binary');

    // Minimal PNG-like header
    const binaryBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);

    const addResult = await addAttachment({
      id: task.id,
      filename: 'image.png',
      data: binaryBuffer.toString('base64')
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) expect(addResult.attachmentCount).toBe(1);

    await waitForSync(500);

    const listResult = await listAttachments({ id: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.attachments).toHaveLength(1);
      expect(listResult.attachments[0].filename).toBe('image.png');
      expect(listResult.attachments[0].size).toBe(binaryBuffer.length);
    }
  }, 60000);
});
