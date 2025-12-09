#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  prompt: string;
}

interface PromptTriggers {
  keywords?: string[];
  intentPatterns?: string[];
}

interface SkillRule {
  type: 'guardrail' | 'domain';
  enforcement: 'block' | 'suggest' | 'warn';
  priority: 'critical' | 'high' | 'medium' | 'low';
  promptTriggers?: PromptTriggers;
}

interface SkillRules {
  version: string;
  skills: Record<string, SkillRule>;
}

interface MatchedSkill {
  name: string;
  matchType: 'keyword' | 'intent';
  config: SkillRule;
}

/**
 * Finds the project root by searching upward for a .claude directory
 * @param startPath The directory to start searching from
 * @returns The project root directory containing .claude, or null if not found
 */
function findProjectRoot(startPath: string): string | null {
  let currentPath = resolve(startPath);
  const root = parse(currentPath).root;

  while (currentPath !== root) {
    const claudeDir = join(currentPath, '.claude');
    if (existsSync(claudeDir)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  // Check root directory as well
  const claudeDir = join(root, '.claude');
  if (existsSync(claudeDir)) {
    return root;
  }

  return null;
}

async function main() {
  try {
    // Read input from stdin
    const input = readFileSync(0, 'utf-8');
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt.toLowerCase();

    // Load skill rules
    // CLAUDE_PROJECT_DIR is set by Claude Code; fallback searches upward for .claude directory
    let projectDir = process.env.CLAUDE_PROJECT_DIR;

    if (!projectDir) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const foundProjectDir = findProjectRoot(__dirname);

      if (!foundProjectDir) {
        throw new Error(
          'Could not find project root. No .claude directory found in any parent directory.'
        );
      }

      projectDir = foundProjectDir;
    }

    const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
    const rules: SkillRules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

    const matchedSkills: MatchedSkill[] = [];

    // Check each skill for matches
    for (const [skillName, config] of Object.entries(rules.skills)) {
      const triggers = config.promptTriggers;
      if (!triggers) {
        continue;
      }

      // Keyword matching
      if (triggers.keywords) {
        const keywordMatch = triggers.keywords.some((kw) => prompt.includes(kw.toLowerCase()));
        if (keywordMatch) {
          matchedSkills.push({ name: skillName, matchType: 'keyword', config });
          continue;
        }
      }

      // Intent pattern matching
      if (triggers.intentPatterns) {
        const intentMatch = triggers.intentPatterns.some((pattern) => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(prompt);
        });
        if (intentMatch) {
          matchedSkills.push({ name: skillName, matchType: 'intent', config });
        }
      }
    }

    // Generate output if matches found
    if (matchedSkills.length > 0) {
      let output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      output += '🎯 SKILL ACTIVATION CHECK\n';
      output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      // Group by priority
      const critical = matchedSkills.filter((s) => s.config.priority === 'critical');
      const high = matchedSkills.filter((s) => s.config.priority === 'high');
      const medium = matchedSkills.filter((s) => s.config.priority === 'medium');
      const low = matchedSkills.filter((s) => s.config.priority === 'low');

      if (critical.length > 0) {
        output += '⚠️ CRITICAL SKILLS (REQUIRED):\n';
        for (const s of critical) output += `  → ${s.name}\n`;
        output += '\n';
      }

      if (high.length > 0) {
        output += '📚 RECOMMENDED SKILLS:\n';
        for (const s of high) output += `  → ${s.name}\n`;
        output += '\n';
      }

      if (medium.length > 0) {
        output += '💡 SUGGESTED SKILLS:\n';
        for (const s of medium) output += `  → ${s.name}\n`;
        output += '\n';
      }

      if (low.length > 0) {
        output += '📌 OPTIONAL SKILLS:\n';
        for (const s of low) output += `  → ${s.name}\n`;
        output += '\n';
      }

      output += 'ACTION: Use Skill tool BEFORE responding\n';
      output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      console.log(output);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error in skill-activation-prompt hook:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
