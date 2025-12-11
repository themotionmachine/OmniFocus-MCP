/**
 * Generate OmniJS test scripts using our ACTUAL implementation code.
 *
 * This imports the real generateXxxScript() functions from our primitives
 * and outputs the exact OmniJS that would be sent to OmniFocus.
 *
 * Usage: npx tsx specs/003-tasks/manual-tests/generate-test-scripts.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateAppendNoteScript } from '../../../src/tools/primitives/appendNote.js';
import { generateGetTaskScript } from '../../../src/tools/primitives/getTask.js';
// Import the actual script generators from source (tsx handles .ts imports)
import { generateListTasksScript } from '../../../src/tools/primitives/listTasks.js';
import { generateSetPlannedDateScript } from '../../../src/tools/primitives/setPlannedDate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = __dirname;

interface TestCase {
  name: string;
  description: string;
  generator: () => string;
}

// Test cases using real generator functions with various parameters
const testCases: TestCase[] = [
  // ============================================================================
  // list_tasks tests
  // ============================================================================
  {
    name: '01-list-tasks-basic.omnijs',
    description: 'list_tasks: No filters, first 10 available tasks',
    generator: () => generateListTasksScript({ limit: 10 })
  },
  {
    name: '02-list-tasks-flagged.omnijs',
    description: 'list_tasks: Flagged tasks only',
    generator: () => generateListTasksScript({ flagged: true, limit: 10 })
  },
  {
    name: '03-list-tasks-with-completed.omnijs',
    description: 'list_tasks: Include completed tasks',
    generator: () => generateListTasksScript({ includeCompleted: true, limit: 10 })
  },
  {
    name: '04-list-tasks-due-soon.omnijs',
    description: 'list_tasks: Tasks due within next 7 days',
    generator: () => {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return generateListTasksScript({
        dueAfter: now.toISOString(),
        dueBefore: weekFromNow.toISOString(),
        limit: 10
      });
    }
  },
  {
    name: '05-list-tasks-by-status.omnijs',
    description: 'list_tasks: Filter by Available status',
    generator: () => generateListTasksScript({ status: ['Available'], limit: 10 })
  },

  // ============================================================================
  // get_task tests
  // ============================================================================
  {
    name: '06-get-task-by-id.omnijs',
    description: 'get_task: By ID (REPLACE TASK_ID_HERE with real ID from list_tasks)',
    generator: () => generateGetTaskScript({ id: 'TASK_ID_HERE' })
  },
  {
    name: '07-get-task-by-name.omnijs',
    description: 'get_task: By name (REPLACE with a unique task name)',
    generator: () => generateGetTaskScript({ name: 'TASK_NAME_HERE' })
  },

  // ============================================================================
  // set_planned_date tests (v4.7+)
  // ============================================================================
  {
    name: '08-set-planned-date.omnijs',
    description: 'set_planned_date: Set to tomorrow (v4.7+, REPLACE TASK_ID_HERE)',
    generator: () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return generateSetPlannedDateScript({
        id: 'TASK_ID_HERE',
        plannedDate: tomorrow.toISOString()
      });
    }
  },
  {
    name: '09-clear-planned-date.omnijs',
    description: 'set_planned_date: Clear (set to null) (v4.7+, REPLACE TASK_ID_HERE)',
    generator: () =>
      generateSetPlannedDateScript({
        id: 'TASK_ID_HERE',
        plannedDate: null
      })
  },

  // ============================================================================
  // append_note tests
  // ============================================================================
  {
    name: '10-append-note.omnijs',
    description: 'append_note: Append simple text (REPLACE TASK_ID_HERE)',
    generator: () =>
      generateAppendNoteScript({
        id: 'TASK_ID_HERE',
        text: 'Appended via MCP manual test at ' + new Date().toISOString()
      })
  },
  {
    name: '11-append-note-special-chars.omnijs',
    description: 'append_note: Test special characters (REPLACE TASK_ID_HERE)',
    generator: () =>
      generateAppendNoteScript({
        id: 'TASK_ID_HERE',
        text: 'Special chars: "quotes" \'apostrophe\' <angle> & ampersand\nNewline above'
      })
  },
  {
    name: '12-append-note-by-name.omnijs',
    description: 'append_note: By name (REPLACE with unique task name)',
    generator: () =>
      generateAppendNoteScript({
        name: 'TASK_NAME_HERE',
        text: 'Appended by name lookup'
      })
  }
];

// ============================================================================
// Generate all test scripts
// ============================================================================

console.log('Generating OmniJS test scripts from ACTUAL implementation...\n');

for (const testCase of testCases) {
  try {
    const script = testCase.generator();
    const filePath = path.join(outputDir, testCase.name);
    fs.writeFileSync(filePath, script);
    console.log(`✅ ${testCase.name}`);
    console.log(`   ${testCase.description}\n`);
  } catch (error) {
    console.error(`❌ ${testCase.name}`);
    console.error(`   Error: ${error}\n`);
  }
}

console.log(`\n========================================`);
console.log(`Generated ${testCases.length} test scripts in:`);
console.log(outputDir);
console.log(`\nThese scripts are the EXACT OmniJS output from our implementation.`);
console.log(`\nTo use:`);
console.log(`1. Open OmniFocus`);
console.log(`2. Open Automation > Console (or press ⌃⌥⌘C)`);
console.log(`3. Run 01-list-tasks-basic.omnijs first to get real task IDs`);
console.log(`4. Replace TASK_ID_HERE placeholders in other scripts`);
console.log(`5. Run each script and verify output`);
console.log(`========================================\n`);
