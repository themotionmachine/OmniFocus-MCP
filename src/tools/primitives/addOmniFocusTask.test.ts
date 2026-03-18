import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './addOmniFocusTask.js';

describe('addOmniFocusTask generateAppleScript', () => {
  it('creates inbox task when no project specified', () => {
    const script = generateAppleScript({ name: 'Buy milk' });
    expect(script).toContain('make new inbox task with properties {name:"Buy milk"}');
  });

  it('creates task in project when projectName specified', () => {
    const script = generateAppleScript({
      name: 'Write tests',
      projectName: 'Development',
    });
    expect(script).toContain('first flattened project where name = "Development"');
    expect(script).toContain('make new task with properties {name:"Write tests"}');
    expect(script).toContain('at end of tasks of theProject');
  });
});
