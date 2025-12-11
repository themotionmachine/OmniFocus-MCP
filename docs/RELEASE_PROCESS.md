# Release Process

This document describes how to publish a new version of the omnifocus-mcp-pro package to npm.

## Overview

Releases are triggered by creating and publishing a GitHub Release. The workflow automatically:

1. Validates the release tag matches `package.json` version
2. Builds the TypeScript code
3. Verifies build artifacts (including JXA scripts)
4. Publishes to npm with provenance
5. Comments on the release with the npm package link

## Prerequisites

Before creating a release, ensure:

- [ ] All changes are merged to `main` branch
- [ ] CI checks are passing on `main`
- [ ] You have decided on the next version number (following [Semantic Versioning](https://semver.org/))

## Version Numbering (Semantic Versioning)

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., removed tools, changed tool signatures)
- **MINOR**: New features (e.g., new tools, new tool parameters)
- **PATCH**: Bug fixes (e.g., JXA script fixes, error handling improvements)

**Examples:**

- `1.0.0` → `1.0.1`: Fixed bug in query_omnifocus
- `1.0.1` → `1.1.0`: Added new batch_update_items tool
- `1.1.0` → `2.0.0`: Removed deprecated tool, changed tool parameter names

## Release Steps

### 1. Update package.json Version

On the `main` branch:

```bash
# Example: updating to version 1.2.4
npm version 1.2.4 --no-git-tag-version
```

This updates `package.json` and `package-lock.json`.

### 2. Update CHANGELOG.md (Optional but Recommended)

Add a new section for the release:

```markdown
## [1.2.4] - 2024-12-08

### Added
- New feature X

### Fixed
- Bug in tool Y

### Changed
- Improved performance of tool Z
```

### 3. Commit Version Bump

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.2.4"
git push origin main
```

### 4. Create GitHub Release

1. Go to <https://github.com/fgabelmannjr/omnifocus-mcp-pro/releases>
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** and type the version prefixed with `v` (e.g., `v1.2.4`)
4. Select **"Create new tag: v1.2.4 on publish"**
5. **Release title**: Use the version number (e.g., `v1.2.4`)
6. **Description**: Describe the changes (can copy from CHANGELOG.md)

   Example:

   ````markdown
   ## What's New

   - ✨ Added support for batch operations
   - 🐛 Fixed query_omnifocus filter logic
   - ⚡ Improved JXA script performance

   ## Installation

   ```bash
   npm install -g omnifocus-mcp-pro
   ```

   ## Full Changelog

   See [CHANGELOG.md](https://github.com/fgabelmannjr/omnifocus-mcp-pro/blob/main/CHANGELOG.md)
   ````

7. Click **"Publish release"**

### 5. Automatic Publishing

Once the release is published:

- GitHub Actions workflow automatically triggers
- Validates version match
- Builds the project
- Publishes to npm
- Adds a comment to the release with the npm link

You can monitor the workflow at:
<https://github.com/fgabelmannjr/omnifocus-mcp-pro/actions>

### 6. Verify Publication

After workflow completes (2-3 minutes):

1. Check the release page for the automated comment with npm link
2. Verify on npm: <https://www.npmjs.com/package/omnifocus-mcp-pro>
3. Test installation: `npx omnifocus-mcp-pro@1.2.4` (replace with your version)

## Troubleshooting

### Version Mismatch Error

If the workflow fails with "Version mismatch":

- Ensure `package.json` version matches the release tag (without `v` prefix)
- Example: Release tag `v1.2.4` must match `package.json` version `1.2.4`

### Build Failures

If the build step fails:

- Run `npm run build` locally to verify
- Check that all JXA scripts are valid JavaScript
- Ensure TypeScript compiles without errors

### NPM Publish Failures

If npm publish fails:

- Verify `NPM_TOKEN` secret is configured in GitHub repository settings
- Check npm account permissions
- Ensure version doesn't already exist on npm

### Release Comments Not Posted

If the automated comment doesn't appear:

- Check workflow logs for errors
- Verify repository has `contents: write` permission
- The comment will appear even if this step fails (publish still succeeds)

## Rollback Process

If you need to unpublish a bad release:

```bash
# Unpublish specific version (within 72 hours of publish)
npm unpublish omnifocus-mcp-pro@1.2.4

# Or deprecate it (preferred, doesn't break existing users)
npm deprecate omnifocus-mcp-pro@1.2.4 "This version has critical bugs, please upgrade to 1.2.5"
```

Then publish a new fixed version following the normal process.

## GitHub Secrets Required

The publish workflow requires the following repository secret:

- `NPM_TOKEN`: npm access token with publish permissions
  - Create at: <https://www.npmjs.com/settings/[your-username]/tokens>
  - Type: **Automation** token (recommended) or **Publish** token
  - Add to: Repository Settings → Secrets and variables → Actions → New repository secret

## Notes

- Draft releases do NOT trigger the workflow (only published releases)
- Pre-releases (marked as pre-release in GitHub) trigger the workflow
- Editing a release does NOT re-trigger the workflow
- Deleting a release does NOT unpublish from npm (manual action required)
