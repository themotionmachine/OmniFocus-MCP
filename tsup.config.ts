import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'node24',
  onSuccess: async () => {
    const { cpSync, existsSync, mkdirSync } = await import('node:fs');
    const srcDir = 'src/utils/omnifocusScripts';
    const destDir = 'dist/utils/omnifocusScripts';

    if (!existsSync(srcDir)) {
      throw new Error(`JXA scripts directory not found: ${srcDir}`);
    }

    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });
    console.log('JXA scripts copied successfully');
  }
});
