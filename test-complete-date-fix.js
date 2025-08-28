#!/usr/bin/env node

/**
 * Complete test script to verify all date handling fixes
 * This tests project creation, task creation, and task editing with dates
 */

import { addProject } from './dist/tools/primitives/addProject.js';
import { addOmniFocusTask } from './dist/tools/primitives/addOmniFocusTask.js';
import { editItem } from './dist/tools/primitives/editItem.js';

async function testCompleteDateHandling() {
  console.log('Testing complete date handling for OmniFocus MCP Server...\n');
  
  const testProjectName = `Test Date Fix ${Date.now()}`;
  const testTaskName = `Test Task ${Date.now()}`;
  
  try {
    // Test 1: Create a project with a due date
    console.log('1. Creating project with due date...');
    const projectResult = await addProject({
      name: testProjectName,
      dueDate: '2025-08-29T12:00:00',
      note: 'Testing date handling fix'
    });
    
    if (projectResult.success) {
      console.log(`   ✅ Project created: ${projectResult.projectId}`);
    } else {
      console.log(`   ❌ Failed to create project: ${projectResult.error}`);
      return false;
    }
    
    // Test 2: Create a task with both due and defer dates
    console.log('\n2. Creating task with due and defer dates...');
    const taskResult = await addOmniFocusTask({
      name: testTaskName,
      projectName: testProjectName,
      dueDate: '2025-08-30T15:00:00',
      deferDate: '2025-08-29T09:00:00',
      note: 'Testing date handling in task creation'
    });
    
    if (taskResult.success) {
      console.log(`   ✅ Task created: ${taskResult.taskId}`);
    } else {
      console.log(`   ❌ Failed to create task: ${taskResult.error}`);
      return false;
    }
    
    // Test 3: Edit the task to change dates
    console.log('\n3. Editing task to change dates...');
    const editResult = await editItem({
      name: testTaskName,
      itemType: 'task',
      newDueDate: '2025-09-15T18:00:00',
      newDeferDate: '2025-09-01T08:00:00',
      newNote: 'Dates updated via edit function'
    });
    
    if (editResult.success) {
      console.log(`   ✅ Task edited successfully`);
      console.log(`   Changed properties: ${editResult.changedProperties}`);
    } else {
      console.log(`   ❌ Failed to edit task: ${editResult.error}`);
      return false;
    }
    
    console.log('\n🎉 All date handling tests passed!');
    console.log('\nIMPORTANT: Please check OmniFocus to verify:');
    console.log('1. Project due date shows as August 29, 2025 (not Dec 31, 2000)');
    console.log('2. Task dates show as September 15 and September 1, 2025');
    console.log('\nYou may want to delete the test project when done.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
console.log('Starting date handling test...\n');
testCompleteDateHandling()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });