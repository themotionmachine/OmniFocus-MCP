# Essential Commands

## Build and Development

### Build the project
```bash
npm run build
```
Compiles TypeScript to `dist/`, copies JXA scripts, and makes server executable.

### Watch mode for development
```bash
npm run dev
```
Auto-recompiles TypeScript on file changes (does not copy JXA scripts).

### Start the server
```bash
npm run start
```
Runs the built server from `dist/server.js`. Must build first.

### Test the server locally
```bash
node dist/server.js
```
Direct execution for debugging.

## Installation Commands

### Install dependencies
```bash
npm install
```

### Install globally for testing
```bash
npm link
```

### Publish to npm
```bash
npm publish
```

## Git Commands (macOS)
Standard git commands work as expected:
- `git status` - Check repository status
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes
- `git push` - Push to remote
- `git pull` - Pull from remote

## File Operations (macOS Darwin)
- `ls -la` - List files with details
- `find . -name "*.ts"` - Find TypeScript files
- `grep -r "pattern" src/` - Search in source files
- `cat file.txt` - Display file contents
- `open .` - Open current directory in Finder
