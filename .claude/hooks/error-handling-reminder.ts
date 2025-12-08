#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    hook_event_name: string;
}

interface EditedFile {
    path: string;
    tool: string;
    timestamp: string;
}

function getFileCategory(filePath: string): 'frontend' | 'infrastructure' | 'other' {
    // Frontend detection (Astro/React)
    if (filePath.includes('/website/') ||
        filePath.includes('/src/components/') ||
        filePath.includes('/src/pages/') ||
        filePath.includes('/src/layouts/') ||
        filePath.includes('/figma-make-prototype/')) return 'frontend';

    // Infrastructure detection (CDK)
    if (filePath.includes('/infrastructure/') ||
        filePath.includes('/cdk/')) return 'infrastructure';

    return 'other';
}

function shouldCheckErrorHandling(filePath: string): boolean {
    // Skip test files, config files, and type definitions
    if (filePath.match(/\.(test|spec)\.(ts|tsx)$/)) return false;
    if (filePath.match(/\.(config|d)\.(ts|tsx|js|mjs)$/)) return false;
    if (filePath.includes('types/')) return false;
    if (filePath.includes('.styles.ts')) return false;
    if (filePath.match(/\.astro$/)) return false; // Astro files are static

    // Check for code files
    return filePath.match(/\.(ts|tsx|js|jsx)$/) !== null;
}

function analyzeFileContent(filePath: string): {
    hasTryCatch: boolean;
    hasAsync: boolean;
    hasApiCall: boolean;
    hasEventHandler: boolean;
} {
    if (!existsSync(filePath)) {
        return { hasTryCatch: false, hasAsync: false, hasApiCall: false, hasEventHandler: false };
    }

    const content = readFileSync(filePath, 'utf-8');

    return {
        hasTryCatch: /try\s*\{/.test(content),
        hasAsync: /async\s+/.test(content),
        hasApiCall: /fetch\(|axios\.|apiClient\./i.test(content),
        hasEventHandler: /onClick|onSubmit|onChange|addEventListener/i.test(content),
    };
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        const { session_id } = data;
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

        // Check for edited files tracking (using same path as post-tool-use-tracker.sh)
        const cacheDir = join(projectDir, '.claude', 'tsc-cache', session_id || 'default');
        const trackingFile = join(cacheDir, 'edited-files.log');

        if (!existsSync(trackingFile)) {
            // No files edited this session, no reminder needed
            process.exit(0);
        }

        // Read tracking data (format: timestamp:file_path:repo)
        const trackingContent = readFileSync(trackingFile, 'utf-8');
        const editedFiles = trackingContent
            .trim()
            .split('\n')
            .filter(line => line.length > 0)
            .map(line => {
                const parts = line.split(':');
                // Format is timestamp:file_path:repo
                return {
                    timestamp: parts[0],
                    path: parts.slice(1, -1).join(':'), // Handle paths with colons
                    repo: parts[parts.length - 1]
                };
            });

        if (editedFiles.length === 0) {
            process.exit(0);
        }

        // Categorize files
        const categories = {
            frontend: [] as string[],
            infrastructure: [] as string[],
            other: [] as string[],
        };

        const analysisResults: Array<{
            path: string;
            category: string;
            analysis: ReturnType<typeof analyzeFileContent>;
        }> = [];

        for (const file of editedFiles) {
            if (!shouldCheckErrorHandling(file.path)) continue;

            const category = getFileCategory(file.path);
            categories[category].push(file.path);

            const analysis = analyzeFileContent(file.path);
            analysisResults.push({ path: file.path, category, analysis });
        }

        // Check if any code that needs error handling was written
        const needsAttention = analysisResults.some(
            ({ analysis }) =>
                analysis.hasTryCatch ||
                analysis.hasAsync ||
                analysis.hasApiCall ||
                analysis.hasEventHandler
        );

        if (!needsAttention) {
            // No risky code patterns detected, skip reminder
            process.exit(0);
        }

        // Display reminder
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 ERROR HANDLING SELF-CHECK');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Frontend reminders (React Islands)
        if (categories.frontend.length > 0) {
            const frontendFiles = analysisResults.filter(f => f.category === 'frontend');
            const hasApiCall = frontendFiles.some(f => f.analysis.hasApiCall);
            const hasTryCatch = frontendFiles.some(f => f.analysis.hasTryCatch);
            const hasEventHandler = frontendFiles.some(f => f.analysis.hasEventHandler);

            console.log('💡 Frontend Changes Detected');
            console.log(`   ${categories.frontend.length} file(s) edited\n`);

            if (hasApiCall) {
                console.log('   ❓ Do API calls show user-friendly error messages?');
            }
            if (hasTryCatch) {
                console.log('   ❓ Are errors logged appropriately?');
            }
            if (hasEventHandler) {
                console.log('   ❓ Do event handlers have error handling?');
            }

            console.log('\n   💡 React Islands Best Practice:');
            console.log('      - Consider error boundaries for component errors');
            console.log('      - Display user-friendly error states');
            console.log('      - Use try/catch for async operations\n');
        }

        // Infrastructure reminders (CDK)
        if (categories.infrastructure.length > 0) {
            console.log('🏗️  Infrastructure Changes Detected');
            console.log(`   ${categories.infrastructure.length} file(s) edited\n`);
            console.log('   ❓ Did you run cdk synth to verify the stack?');
            console.log('   ❓ Are CloudWatch alarms configured for critical resources?\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 TIP: Disable with SKIP_ERROR_REMINDER=1');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (err) {
        // Silently fail - this is just a reminder, not critical
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
